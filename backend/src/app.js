import fs from "node:fs";
import path from "node:path";
import express from "express";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import { config } from "./config.js";
import contactRoutes from "./routes/contact.js";
import authRoutes from "./routes/auth.js";
import leadRoutes from "./routes/leads.js";
import taskRoutes from "./routes/tasks.js";
import userRoutes from "./routes/users.js";
import analyticsRoutes from "./routes/analytics.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy);

  app.use((req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    });
    if (config.isProduction) res.set("Strict-Transport-Security", "max-age=2592000; includeSubDomains");
    next();
  });

  app.get("/health/", (req, res) => res.json({ status: "ok" }));

  // ---- API ---------------------------------------------------------------
  const api = express.Router();
  // Only needed when the frontend is served from a different origin than the
  // API (e.g. Vite dev server without its proxy, or a split deployment).
  api.use(cors({ origin: config.corsAllowedOrigins }));
  api.use(express.json({ limit: "100kb" }));

  // Anonymous endpoints are rate-limited per IP to deter spam and password guessing.
  const anonLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: config.contactRateLimitPerHour,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { detail: "Request was throttled. Please try again later." },
  });

  api.use("/contact", anonLimiter, contactRoutes);
  api.use("/auth/login", anonLimiter);
  api.use("/auth", authRoutes);
  api.use("/leads", leadRoutes);
  api.use("/tasks", taskRoutes);
  api.use("/users", userRoutes);
  api.use("/analytics", analyticsRoutes);
  api.use((req, res) => res.status(404).json({ detail: "Not found." }));

  app.use("/api", api);

  // ---- React app ---------------------------------------------------------
  const indexHtml = path.join(config.frontendDist, "index.html");
  if (fs.existsSync(indexHtml)) {
    app.use(
      express.static(config.frontendDist, {
        index: false,
        setHeaders(res, filePath) {
          // Vite fingerprints everything under /assets, so it can be cached forever.
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.set("Cache-Control", "public, max-age=31536000, immutable");
          }
        },
      }),
    );
    // Client-side routing: every other GET renders the SPA shell.
    app.get(/.*/, (req, res) => {
      res.set("Cache-Control", "no-cache");
      res.sendFile(indexHtml);
    });
  } else {
    console.warn(`Frontend build not found at ${config.frontendDist} — serving the API only.`);
  }

  // ---- Errors ------------------------------------------------------------
  app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed") {
      return res.status(400).json({ detail: "Invalid request body." });
    }
    console.error(`${req.method} ${req.originalUrl} failed`, err);
    if (res.headersSent) return next(err);
    res.status(500).json({ detail: "Something went wrong on our side. Please try again." });
  });

  return app;
}
