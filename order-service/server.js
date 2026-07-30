const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "appdb",
  user: process.env.DB_USER || "appuser",
  password: process.env.DB_PASSWORD || "apppassword",
});

// ── Health Check ────────────────────────────────────────────────────────────
app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS server_time");
    res.json({
      status: "ok",
      db: "connected",
      server_time: result.rows[0].server_time,
    });
  } catch (err) {
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
    res.json({
      active_employees: parseInt(empCount.rows[0].count),
      total_products: parseInt(prodCount.rows[0].count),
      total_orders: parseInt(orderCount.rows[0].count),
      total_revenue: parseFloat(revenue.rows[0].total),
    });
  } catch (err) {
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
    res.json(rows);
  } catch (err) {
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
  res.json({ status: "success", count, time_ms: duration });
});

// ── Create Random Order (For simulating writes) ──────────────────────────────
app.post("/api/orders", async (req, res) => {
  try {
    // 1. Fetch random employee from employee-service (via API Gateway)
    const empRes = await axios.get("http://nginx/api/employees");
    const employees = empRes.data;
    const activeEmployees = employees.filter(e => e.status === 'active');
    if (activeEmployees.length === 0) return res.status(400).json({ error: "No active employees found" });
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

    // 4. Send notification via notification-service (via API Gateway)
    try {
      await axios.post("http://nginx/api/notifications", {
        orderId: order.id,
        employeeId: employeeId,
        totalAmount: totalAmount
      });
    } catch (notifErr) {
      console.warn("Failed to send notification, but order succeeded", notifErr);
    }

    res.json({ status: "success", order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
