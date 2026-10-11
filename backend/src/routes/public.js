import { Hono } from "hono";
import { getInvoiceRow, getSettings, loadInvoice } from "../invoices.js";

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

export default router;
