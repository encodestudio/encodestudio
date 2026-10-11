import { Hono } from "hono";
import { getInvoiceRow, getSettings, loadInvoice } from "../invoices.js";
import { ensurePaymentLink, syncPaymentLink, verifyCallbackSignature } from "../razorpay.js";

// Unauthenticated endpoints. The 128-bit token in the URL is the only key, so
// only what belongs on the client's copy of the invoice is returned.
const router = new Hono({ strict: false });

const BUSINESS_FIELDS = [
  "business_name",
  "legal_name",
  "gstin",
  "pan",
  "address",
  "state_code",
  "email",
  "phone",
  "website",
  "bank_name",
  "account_name",
  "account_number",
  "ifsc",
  "upi_id",
];

// GET /api/public/invoices/:token — the client's view of an issued invoice.
router.get("/invoices/:token", async (c) => {
  const token = c.req.param("token");
  const row = /^[0-9a-f]{32}$/.test(token) ? await getInvoiceRow("i.public_token = ? AND i.status <> 'draft'", [token]) : null;
  if (!row) return c.json({ detail: "Invoice not found." }, 404);
  const settings = await getSettings();
  c.header("Cache-Control", "no-store");
  c.header("X-Robots-Tag", "noindex");
  return c.json({
    invoice: await loadInvoice(row, { internal: false }),
    business: Object.fromEntries(BUSINESS_FIELDS.map((f) => [f, settings[f]])),
  });
});

// POST /api/public/invoices/:token/razorpay-return — Razorpay sends the customer back to the
// invoice page with signed razorpay_* query params after paying; the page forwards them here.
// The signature proves the payment happened; the amounts are then read from Razorpay itself.
router.post("/invoices/:token/razorpay-return", async (c) => {
  const token = c.req.param("token");
  const row = /^[0-9a-f]{32}$/.test(token) ? await getInvoiceRow("i.public_token = ? AND i.status = 'issued'", [token]) : null;
  if (!row) return c.json({ detail: "Invoice not found." }, 404);
  const b = c.get("body");
  const params = {
    linkId: String(b.razorpay_payment_link_id || ""),
    referenceId: String(b.razorpay_payment_link_reference_id || ""),
    status: String(b.razorpay_payment_link_status || ""),
    paymentId: String(b.razorpay_payment_id || ""),
    signature: String(b.razorpay_signature || ""),
  };
  if (params.linkId !== row.payment_link_id || !(await verifyCallbackSignature(params))) {
    return c.json({ detail: "Payment confirmation couldn't be verified." }, 400);
  }
  try {
    if (await syncPaymentLink(row)) await ensurePaymentLink(await getInvoiceRow("i.id = ?", [row.id]), await getSettings());
  } catch (err) {
    // The webhook will catch up; the customer still sees their payment acknowledged.
    console.error(`Razorpay sync after redirect failed for invoice #${row.id}`, err);
  }
  return c.json({ invoice: await loadInvoice(await getInvoiceRow("i.id = ?", [row.id]), { internal: false }) });
});

export default router;
