const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const axios = require("axios");
const pino = require("pino");

let apm;
try {
  apm = require("elastic-apm-node");
} catch (e) {
  // elastic-apm-node optional
}

const logger = pino({
  mixin() {
    const traceData = {};
    if (apm && typeof apm.isStarted === "function" && apm.isStarted()) {
      const ids = apm.currentTraceIds;
      if (ids) {
        if (ids["trace.id"]) {
          traceData["trace.id"] = ids["trace.id"];
          traceData["trace_id"] = ids["trace.id"];
        }
        if (ids["transaction.id"]) {
          traceData["transaction.id"] = ids["transaction.id"];
        }
        if (ids["span.id"]) {
          traceData["span.id"] = ids["span.id"];
        }
      }
    }
    return traceData;
  }
});

const app = express();
app.use(cors());
app.use(express.json());

// ── HTTP Request Logging Middleware ──────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(
      {
        service: "boostr-order-service",
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration_ms: duration,
      },
      `[HTTP] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`
    );
  });
  next();
});

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "appdb",
  user: process.env.DB_USER || "appuser",
  password: process.env.DB_PASSWORD || "apppassword",
});
pool.on("error", (err) => {
  logger.error({ err }, "[Postgres] Unexpected idle client error in order-service pool");
});

// ── Health Check ────────────────────────────────────────────────────────────
app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS server_time");
    logger.info({ db_status: "connected" }, "[Health] DB health check passed");
    res.json({
      status: "ok",
      db: "connected",
      server_time: result.rows[0].server_time,
    });
  } catch (err) {
    logger.error({ err }, "[Health] Health check failed");
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ── Stats Overview ───────────────────────────────────────────────────────────
app.get("/api/stats", async (req, res) => {
  try {
    const [empCount, prodCount, orderCount, revenue] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM employees WHERE status = 'active'"),
      pool.query("SELECT COUNT(*) FROM products"),
      pool.query("SELECT COUNT(*) FROM orders"),
      pool.query("SELECT COALESCE(SUM(total_amount), 0) AS total FROM orders"),
    ]);
    logger.info(
      {
        total_orders: parseInt(orderCount.rows[0].count),
        total_revenue: parseFloat(revenue.rows[0].total)
      },
      "[Stats] Calculated order stats overview"
    );
    res.json({
      active_employees: parseInt(empCount.rows[0].count),
      total_products: parseInt(prodCount.rows[0].count),
      total_orders: parseInt(orderCount.rows[0].count),
      total_revenue: parseFloat(revenue.rows[0].total),
    });
  } catch (err) {
    logger.error({ err }, "[Stats] Error calculating stats");
    res.status(500).json({ error: err.message });
  }
});

// ── Orders ───────────────────────────────────────────────────────────────────
app.get("/api/orders", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        o.id,
        e.name AS employee_name,
        p.name AS product_name,
        p.category,
        o.quantity,
        o.total_amount,
        o.ordered_at
      FROM orders o
      JOIN employees e ON e.id = o.employee_id
      JOIN products  p ON p.id = o.product_id
      ORDER BY o.ordered_at DESC
    `);
    logger.info({ order_count: rows.length }, "[Orders] Fetched recent orders list");
    res.json(rows);
  } catch (err) {
    logger.error({ err }, "[Orders] Error fetching orders");
    res.status(500).json({ error: err.message });
  }
});

// ── Heavy CPU Load (For tracing/testing) ─────────────────────────────────────
app.get("/api/heavy", (req, res) => {
  const start = Date.now();
  let count = 0;
  // Simulate heavy computation (busy wait)
  for (let i = 0; i < 500000000; i++) {
    count++;
  }
  const duration = Date.now() - start;
  logger.info({ duration_ms: duration, iterations: count }, "[Heavy] Executed CPU load simulation");
  res.json({ status: "success", count, time_ms: duration });
});

// ── Create Random Order (For simulating writes) ──────────────────────────────
app.post("/api/orders", async (req, res) => {
  try {
    logger.info("[Orders] Initiating simulated order creation...");

    // 1. Fetch random employee from employee-service (via API Gateway)
    const empRes = await axios.get("http://nginx/api/employees");
    const employees = empRes.data;
    const activeEmployees = employees.filter(e => e.status === 'active');
    if (activeEmployees.length === 0) {
      logger.warn("[Orders] No active employees found");
      return res.status(400).json({ error: "No active employees found" });
    }
    const randomEmp = activeEmployees[Math.floor(Math.random() * activeEmployees.length)];
    const employeeId = randomEmp.id;

    // 2. Fetch random product from product-service (via API Gateway)
    const prodResHTTP = await axios.get("http://nginx/api/products/random");
    const product = prodResHTTP.data;
    const productId = product.id;
    const price = parseFloat(product.price);

    const quantity = Math.floor(Math.random() * 5) + 1;
    const totalAmount = (price * quantity).toFixed(2);

    // 3. Save order to database
    const insertRes = await pool.query(
      "INSERT INTO orders (employee_id, product_id, quantity, total_amount) VALUES ($1, $2, $3, $4) RETURNING *",
      [employeeId, productId, quantity, totalAmount]
    );
    const order = insertRes.rows[0];
    logger.info(
      { order_id: order.id, employee_id: employeeId, product_id: productId, total_amount: totalAmount },
      "[Orders] Order saved to database"
    );

    // 4. Send notification via notification-service (via API Gateway)
    try {
      await axios.post("http://nginx/api/notifications", {
        orderId: order.id,
        employeeId: employeeId,
        totalAmount: totalAmount
      });
      logger.info({ order_id: order.id }, "[Orders] Dispatched notification for order");
    } catch (notifErr) {
      logger.warn({ err: notifErr }, "Failed to send notification, but order succeeded");
    }

    res.json({ status: "success", order });
  } catch (err) {
    logger.error({ err }, "[Orders] Order placement failed");
    res.status(500).json({ error: err.message });
  }
});

// ── Continuous Background Heartbeat (every 10s for continuous ELK & APM data) ─
setInterval(async () => {
  try {
    const memUsage = process.memoryUsage();
    const memMb = Math.round(memUsage.heapUsed / 1024 / 1024);
    const countRes = await pool.query("SELECT COUNT(*) FROM orders");
    logger.info(
      {
        service: "boostr-order-service",
        event: "heartbeat",
        status: "healthy",
        uptime_sec: Math.floor(process.uptime()),
        memory_mb: memMb,
        total_orders_in_db: parseInt(countRes.rows[0].count),
      },
      `[Heartbeat] order-service healthy (uptime: ${Math.floor(process.uptime())}s, mem: ${memMb}MB, orders: ${countRes.rows[0].count})`
    );
  } catch (hbErr) {
    logger.error({ err: hbErr }, "[Heartbeat] Order service DB query error");
  }
}, 10000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`✅ Order Service running on port ${PORT}`);
});
