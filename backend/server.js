require('./tracing');

const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

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

// ── Employees ────────────────────────────────────────────────────────────────
app.get("/api/employees", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM employees ORDER BY id ASC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Products ─────────────────────────────────────────────────────────────────
app.get("/api/products", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM products ORDER BY id ASC"
    );
    res.json(rows);
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

// ── Department breakdown ─────────────────────────────────────────────────────
app.get("/api/departments", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT department, COUNT(*) AS count
      FROM employees
      GROUP BY department
      ORDER BY count DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
