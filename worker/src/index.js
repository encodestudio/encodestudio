/**
 * Contact-form handler for encodestudio.in
 *
 * Replaces the Django `/api/contact/` endpoint (App Runner + RDS) with a
 * zero-cost Cloudflare Worker. Receives the website contact form POST,
 * validates it, and emails the lead to the team via Resend's HTTP API.
 *
 * Config (wrangler.toml [vars] + `wrangler secret put`):
 *   RESEND_API_KEY     secret   Resend API key (https://resend.com, free tier)
 *   MAIL_FROM          var      e.g. "Encode Studio <leads@encodestudio.in>"
 *                               (domain must be verified in Resend; until then
 *                                use "onboarding@resend.dev")
 *   MAIL_TO            var      comma-separated recipients, e.g. "shivam@encodestudio.in"
 *   SEND_CONFIRMATION  var      "true" to also auto-reply to the lead
 *   TURNSTILE_SECRET   secret   optional — enables Cloudflare Turnstile spam check
 */

const ALLOWED_ORIGINS = new Set([
  "https://encodestudio.in",
  "https://www.encodestudio.in",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:4173",
]);

const FIELDS = [
  "name",
  "company",
  "email",
  "phone",
  "interest",
  "project_description",
  "timeline",
  "message",
];

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : "https://encodestudio.in";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

function escapeHtml(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
  );
}

async function sendEmail(env, payload) {
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== "POST") {
      return json({ detail: "Method not allowed." }, 405, origin);
    }

    let data;
    try {
      data = await request.json();
    } catch {
      return json({ detail: "Invalid request body." }, 400, origin);
    }

    // Honeypot: real users never see or fill `website`. Bots do — accept
    // silently so they don't learn they were caught, but send nothing.
    if (data.website) {
      return json({ ok: true }, 200, origin);
    }

    const name = (data.name || "").toString().trim();
    const email = (data.email || "").toString().trim();
    const message = (data.message || "").toString().trim();

    if (!name || !email || !message) {
      return json({ detail: "Name, email and message are required." }, 400, origin);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ email: "Enter a valid email address." }, 400, origin);
    }
    if (name.length > 200 || email.length > 320 || message.length > 5000) {
      return json({ detail: "That submission is too long." }, 400, origin);
    }

    // Optional Cloudflare Turnstile check
    if (env.TURNSTILE_SECRET) {
      const token = data.turnstileToken || data["cf-turnstile-response"] || "";
      const outcome = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            secret: env.TURNSTILE_SECRET,
            response: token,
            remoteip: request.headers.get("CF-Connecting-IP"),
          }),
        },
      ).then((r) => r.json());
      if (!outcome.success) {
        return json({ detail: "Spam check failed. Please try again." }, 400, origin);
      }
    }

    const ip = request.headers.get("CF-Connecting-IP") || "?";
    const rows = FIELDS.map((f) => {
      const v = (data[f] || "").toString().trim();
      if (!v) return "";
      return `<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top">${escapeHtml(
        f,
      )}</td><td style="padding:4px 0">${escapeHtml(v).replace(/\n/g, "<br>")}</td></tr>`;
    }).join("");

    const html = `<div style="font-family:system-ui,Segoe UI,sans-serif;font-size:14px;color:#111">
  <h2 style="margin:0 0 12px">New lead from encodestudio.in</h2>
  <table style="border-collapse:collapse">${rows}</table>
  <p style="margin-top:16px;color:#999;font-size:12px">Received ${new Date().toISOString()} &middot; IP ${escapeHtml(
    ip,
  )}</p>
</div>`;
    const text = FIELDS.map((f) => (data[f] ? `${f}: ${data[f]}` : ""))
      .filter(Boolean)
      .join("\n");

    const notify = await sendEmail(env, {
      from: env.MAIL_FROM,
      to: env.MAIL_TO.split(",").map((s) => s.trim()),
      reply_to: email,
      subject: `New lead: ${name}${data.company ? ` (${data.company})` : ""}`,
      html,
      text,
    });

    if (!notify.ok) {
      console.error("Resend notify failed", notify.status, await notify.text());
      return json(
        { detail: "Could not send your message right now. Please email us directly." },
        502,
        origin,
      );
    }

    if (env.SEND_CONFIRMATION === "true") {
      // Best-effort; a failed confirmation must not fail the submission.
      try {
        await sendEmail(env, {
          from: env.MAIL_FROM,
          to: [email],
          subject: "We received your message — Encode Studio",
          text: `Hi ${name},\n\nThanks for reaching out to Encode Studio. We've received your message and will get back to you shortly.\n\n— Encode Studio`,
        });
      } catch (e) {
        console.error("confirmation email failed", e);
      }
    }

    return json({ ok: true }, 200, origin);
  },
};
