// Settings come from the Worker environment: `vars` in wrangler.jsonc, secrets
// set with `wrangler secret put`, and `.dev.vars` during local development.
// The environment is fixed for the life of an isolate, so it is read once.
export const config = {};

const list = (value, fallback = "") =>
  (value ?? fallback)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const bool = (value, fallback) => (value == null || value === "" ? fallback : String(value).toLowerCase() === "true");

/** "8h" / "7d" / "30m" / "3600" → seconds. */
function seconds(value, fallback) {
  const match = /^(\d+)\s*([smhd]?)$/.exec(String(value ?? "").trim());
  if (!match) return fallback;
  return Number(match[1]) * { "": 1, s: 1, m: 60, h: 3600, d: 86400 }[match[2]];
}

export function loadConfig(env) {
  if (config.loaded) return config;
  const isProduction = env.ENVIRONMENT === "production";
  const jwtSecret = env.JWT_SECRET || env.DJANGO_SECRET_KEY;
  if (!jwtSecret && isProduction) {
    throw new Error("JWT_SECRET must be set in production (wrangler secret put JWT_SECRET).");
  }

  Object.assign(config, {
    loaded: true,
    isProduction,

    corsAllowedOrigins: list(env.CORS_ALLOWED_ORIGINS, "http://localhost:5173,http://127.0.0.1:5173"),

    jwt: {
      secret: jwtSecret || "insecure-dev-secret-change-me",
      accessTtl: seconds(env.JWT_ACCESS_TTL, 8 * 3600),
      refreshTtl: seconds(env.JWT_REFRESH_TTL, 7 * 86400),
    },

    contactRateLimitPerHour: Number(env.CONTACT_RATE_LIMIT_PER_HOUR || 20),

    email: {
      // Emails are printed to the Worker log unless SMTP is configured. The
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

    // Razorpay Payment Links. Keys come from `wrangler secret put`; invoices get a
    // "Pay now" link only when both keys are set. RAZORPAY_API_BASE is for local mocks.
    razorpay: {
      keyId: env.RAZORPAY_KEY_ID || "",
      keySecret: env.RAZORPAY_KEY_SECRET || "",
      webhookSecret: env.RAZORPAY_WEBHOOK_SECRET || "",
      apiBase: (env.RAZORPAY_API_BASE || "https://api.razorpay.com").replace(/\/+$/, ""),
      enabled: Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET),
    },

    // Link used in the "Open in Lead Manager" button of the admin notification.
    leadsPortalUrl: (env.LEADS_PORTAL_URL || "http://localhost:5173/leads").replace(/\/+$/, ""),
  });
  return config;
}
