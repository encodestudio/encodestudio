// Razorpay Payment Links for invoices.
//
// Each issued invoice with money owing gets one active link for its balance. When
// the balance changes, the old link is cancelled and a new one is made, because
// a link's amount can't be edited. Payments come back in two ways, and both
// funnel into syncPaymentLink(), which reads the link's payments from Razorpay:
//   1. the customer's redirect back to the invoice page (signed with the key secret)
//   2. the payment_link.* webhook (signed with the webhook secret)
// Each Razorpay payment id is stored once (unique index), so retries are harmless.
import { config } from "./config.js";
import { NOW, query } from "./db.js";
import { logActivity } from "./leads.js";
import { publicInvoiceUrl, refreshAmountPaid, round2 } from "./invoices.js";

const encoder = new TextEncoder();

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Webhook: HMAC-SHA256 of the raw body with the webhook secret, hex. */
export async function verifyWebhookSignature(rawBody, signature) {
  if (!config.razorpay.webhookSecret || !signature) return false;
  return safeEqual(await hmacHex(config.razorpay.webhookSecret, rawBody), signature);
}

/** Redirect after payment: HMAC-SHA256 of "link_id|reference_id|status|payment_id" with the key secret. */
export async function verifyCallbackSignature({ linkId, referenceId, status, paymentId, signature }) {
  if (!config.razorpay.keySecret || !signature) return false;
  const expected = await hmacHex(config.razorpay.keySecret, `${linkId}|${referenceId}|${status}|${paymentId}`);
  return safeEqual(expected, signature);
}

async function api(method, path, body) {
  const { keyId, keySecret, apiBase } = config.razorpay;
  const res = await fetch(`${apiBase}/v1${path}`, {
    method,
    headers: {
      Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.description || `Razorpay request failed (${res.status})`;
    throw Object.assign(new Error(message), { status: res.status });
  }
  return data;
}

/** "9876543210" / "+91 98765-43210" → "+919876543210"; anything else is left out. */
function razorpayContact(phone) {
  const digits = String(phone || "").replace(/[^\d+]/g, "");
  if (/^\+\d{8,13}$/.test(digits)) return digits;
  const bare = digits.replace(/^\+/, "").replace(/^0/, "");
  if (/^[6-9]\d{9}$/.test(bare)) return `+91${bare}`;
  if (/^91[6-9]\d{9}$/.test(bare)) return `+${bare}`;
  return undefined;
}

const LIVE_STATUSES = ["created", "partially_paid"];

async function cancelLink(row) {
  if (!row.payment_link_id || !LIVE_STATUSES.includes(row.payment_link_status)) return;
  try {
    await api("POST", `/payment_links/${row.payment_link_id}/cancel`);
  } catch (err) {
    // Already paid/expired/cancelled on Razorpay's side; nothing left to cancel.
    console.warn(`Couldn't cancel Razorpay link ${row.payment_link_id}: ${err.message}`);
  }
  await query(`UPDATE invoice SET payment_link_status = 'cancelled', updated_at = ${NOW} WHERE id = ?`, [row.id]);
}

/**
 * Makes sure an issued invoice has a live link for exactly its balance.
 * Returns the link URL, or null when Razorpay isn't set up or nothing is owed.
 * Throws if Razorpay rejects the request (callers decide whether that's fatal).
 */
export async function ensurePaymentLink(row, business) {
  if (!config.razorpay.enabled) return null;
  const balance = round2(row.total - row.amount_paid);
  const live = row.payment_link_id && LIVE_STATUSES.includes(row.payment_link_status);

  if (row.status !== "issued" || balance < 1) {
    // Razorpay's minimum is ₹1. Paid or void invoices shouldn't keep a payable link.
    if (live && row.payment_link_status !== "paid") await cancelLink(row);
    return null;
  }
  if (live && round2(row.payment_link_amount) === balance) return row.payment_link_url;
  if (live) await cancelLink(row);

  const attempt = (row.payment_link_attempt || 0) + 1;
  const reference = `${row.number.replace(/\//g, "-")}${attempt > 1 ? `-${attempt}` : ""}`.slice(0, 40);
  const customer = Object.fromEntries(
    Object.entries({
      name: (row.client_company || row.client_name).slice(0, 100),
      email: row.client_email || undefined,
      contact: razorpayContact(row.client_phone),
    }).filter(([, v]) => v),
  );
  const link = await api("POST", "/payment_links", {
    amount: Math.round(balance * 100),
    currency: "INR",
    accept_partial: false,
    reference_id: reference,
    description: `Invoice ${row.number} — ${business.business_name}`.slice(0, 2048),
    customer,
    // Our own invoice email carries the link, so Razorpay doesn't send one too.
    notify: { sms: false, email: false },
    reminder_enable: false,
    notes: { invoice_id: String(row.id), invoice_number: row.number },
    callback_url: publicInvoiceUrl(row.public_token),
    callback_method: "get",
  });
  await query(
    `UPDATE invoice SET payment_link_id = ?, payment_link_url = ?, payment_link_amount = ?, payment_link_status = ?,
            payment_link_attempt = ?, updated_at = ${NOW} WHERE id = ?`,
    [link.id, link.short_url, balance, link.status || "created", attempt, row.id],
  );
  return link.short_url;
}

/** Cancels the invoice's link, if it has a live one (e.g. when voided). */
export async function cancelPaymentLink(row) {
  if (config.razorpay.enabled) await cancelLink(row);
}

/** IST calendar date of a unix timestamp. */
const istDate = (unixSeconds) => new Date(unixSeconds * 1000 + 330 * 60_000).toISOString().slice(0, 10);

/**
 * Pulls the link's state from Razorpay and records any captured payments we
 * haven't seen. Returns the number of new payments recorded.
 */
export async function syncPaymentLink(row) {
  if (!config.razorpay.enabled || !row.payment_link_id) return 0;
  const link = await api("GET", `/payment_links/${row.payment_link_id}`);
  let recorded = 0;
  for (const p of link.payments || []) {
    if (p.status !== "captured" || !p.payment_id) continue;
    const amount = round2(p.amount / 100);
    const result = await query(
      `INSERT INTO invoice_payment (invoice_id, amount, paid_on, method, reference, note, gateway_payment_id, created_by, created_at)
       VALUES (?, ?, ?, 'razorpay', ?, ?, ?, NULL, ${NOW})
       ON CONFLICT (gateway_payment_id) WHERE gateway_payment_id IS NOT NULL DO NOTHING`,
      [row.id, amount, istDate(p.created_at), p.payment_id, `Paid online via Razorpay${p.method ? ` (${p.method})` : ""}`, p.payment_id],
    );
    if (!result.affectedRows) continue;
    recorded++;
    await refreshAmountPaid(row.id);
    if (row.lead_id) {
      const amountText = `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
      await logActivity(row.lead_id, null, "payment_received", `${amountText} paid online against ${row.number} (Razorpay)`, {
        invoice_id: row.id,
        number: row.number,
        amount,
        gateway_payment_id: p.payment_id,
      });
    }
  }
  await query(`UPDATE invoice SET payment_link_status = ?, updated_at = ${NOW} WHERE id = ?`, [link.status, row.id]);
  return recorded;
}
