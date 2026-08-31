const express = require("express");
const cors = require("cors");
const pino = require("pino");

const logger = pino();

const app = express();
app.use(cors());
app.use(express.json());

// ── Health Check ────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// ── Send Notification (Mock) ────────────────────────────────────────────────
app.post("/api/notifications", async (req, res) => {
  try {
    const { orderId, employeeId, totalAmount } = req.body;
    
    // Simulate sending an email with a delay
    await new Promise(resolve => setTimeout(resolve, 200));

    logger.info(`[Notification Service] 📧 Sent order confirmation email for order #${orderId}`);

    res.json({ status: "success", message: "Email sent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`✅ Notification Service running on port ${PORT}`);
});
