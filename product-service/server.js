const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const Redis = require("ioredis");
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
        service: "boostr-product-service",
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

// Redis connection
const redisClient = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
redisClient.on("error", (err) => logger.error({ err }, "Redis Client Error"));
redisClient.on("connect", () => logger.info("✅ Connected to Redis"));

// ── Health Check ────────────────────────────────────────────────────────────
app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS server_time");
    logger.info({ db_status: "connected", redis_status: redisClient.status }, "[Health] Health check passed");
    res.json({
      status: "ok",
      db: "connected",
      redis: redisClient.status,
      server_time: result.rows[0].server_time,
    });
  } catch (err) {
    logger.error({ err }, "[Health] Health check failed");
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ── Products ─────────────────────────────────────────────────────────────────
app.get("/api/products", async (req, res) => {
  try {
    const cachedProducts = await redisClient.get("products");
    if (cachedProducts) {
      logger.info("[Cache Hit] Returning products from Redis");
      return res.json(JSON.parse(cachedProducts));
    }

    logger.info("[Cache Miss] Fetching products from Postgres");
    const { rows } = await pool.query("SELECT * FROM products ORDER BY id ASC");
    
    // Store in Redis with an expiration of 60 seconds
    await redisClient.setex("products", 60, JSON.stringify(rows));
    logger.info({ product_count: rows.length }, "[Products] Cached product catalog in Redis");

    res.json(rows);
  } catch (err) {
    logger.error({ err }, "[Products] Error retrieving products");
    res.status(500).json({ error: err.message });
  }
});

// ── Random Product (For Order Service) ───────────────────────────────────────
app.get("/api/products/random", async (req, res) => {
  try {
    let products;
    const cachedProducts = await redisClient.get("products");
    
    if (cachedProducts) {
      logger.info("[Cache Hit] Picking random product from Redis cache");
      products = JSON.parse(cachedProducts);
    } else {
      logger.info("[Cache Miss] Fetching products from Postgres for random pick");
      const { rows } = await pool.query("SELECT * FROM products ORDER BY id ASC");
      products = rows;
      await redisClient.setex("products", 60, JSON.stringify(rows));
    }

    if (products.length === 0) {
      logger.warn("[Products] No products found in database");
      return res.status(404).json({ error: "No products found" });
    }
    const randomProduct = products[Math.floor(Math.random() * products.length)];
    logger.info({ product_id: randomProduct.id, name: randomProduct.name }, "[Products] Selected random product");
    res.json(randomProduct);
  } catch (err) {
    logger.error({ err }, "[Products] Error picking random product");
    res.status(500).json({ error: err.message });
  }
});

// ── Continuous Background Heartbeat (every 10s for continuous ELK & APM data) ─
setInterval(async () => {
  try {
    const memUsage = process.memoryUsage();
    const memMb = Math.round(memUsage.heapUsed / 1024 / 1024);
    const redisPong = await redisClient.ping();
    const dbRes = await pool.query("SELECT COUNT(*) FROM products");
    logger.info(
      {
        service: "boostr-product-service",
        event: "heartbeat",
        status: "healthy",
        uptime_sec: Math.floor(process.uptime()),
        memory_mb: memMb,
        redis_status: redisPong,
        total_products: parseInt(dbRes.rows[0].count),
      },
      `[Heartbeat] product-service healthy (uptime: ${Math.floor(process.uptime())}s, mem: ${memMb}MB, redis: ${redisPong})`
    );
  } catch (hbErr) {
    logger.error({ err: hbErr }, "[Heartbeat] Product service heartbeat check error");
  }
}, 10000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`✅ Product Service running on port ${PORT}`);
});
