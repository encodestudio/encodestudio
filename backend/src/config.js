import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Load backend/.env when present. Hosts that inject real environment
// variables (Render, Railway, cPanel, systemd...) don't need the file, and
// variables already set in the environment always win over the file.
try {
  process.loadEnvFile(path.join(ROOT_DIR, ".env"));
} catch {
  // no .env file — rely on the process environment
}

const env = process.env;
const list = (value, fallback = "") =>
  (value ?? fallback)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const bool = (value, fallback) => (value == null || value === "" ? fallback : value.toLowerCase() === "true");

const isProduction = env.NODE_ENV === "production";

const jwtSecret = env.JWT_SECRET || env.DJANGO_SECRET_KEY;
if (!jwtSecret && isProduction) {
  throw new Error("JWT_SECRET must be set in production.");
}

export const config = {
  isProduction,
  port: Number(env.PORT || 8000),
  // How many reverse proxies sit in front of Node (load balancer, Cloudflare,
  // cPanel/Passenger...). Used to read the real client IP for rate limiting.
  trustProxy: env.TRUST_PROXY ? (/^\d+$/.test(env.TRUST_PROXY) ? Number(env.TRUST_PROXY) : env.TRUST_PROXY) : 1,

  // Directory of the built React app. Served by this same process so the site
  // and API share one origin and one (cheap) host.
  frontendDist: path.resolve(ROOT_DIR, env.FRONTEND_DIST || "../frontend/dist"),

  db: {
    host: env.DB_HOST || "127.0.0.1",
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || "root",
    password: env.DB_PASSWORD || "",
    database: env.DB_NAME || "encodestudio",
    ssl: bool(env.DB_SSL, false) ? { rejectUnauthorized: bool(env.DB_SSL_REJECT_UNAUTHORIZED, true) } : undefined,
  },

  corsAllowedOrigins: list(env.CORS_ALLOWED_ORIGINS, "http://localhost:5173,http://127.0.0.1:5173"),

  jwt: {
    secret: jwtSecret || "insecure-dev-secret-change-me",
    accessTtl: env.JWT_ACCESS_TTL || "8h",
    refreshTtl: env.JWT_REFRESH_TTL || "7d",
  },

  contactRateLimitPerHour: Number(env.CONTACT_RATE_LIMIT_PER_HOUR || 20),

  email: {
    // Emails are printed to the server log unless SMTP is configured. The
    // Django-era value EMAIL_BACKEND=...console.EmailBackend still forces this.
    useConsole: !env.EMAIL_HOST || /console/i.test(env.EMAIL_BACKEND || ""),
    host: env.EMAIL_HOST || "",
    port: Number(env.EMAIL_PORT || 587),
    user: env.EMAIL_HOST_USER || "",
    password: env.EMAIL_HOST_PASSWORD || "",
    useTls: bool(env.EMAIL_USE_TLS, true),
    useSsl: bool(env.EMAIL_USE_SSL, false),
    from: env.DEFAULT_FROM_EMAIL || "Encode Studio <no-reply@encodestudio.in>",
    adminTo: env.ADMIN_EMAIL || "shivam@encodestudio.in",
    adminCc: list(env.ADMIN_EMAIL_CC, "encodestudio.in@gmail.com"),
  },

  // Link used in the "Open in Lead Manager" button of the admin notification.
  leadsPortalUrl: (env.LEADS_PORTAL_URL || "http://localhost:5173/leads").replace(/\/+$/, ""),
};
