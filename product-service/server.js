const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const Redis = require("ioredis");

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

// Redis connection
const redisClient = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
redisClient.on("error", (err) => console.log("Redis Client Error", err));
redisClient.on("connect", () => console.log("✅ Connected to Redis"));

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
    const cachedProducts = await redisClient.get("products");
    if (cachedProducts) {
      console.log("[Cache Hit] Returning products from Redis");
      return res.json(JSON.parse(cachedProducts));
    }

    console.log("[Cache Miss] Fetching products from Postgres");
    const { rows } = await pool.query("SELECT * FROM products ORDER BY id ASC");
    
    // Store in Redis with an expiration of 60 seconds
    await redisClient.setex("products", 60, JSON.stringify(rows));

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Random Product (For Order Service) ───────────────────────────────────────
app.get("/api/products/random", async (req, res) => {
  try {
    let products;
    const cachedProducts = await redisClient.get("products");
    
    if (cachedProducts) {
      console.log("[Cache Hit] Picking random product from Redis cache");
      products = JSON.parse(cachedProducts);
    } else {
      console.log("[Cache Miss] Fetching products from Postgres for random pick");
      const { rows } = await pool.query("SELECT * FROM products ORDER BY id ASC");
      products = rows;
      await redisClient.setex("products", 60, JSON.stringify(rows));
    }

    if (products.length === 0) return res.status(404).json({ error: "No products found" });
    const randomProduct = products[Math.floor(Math.random() * products.length)];
    res.json(randomProduct);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Product Service running on port ${PORT}`);
});
