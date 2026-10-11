import { Hono } from "hono";
import { NOW, query } from "../db.js";
import { getInvoiceRow, getSettings } from "../invoices.js";
import { ensurePaymentLink, syncPaymentLink, verifyWebhookSignature } from "../razorpay.js";

// Incoming webhooks from third parties. Authenticated by signature, not login.
const router = new Hono({ strict: false });

// POST /api/webhooks/razorpay — payment_link.paid / partially_paid / cancelled / expired.
// Set this URL and its secret in Razorpay Dashboard → Settings → Webhooks.
router.post("/razorpay", async (c) => {
  if (!(await verifyWebhookSignature(c.get("rawBody") ?? "", c.req.header("X-Razorpay-Signature")))) {
    return c.json({ detail: "Invalid signature." }, 400);
  }
  const { event, payload } = c.get("body");
  const link = payload?.payment_link?.entity;
  if (!event?.startsWith("payment_link.") || !link?.id) return c.json({ ok: true, ignored: event });

  const row = await getInvoiceRow("i.payment_link_id = ?", [link.id]);
  // Links we've since replaced (or that aren't ours) are acknowledged so Razorpay stops retrying.
  if (!row) return c.json({ ok: true, ignored: "unknown link" });

  if (event === "payment_link.paid" || event === "payment_link.partially_paid") {
    const recorded = await syncPaymentLink(row);
    if (recorded) await ensurePaymentLink(await getInvoiceRow("i.id = ?", [row.id]), await getSettings());
    return c.json({ ok: true, recorded });
  }
  if (event === "payment_link.cancelled" || event === "payment_link.expired") {
    await query(`UPDATE invoice SET payment_link_status = ?, updated_at = ${NOW} WHERE id = ?`, [link.status, row.id]);
  }
  return c.json({ ok: true });
});

export default router;
