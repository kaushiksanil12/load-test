const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
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
  },
  formatters: {
    log(obj) {
      // AWS X-Ray format (commented out for ELK / Elastic APM):
      // if (obj.trace_id && !obj.trace_id.startsWith("1-")) {
      //   obj.trace_id = `1-${obj.trace_id.substring(0, 8)}-${obj.trace_id.substring(8)}`;
      // }
      return obj;
    }
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
        service: "boostr-employee-service",
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
  logger.error({ err }, "[Postgres] Unexpected idle client error in employee-service pool");
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
        active_employees: parseInt(empCount.rows[0].count),
        total_orders: parseInt(orderCount.rows[0].count)
      },
      "[Stats] Calculated overview statistics"
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

// ── Departments ──────────────────────────────────────────────────────────────
app.get("/api/departments", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT department, COUNT(*) as count FROM employees WHERE status = 'active' GROUP BY department ORDER BY count DESC"
    );
    logger.info({ department_count: rows.length }, "[Departments] Fetched active department counts");
    res.json(rows);
  } catch (err) {
    logger.error({ err }, "[Departments] Error fetching departments");
    res.status(500).json({ error: err.message });
  }
});

// ── Employees ────────────────────────────────────────────────────────────────
app.get("/api/employees", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM employees ORDER BY id ASC"
    );
    logger.info({ employee_count: rows.length }, "[Employees] Fetched employees list");
    res.json(rows);
  } catch (err) {
    logger.error({ err }, "[Employees] Error fetching employees");
    res.status(500).json({ error: err.message });
  }
});

// ── Create Employee ──────────────────────────────────────────────────────────
app.post("/api/employees", async (req, res) => {
  try {
    const { name, department, role, salary } = req.body;
    if (!name || !department || !role || !salary) {
      logger.warn({ body: req.body }, "[Employees] Missing required fields for new employee");
      return res.status(400).json({ error: "Missing required fields" });
    }
    const { rows } = await pool.query(
      "INSERT INTO employees (name, department, role, salary, joined_at) VALUES ($1, $2, $3, $4, CURRENT_DATE) RETURNING *",
      [name, department, role, parseFloat(salary)]
    );
    logger.info({ employee_id: rows[0].id, name: rows[0].name }, "[Employees] Created new employee");
    res.json({ status: "success", employee: rows[0] });
  } catch (err) {
    logger.error({ err }, "[Employees] Error creating employee");
    res.status(500).json({ error: err.message });
  }
});

// ── Delete Employee ──────────────────────────────────────────────────────────
app.delete("/api/employees/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query("DELETE FROM employees WHERE id = $1", [id]);
    if (rowCount === 0) {
      logger.warn({ employee_id: id }, "[Employees] Employee not found for deletion");
      return res.status(404).json({ error: "Employee not found" });
    }
    logger.info({ employee_id: id }, "[Employees] Employee deleted successfully");
    res.json({ status: "success" });
  } catch (err) {
    logger.error({ err, employee_id: req.params.id }, "[Employees] Error deleting employee");
    res.status(500).json({ error: err.message });
  }
});

// ── Continuous Background Heartbeat (every 10s for continuous ELK & APM data) ─
setInterval(async () => {
  try {
    const memUsage = process.memoryUsage();
    const memMb = Math.round(memUsage.heapUsed / 1024 / 1024);
    await pool.query("SELECT 1 AS heartbeat");
    logger.info(
      {
        service: "boostr-employee-service",
        event: "heartbeat",
        status: "healthy",
        uptime_sec: Math.floor(process.uptime()),
        memory_mb: memMb,
        pool_total: pool.totalCount,
        pool_idle: pool.idleCount,
        pool_waiting: pool.waitingCount,
      },
      `[Heartbeat] employee-service healthy (uptime: ${Math.floor(process.uptime())}s, mem: ${memMb}MB)`
    );
  } catch (hbErr) {
    logger.error({ err: hbErr }, "[Heartbeat] DB ping failed in heartbeat");
  }
}, 10000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`✅ Employee Service running on port ${PORT}`);
});
