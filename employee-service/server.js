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

// ── Departments ──────────────────────────────────────────────────────────────
app.get("/api/departments", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT department, COUNT(*) as count FROM employees WHERE status = 'active' GROUP BY department ORDER BY count DESC"
    );
    res.json(rows);
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

// ── Create Employee ──────────────────────────────────────────────────────────
app.post("/api/employees", async (req, res) => {
  try {
    const { name, department, role, salary } = req.body;
    if (!name || !department || !role || !salary) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const { rows } = await pool.query(
      "INSERT INTO employees (name, department, role, salary) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, department, role, parseFloat(salary)]
    );
    res.json({ status: "success", employee: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Delete Employee ──────────────────────────────────────────────────────────
app.delete("/api/employees/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query("DELETE FROM employees WHERE id = $1", [id]);
    if (rowCount === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.json({ status: "success" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
