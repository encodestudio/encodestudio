import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { config, loadConfig } from "./config.js";
import { NOW, bindDb, now, prepare, query } from "./db.js";
import contactRoutes from "./routes/contact.js";
import authRoutes from "./routes/auth.js";
import leadRoutes from "./routes/leads.js";
import taskRoutes from "./routes/tasks.js";
import userRoutes from "./routes/users.js";
import analyticsRoutes from "./routes/analytics.js";
import invoiceRoutes from "./routes/invoices.js";
import publicRoutes from "./routes/public.js";

// One Cloudflare Worker serves the whole site. Static assets (the built React
// app) are answered by Cloudflare before this code runs; only /api/* and
// /health/ reach the Worker (see `run_worker_first` in wrangler.jsonc).
const app = new Hono({ strict: false });

app.use(async (c, next) => {
  loadConfig(c.env);
  bindDb(c.env.DB);
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  if (config.isProduction) c.header("Strict-Transport-Security", "max-age=2592000; includeSubDomains");
});

app.get("/health", (c) => c.json({ status: "ok" }));

// ---- API ---------------------------------------------------------------
const api = new Hono({ strict: false });
// Only needed when the frontend is served from a different origin than the
// API (e.g. Vite dev server without its proxy, or a split deployment).
api.use((c, next) => cors({ origin: config.corsAllowedOrigins })(c, next));
api.use(
  bodyLimit({ maxSize: 100 * 1024, onError: (c) => c.json({ detail: "Request body is too large." }, 413) }),
);

// Parses JSON bodies once into c.get("body"); empty or non-JSON bodies become {}.
api.use(async (c, next) => {
  let body = {};
  if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method) && /json/i.test(c.req.header("Content-Type") || "")) {
    const text = await c.req.text();
    if (text.trim()) {
      try {
        body = JSON.parse(text);
      } catch {
        return c.json({ detail: "Invalid request body." }, 400);
      }
    }
  }
  c.set("body", body ?? {});
  await next();
});

// Anonymous endpoints are rate-limited per IP to deter spam and password
// guessing: a fixed one-hour window, counted in D1 so it holds across isolates.
async function anonLimiter(c, next) {
  const ip = c.req.header("CF-Connecting-IP") || "unknown";
  const hour = Math.floor(Date.now() / 3_600_000);
  const row = await prepare(
    `INSERT INTO rate_limit (key, hits, expires_at) VALUES (?, 1, ${now("+1 hour")})
     ON CONFLICT (key) DO UPDATE SET hits = hits + 1 RETURNING hits`,
    [`anon:${ip}:${hour}`],
  ).first();
  if (row.hits === 1) {
    c.executionCtx.waitUntil(query(`DELETE FROM rate_limit WHERE expires_at < ${NOW}`));
  }
  const limit = config.contactRateLimitPerHour;
  c.header("RateLimit-Policy", `${limit};w=3600`);
  if (row.hits > limit) {
    c.header("Retry-After", String(3600 - (Math.floor(Date.now() / 1000) % 3600)));
    return c.json({ detail: "Request was throttled. Please try again later." }, 429);
  }
  await next();
}

api.use("/contact/*", anonLimiter);
api.use("/auth/login/*", anonLimiter);
api.route("/contact", contactRoutes);
api.route("/auth", authRoutes);
api.route("/leads", leadRoutes);
api.route("/tasks", taskRoutes);
api.route("/users", userRoutes);
api.route("/analytics", analyticsRoutes);
api.route("/invoices", invoiceRoutes);
api.route("/public", publicRoutes);
app.route("/api", api);

// Unknown API paths get a JSON 404; anything else that reaches the Worker falls
// through to the static assets (which serve index.html for client-side routes).
app.notFound((c) => {
  if (c.req.path === "/api" || c.req.path.startsWith("/api/")) return c.json({ detail: "Not found." }, 404);
  return c.env.ASSETS ? c.env.ASSETS.fetch(c.req.raw) : c.text("Not found", 404);
});

// ---- Errors ------------------------------------------------------------
app.onError((err, c) => {
  console.error(`${c.req.method} ${c.req.path} failed`, err);
  return c.json({ detail: "Something went wrong on our side. Please try again." }, 500);
});

export default app;
