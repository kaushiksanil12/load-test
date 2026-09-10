const express = require("express");
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
        service: "boostr-notification-service",
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

// ── Health Check ────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  logger.info("[Health] Health check passed");
  res.json({ status: "ok" });
});

// ── Send Notification (Mock) ────────────────────────────────────────────────
app.post("/api/notifications", async (req, res) => {
  try {
    const { orderId, employeeId, totalAmount } = req.body;
    logger.info(
      { order_id: orderId, employee_id: employeeId, total_amount: totalAmount },
      `[Notification Service] 📨 Processing order notification for #${orderId}`
    );
    
    // Simulate sending an email with a delay
    await new Promise(resolve => setTimeout(resolve, 200));

    logger.info(
      { order_id: orderId, employee_id: employeeId, status: "sent" },
      `[Notification Service] 📧 Sent order confirmation email for order #${orderId}`
    );

    res.json({ status: "success", message: "Email sent" });
  } catch (err) {
    logger.error({ err }, "[Notification Service] Failed to send notification email");
    res.status(500).json({ error: err.message });
  }
});

// ── Continuous Background Heartbeat (every 10s for continuous ELK & APM data) ─
setInterval(() => {
  try {
    const memUsage = process.memoryUsage();
    const memMb = Math.round(memUsage.heapUsed / 1024 / 1024);
    logger.info(
      {
        service: "boostr-notification-service",
        event: "heartbeat",
        status: "healthy",
        uptime_sec: Math.floor(process.uptime()),
        memory_mb: memMb,
      },
      `[Heartbeat] notification-service healthy (uptime: ${Math.floor(process.uptime())}s, mem: ${memMb}MB)`
    );
  } catch (hbErr) {
    logger.error({ err: hbErr }, "[Heartbeat] Notification service heartbeat error");
  }
}, 10000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`✅ Notification Service running on port ${PORT}`);
});
