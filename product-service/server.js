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

// ── Random Product (For Order Service) ───────────────────────────────────────
app.get("/api/products/random", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT id, price FROM products ORDER BY RANDOM() LIMIT 1");
    if (rows.length === 0) return res.status(404).json({ error: "No products found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Product Service running on port ${PORT}`);
});
