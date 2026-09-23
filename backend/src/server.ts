import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

// Routers
import authRoutes from "./routes/auth.routes";
import transactionsRoutes from "./routes/transactions.routes";
import budgetsRoutes from "./routes/budgets.routes";
import categoriesRoutes from "./routes/categories.routes";
import goalsRoutes from "./routes/goals.routes";
import recurringRoutes from "./routes/recurring.routes";
import analyticsRoutes from "./routes/analytics.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import accountsRoutes from "./routes/accounts.routes";
import achievementsRoutes from "./routes/achievements.routes";
import notificationsRoutes from "./routes/notifications.routes";
import reportsRoutes from "./routes/reports.routes";
import insightsRoutes from "./routes/insights.routes";
import currencyRoutes from "./routes/currency.routes";
import healthRoutes from "./routes/health.routes";
import seedRoutes from "./routes/seed.routes";
import aiRoutes from "./routes/ai.routes";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests from localhost:3000, 127.0.0.1:3000 or no-origin (mobile/curl/postman)
      if (!origin || origin.includes("localhost") || origin.includes("127.0.0.1")) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive for self-hosted
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Mount API Routers
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionsRoutes);
app.use("/api/budgets", budgetsRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/goals", goalsRoutes);
app.use("/api/recurring", recurringRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/accounts", accountsRoutes);
app.use("/api/achievements", achievementsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/insights", insightsRoutes);
app.use("/api/currency", currencyRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/seed-demo", seedRoutes);

// Root healthcheck
app.get("/", (_req, res) => {
  res.json({
    name: "FinTrack REST API",
    version: "2.0.0",
    status: "running",
    port: PORT,
    endpoints: "/api/*",
  });
});

import { ensureDatabaseReady } from "./db";

// Global error handler (always return JSON, never HTML)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[FinTrack Backend Error]:", err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    ok: false,
    error: err.message || "Internal server error",
  });
});

// Start Express Server once database is verified ready
async function startServer() {
  try {
    await ensureDatabaseReady();
    app.listen(PORT, () => {
      console.log(`[FinTrack Backend] Express server running on http://localhost:${PORT}`);
      console.log(`[FinTrack Backend] Health endpoint: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error("[FinTrack Backend] Fatal startup error:", err);
    process.exit(1);
  }
}

startServer();

export default app;
