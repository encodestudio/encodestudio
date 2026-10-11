import { NOW, batch, prepare, query, userNameSql } from "./db.js";
import { config } from "./config.js";
import {
  addDays,
  computeInvoice,
  financialYear,
  invoiceDisplayStatus,
  round2,
  todayInIndia,
} from "../../frontend/src/lib/invoiceMath.js";

export { addDays, computeInvoice, financialYear, invoiceDisplayStatus, round2, todayInIndia };

export const TAX_MODES = ["intra", "inter", "none"];
export const PAYMENT_METHODS = {
  bank_transfer: "Bank transfer",
  upi: "UPI",
  cash: "Cash",
  cheque: "Cheque",
  card: "Card",
  razorpay: "Razorpay (online)",
  other: "Other",
};
export const MAX_ITEMS = 50;

// ---- Settings -----------------------------------------------------------

const SETTINGS_FIELDS = {
  business_name: 150,
  legal_name: 150,
  gstin: 15,
  pan: 10,
  address: 500,
  state_code: 2,
  email: 254,
  phone: 30,
  website: 200,
  bank_name: 100,
  account_name: 150,
  account_number: 30,
  ifsc: 11,
  upi_id: 100,
  invoice_prefix: 6,
  default_sac: 10,
  default_notes: 2000,
  default_terms: 4000,
};

export async function getSettings() {
  const [settings] = await query("SELECT * FROM invoice_settings WHERE id = 1");
  const fy = financialYear(todayInIndia());
  const [seq] = await query("SELECT last_number FROM invoice_sequence WHERE fy = ?", [fy]);
  const { razorpay } = config;
  return {
    ...settings,
    current_fy: fy,
    next_number: (seq?.last_number ?? 0) + 1,
    razorpay: {
      enabled: razorpay.enabled,
      mode: razorpay.keyId.startsWith("rzp_live_") ? "live" : razorpay.keyId ? "test" : null,
      webhook_configured: Boolean(razorpay.webhookSecret),
      webhook_url: `${siteUrl()}/api/webhooks/razorpay`,
    },
  };
}

const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATE_RE = /^\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isDate = (value) => DATE_RE.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());

export function validateSettings(body, errors) {
  const data = {};
  for (const [field, max] of Object.entries(SETTINGS_FIELDS)) {
    if (body[field] === undefined) continue;
    let value = String(body[field] ?? "").trim();
    if (["gstin", "pan", "ifsc", "invoice_prefix"].includes(field)) value = value.toUpperCase();
    if (value.length > max) errors[field] = [`Ensure this field has no more than ${max} characters.`];
    data[field] = value;
  }
  if (data.business_name !== undefined && !data.business_name) errors.business_name = ["This field may not be blank."];
  if (data.gstin && !GSTIN_RE.test(data.gstin)) errors.gstin = ["Enter a valid 15-character GSTIN."];
  if (data.state_code && !STATE_RE.test(data.state_code)) errors.state_code = ["Choose a state."];
  if (data.gstin && !data.state_code && body.state_code === undefined) data.state_code = data.gstin.slice(0, 2);
  if (data.email && !EMAIL_RE.test(data.email)) errors.email = ["Enter a valid email address."];
  if (data.invoice_prefix !== undefined && !/^[A-Z0-9-]{1,6}$/.test(data.invoice_prefix)) {
    // GST caps invoice numbers at 16 characters: letters, digits, "-" and "/".
    errors.invoice_prefix = ["Use 1–6 letters, digits or dashes."];
  }
  if (body.default_due_days !== undefined) {
    const days = Number(body.default_due_days);
    if (!Number.isInteger(days) || days < 0 || days > 365) errors.default_due_days = ["Enter 0–365 days."];
    data.default_due_days = days;
  }
  if (body.default_tax_rate !== undefined) {
    const rate = Number(body.default_tax_rate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 28) errors.default_tax_rate = ["Enter a GST rate between 0 and 28."];
    data.default_tax_rate = rate;
  }
  return data;
}

// ---- Invoices -------------------------------------------------------------

const CLIENT_FIELDS = {
  client_name: 150,
  client_company: 150,
  client_email: 254,
  client_phone: 30,
  client_address: 500,
  client_gstin: 15,
  client_state_code: 2,
};

/** Validates the editable parts of an invoice. `partial` skips absent fields (PATCH). */
export function validateInvoice(body, errors, { partial = false } = {}) {
  const data = {};
  for (const [field, max] of Object.entries(CLIENT_FIELDS)) {
    if (partial && body[field] === undefined) continue;
    let value = String(body[field] ?? "").trim();
    if (field === "client_gstin") value = value.toUpperCase();
    if (value.length > max) errors[field] = [`Ensure this field has no more than ${max} characters.`];
    data[field] = value;
  }
  if (data.client_name !== undefined && !data.client_name) errors.client_name = ["This field may not be blank."];
  if (data.client_email && !EMAIL_RE.test(data.client_email)) errors.client_email = ["Enter a valid email address."];
  if (data.client_gstin && !GSTIN_RE.test(data.client_gstin)) errors.client_gstin = ["Enter a valid 15-character GSTIN."];
  if (data.client_state_code && !STATE_RE.test(data.client_state_code)) errors.client_state_code = ["Choose a state."];
  // A registered client's place of supply is the state in their GSTIN.
  if (data.client_gstin && !data.client_state_code) data.client_state_code = data.client_gstin.slice(0, 2);

  for (const field of ["issue_date", "due_date"]) {
    if (body[field] === undefined) continue;
    const value = body[field] === null || body[field] === "" ? null : String(body[field]);
    if (field === "issue_date" && !value) errors.issue_date = ["This field is required."];
    else if (value && !isDate(value)) errors[field] = ["Enter a valid date."];
    data[field] = value;
  }
  if (data.issue_date && data.due_date && data.due_date < data.issue_date) {
    errors.due_date = ["The due date can't be before the invoice date."];
  }
  if (body.tax_mode !== undefined) {
    if (!TAX_MODES.includes(body.tax_mode)) errors.tax_mode = [`"${body.tax_mode}" is not a valid choice.`];
    data.tax_mode = body.tax_mode;
  }
  if (body.discount !== undefined) {
    const discount = body.discount === "" || body.discount === null ? 0 : Number(body.discount);
    if (!Number.isFinite(discount) || discount < 0 || discount >= 1e10) errors.discount = ["Enter a valid amount."];
    data.discount = round2(discount);
  }
  for (const field of ["notes", "terms"]) {
    if (body[field] === undefined) continue;
    data[field] = String(body[field] ?? "").slice(0, 4000);
  }

  if (body.items !== undefined || !partial) {
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) errors.items = ["Add at least one line item."];
    if (items.length > MAX_ITEMS) errors.items = [`An invoice can have at most ${MAX_ITEMS} line items.`];
    const itemErrors = [];
    data.items = items.slice(0, MAX_ITEMS).map((raw, i) => {
      const item = {
        description: String(raw?.description ?? "").trim().slice(0, 500),
        sac: String(raw?.sac ?? "").trim().slice(0, 10),
        quantity: Number(raw?.quantity),
        unit_price: Number(raw?.unit_price),
        tax_rate: raw?.tax_rate === "" || raw?.tax_rate == null ? 0 : Number(raw.tax_rate),
      };
      const problems = [];
      if (!item.description) problems.push("description is required");
      if (!Number.isFinite(item.quantity) || item.quantity <= 0 || item.quantity > 1e6) problems.push("enter a quantity above 0");
      if (!Number.isFinite(item.unit_price) || item.unit_price < 0 || item.unit_price >= 1e10) problems.push("enter a valid rate");
      if (!Number.isFinite(item.tax_rate) || item.tax_rate < 0 || item.tax_rate > 28) problems.push("GST must be 0–28%");
      if (item.sac && !/^\d{4,8}$/.test(item.sac)) problems.push("SAC/HSN must be 4–8 digits");
      if (problems.length) itemErrors.push(`Line ${i + 1}: ${problems.join(", ")}.`);
      return { ...item, quantity: round2(item.quantity), unit_price: round2(item.unit_price), tax_rate: round2(item.tax_rate) };
    });
    if (itemErrors.length) errors.items = itemErrors;
  }
  return data;
}

/** Picks CGST+SGST vs IGST from the two states; no GST when the business has no GSTIN. */
export function autoTaxMode(settings, clientStateCode) {
  if (!settings.gstin) return "none";
  if (settings.state_code && clientStateCode && settings.state_code !== clientStateCode) return "inter";
  return "intra";
}

export const INVOICE_SELECT = `
  SELECT i.*, l.name AS lead_name, ${userNameSql("u")} AS created_by_name
  FROM invoice i
  LEFT JOIN contact_lead l ON l.id = i.lead_id
  LEFT JOIN auth_user u ON u.id = i.created_by`;

export const siteUrl = () => new URL(config.leadsPortalUrl).origin;
export const publicInvoiceUrl = (token) => `${siteUrl()}/invoice/${token}`;

/** API shape. Items, payments and the tax breakdown are included when given. */
export function toInvoice(row, items = null, payments = null, { internal = true } = {}) {
  const balance = round2(row.total - row.amount_paid);
  const invoice = {
    id: row.id,
    number: row.number,
    status: row.status,
    display_status: invoiceDisplayStatus(row),
    client_name: row.client_name,
    client_company: row.client_company,
    client_email: row.client_email,
    client_phone: row.client_phone,
    client_address: row.client_address,
    client_gstin: row.client_gstin,
    client_state_code: row.client_state_code,
    issue_date: row.issue_date,
    due_date: row.due_date,
    tax_mode: row.tax_mode,
    discount: row.discount,
    subtotal: row.subtotal,
    tax_total: row.tax_total,
    total: row.total,
    amount_paid: row.amount_paid,
    balance,
    notes: row.notes,
    terms: row.terms,
    issued_at: row.issued_at,
    sent_at: row.sent_at,
    voided_at: row.voided_at,
    void_reason: row.void_reason,
    payment_link_url:
      row.status === "issued" && balance >= 1 && ["created", "partially_paid"].includes(row.payment_link_status) &&
      round2(row.payment_link_amount) === balance
        ? row.payment_link_url
        : null,
  };
  if (internal) {
    Object.assign(invoice, {
      lead: row.lead_id ? { id: row.lead_id, name: row.lead_name } : null,
      created_by: row.created_by ? { id: row.created_by, name: row.created_by_name } : null,
      public_url: row.status === "draft" ? null : publicInvoiceUrl(row.public_token),
      payment_link_status: row.payment_link_status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }
  if (items) {
    const computed = computeInvoice(items, row.discount, row.tax_mode);
    invoice.items = computed.lines.map(({ id, description, sac, quantity, unit_price, tax_rate, amount }) => ({
      id,
      description,
      sac,
      quantity,
      unit_price,
      tax_rate,
      amount,
    }));
    invoice.taxes = computed.taxes;
    invoice.taxable = computed.taxable;
  }
  if (payments) {
    invoice.payments = payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      paid_on: p.paid_on,
      method: p.method,
      method_display: PAYMENT_METHODS[p.method] || p.method,
      reference: p.reference,
      ...(internal ? { note: p.note, created_by: p.created_by ? { id: p.created_by, name: p.user_name } : null } : {}),
    }));
  }
  return invoice;
}

export async function getInvoiceRow(where, params) {
  const rows = await query(`${INVOICE_SELECT} WHERE ${where}`, params);
  return rows[0] || null;
}

export async function loadInvoice(row, options) {
  const items = await query("SELECT * FROM invoice_item WHERE invoice_id = ? ORDER BY position, id", [row.id]);
  const payments = await query(
    `SELECT p.*, ${userNameSql("u")} AS user_name FROM invoice_payment p
     LEFT JOIN auth_user u ON u.id = p.created_by
     WHERE p.invoice_id = ? ORDER BY p.paid_on, p.id`,
    [row.id],
  );
  return toInvoice(row, items, payments, options);
}

/** Statements replacing an invoice's line items and refreshing its stored totals. */
export function itemStatements(invoiceId, items, discount, taxMode) {
  const totals = computeInvoice(items, discount, taxMode);
  return [
    prepare("DELETE FROM invoice_item WHERE invoice_id = ?", [invoiceId]),
    ...items.map((item, position) =>
      prepare(
        `INSERT INTO invoice_item (invoice_id, position, description, sac, quantity, unit_price, tax_rate)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [invoiceId, position, item.description, item.sac, item.quantity, item.unit_price, item.tax_rate],
      ),
    ),
    prepare(`UPDATE invoice SET subtotal = ?, tax_total = ?, total = ?, discount = ?, updated_at = ${NOW} WHERE id = ?`, [
      totals.subtotal,
      totals.tax_total,
      totals.total,
      totals.discount,
      invoiceId,
    ]),
  ];
}

/** Re-sums an invoice's payments into amount_paid. */
export async function refreshAmountPaid(invoiceId) {
  await query(
    `UPDATE invoice SET amount_paid = ROUND(COALESCE((SELECT SUM(amount) FROM invoice_payment WHERE invoice_id = ?), 0), 2),
            updated_at = ${NOW} WHERE id = ?`,
    [invoiceId, invoiceId],
  );
}

/** Next number in the financial year of `issueDate`, e.g. "ES/2026-27/007". */
export async function nextInvoiceNumber(prefix, issueDate) {
  const fy = financialYear(issueDate);
  const row = await prepare(
    `INSERT INTO invoice_sequence (fy, last_number) VALUES (?, 1)
     ON CONFLICT (fy) DO UPDATE SET last_number = last_number + 1 RETURNING last_number`,
    [fy],
  ).first();
  return `${prefix}/${fy}/${String(row.last_number).padStart(3, "0")}`;
}

/** 32 hex characters (128 bits) for the client's view link. */
export function newPublicToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
}

export { batch };
