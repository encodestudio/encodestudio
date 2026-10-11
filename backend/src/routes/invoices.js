import { Hono } from "hono";
import { NOW, prepare, query } from "../db.js";
import { requireStaff } from "../auth.js";
import { logActivity } from "../leads.js";
import { sendInvoiceEmail } from "../emails.js";
import {
  INVOICE_SELECT,
  PAYMENT_METHODS,
  addDays,
  autoTaxMode,
  batch,
  financialYear,
  getInvoiceRow,
  getSettings,
  itemStatements,
  loadInvoice,
  newPublicToken,
  nextInvoiceNumber,
  refreshAmountPaid,
  round2,
  toInvoice,
  todayInIndia,
  validateInvoice,
  validateSettings,
} from "../invoices.js";

// Staff-only invoicing API for the /leads portal.
const router = new Hono({ strict: false });
router.use(requireStaff);

const NOT_FOUND = { detail: "No invoice matches the given query." };
const formatInr = (n) => `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

async function findInvoice(c) {
  const id = parseId(c.req.param("id"));
  return id ? getInvoiceRow("i.id = ?", [id]) : null;
}

const hasErrors = (errors) => Object.keys(errors).length > 0;

// ---- Settings -----------------------------------------------------------

// GET /api/invoices/settings — business details printed on invoices.
router.get("/settings", async (c) => c.json(await getSettings()));

// PUT|PATCH /api/invoices/settings — admins only.
async function saveSettings(c) {
  if (!c.get("user").is_superuser) return c.json({ detail: "Only admins can change invoice settings." }, 403);
  const body = c.get("body");
  const errors = {};
  const data = validateSettings(body, errors);

  // Lets the numbering continue from invoices issued elsewhere this financial year.
  let nextNumber;
  if (body.next_number !== undefined && body.next_number !== "" && body.next_number !== null) {
    nextNumber = Number(body.next_number);
    const settings = await getSettings();
    if (!Number.isInteger(nextNumber) || nextNumber < 1 || nextNumber > 999999) {
      errors.next_number = ["Enter a whole number."];
    } else if (nextNumber < settings.next_number) {
      errors.next_number = [`Invoices up to #${settings.next_number - 1} already exist this year; numbers can't be reused.`];
    }
  }
  if (hasErrors(errors)) return c.json(errors, 400);

  const statements = [];
  if (Object.keys(data).length) {
    statements.push(
      prepare(`UPDATE invoice_settings SET ${Object.keys(data).map((k) => `${k} = ?`).join(", ")}, updated_at = ${NOW} WHERE id = 1`, [
        ...Object.values(data),
      ]),
    );
  }
  if (nextNumber !== undefined) {
    statements.push(
      prepare(
        `INSERT INTO invoice_sequence (fy, last_number) VALUES (?, ?)
         ON CONFLICT (fy) DO UPDATE SET last_number = excluded.last_number`,
        [financialYear(todayInIndia()), nextNumber - 1],
      ),
    );
  }
  await batch(statements);
  return c.json(await getSettings());
}
router.put("/settings", saveSettings);
router.patch("/settings", saveSettings);

// ---- Listing ---------------------------------------------------------------

// GET /api/invoices/summary — headline numbers for the invoices page.
router.get("/summary", async (c) => {
  const today = todayInIndia();
  const monthStart = `${today.slice(0, 7)}-01`;
  const fyStart = `${financialYear(today).slice(0, 4)}-04-01`;
  const [open] = await query(
    `SELECT COALESCE(SUM(total - amount_paid), 0) AS outstanding, COUNT(*) AS open_count,
            COALESCE(SUM(CASE WHEN due_date < ? THEN total - amount_paid END), 0) AS overdue,
            COALESCE(SUM(CASE WHEN due_date < ? THEN 1 END), 0) AS overdue_count
     FROM invoice WHERE status = 'issued' AND total - amount_paid > 0.004`,
    [today, today],
  );
  const [paid] = await query(
    `SELECT COALESCE(SUM(p.amount), 0) AS month FROM invoice_payment p JOIN invoice i ON i.id = p.invoice_id
     WHERE i.status = 'issued' AND p.paid_on >= ?`,
    [monthStart],
  );
  const [fy] = await query(
    `SELECT COALESCE(SUM(total), 0) AS invoiced, COALESCE(SUM(tax_total), 0) AS gst
     FROM invoice WHERE status = 'issued' AND issue_date >= ?`,
    [fyStart],
  );
  const [drafts] = await query("SELECT COUNT(*) AS n FROM invoice WHERE status = 'draft'");
  return c.json({
    outstanding: round2(open.outstanding),
    open_count: open.open_count,
    overdue: round2(open.overdue),
    overdue_count: open.overdue_count,
    paid_this_month: round2(paid.month),
    invoiced_this_fy: round2(fy.invoiced),
    gst_this_fy: round2(fy.gst),
    current_fy: financialYear(today),
    drafts: drafts.n,
  });
});

// GET /api/invoices/?status=draft|outstanding|overdue|paid|void&search=&lead=
router.get("/", async (c) => {
  const q = c.req.query();
  const today = todayInIndia();
  const where = [];
  const params = [];
  const unpaid = "i.total - i.amount_paid > 0.004";
  switch (q.status) {
    case "draft":
    case "void":
      where.push("i.status = ?");
      params.push(q.status);
      break;
    case "outstanding":
      where.push(`i.status = 'issued' AND ${unpaid}`);
      break;
    case "overdue":
      where.push(`i.status = 'issued' AND ${unpaid} AND i.due_date < ?`);
      params.push(today);
      break;
    case "paid":
      where.push(`i.status = 'issued' AND NOT (${unpaid})`);
      break;
    default:
      break;
  }
  if (q.lead) {
    where.push("i.lead_id = ?");
    params.push(Number(q.lead) || 0);
  }
  if (q.search) {
    for (const term of String(q.search).trim().split(/\s+/).filter(Boolean).slice(0, 8)) {
      const like = `%${term.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
      const fields = ["i.number", "i.client_name", "i.client_company", "i.client_email"];
      where.push(`(${fields.map((f) => `${f} LIKE ? ESCAPE '\\'`).join(" OR ")})`);
      params.push(...fields.map(() => like));
    }
  }
  const rows = await query(
    `${INVOICE_SELECT} ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY CASE i.status WHEN 'draft' THEN 0 ELSE 1 END, i.issue_date DESC, i.id DESC LIMIT 500`,
    params,
  );
  return c.json(rows.map((row) => toInvoice(row)));
});

// ---- Create / edit ---------------------------------------------------------

// POST /api/invoices/ — new draft. With lead_id, client details default to the lead's.
router.post("/", async (c) => {
  const body = { ...c.get("body") };
  const user = c.get("user");
  const settings = await getSettings();

  let lead = null;
  if (body.lead_id) {
    [lead] = await query("SELECT id, name, company, email, phone FROM contact_lead WHERE id = ?", [Number(body.lead_id) || 0]);
    if (!lead) return c.json({ lead_id: ["Unknown lead."] }, 400);
    body.client_name ??= lead.name;
    body.client_company ??= lead.company;
    body.client_email ??= lead.email;
    body.client_phone ??= lead.phone;
  }
  const today = todayInIndia();
  body.issue_date ??= today;
  if (/^\d{4}-\d{2}-\d{2}$/.test(body.issue_date)) body.due_date ??= addDays(body.issue_date, settings.default_due_days);
  body.notes ??= settings.default_notes;
  body.terms ??= settings.default_terms;

  const errors = {};
  const data = validateInvoice(body, errors);
  if (hasErrors(errors)) return c.json(errors, 400);
  data.tax_mode ??= autoTaxMode(settings, data.client_state_code);

  const { items, ...fields } = data;
  const columns = { ...fields, lead_id: lead?.id ?? null, public_token: newPublicToken(), created_by: user.id };
  const result = await query(
    `INSERT INTO invoice (${Object.keys(columns).join(", ")}, status, created_at, updated_at)
     VALUES (${Object.keys(columns).map(() => "?").join(", ")}, 'draft', ${NOW}, ${NOW})`,
    Object.values(columns),
  );
  await batch(itemStatements(result.insertId, items, data.discount ?? 0, data.tax_mode));
  return c.json(await loadInvoice(await getInvoiceRow("i.id = ?", [result.insertId])), 201);
});

// GET /api/invoices/:id
router.get("/:id", async (c) => {
  const row = await findInvoice(c);
  if (!row) return c.json(NOT_FOUND, 404);
  return c.json(await loadInvoice(row));
});

// PATCH /api/invoices/:id — drafts are fully editable. Issued invoices are a tax
// record, so only the due date, notes and terms can change; void and duplicate instead.
router.patch("/:id", async (c) => {
  const row = await findInvoice(c);
  if (!row) return c.json(NOT_FOUND, 404);
  const body = c.get("body");
  if (row.status !== "draft") {
    const locked = Object.keys(body).filter((k) => !["due_date", "notes", "terms"].includes(k));
    if (row.status === "void" || locked.length) {
      return c.json({ detail: "Issued invoices can't be edited. Void it and create a corrected copy instead." }, 400);
    }
  }
  const errors = {};
  const data = validateInvoice(body, errors, { partial: true });
  if (data.due_date && !data.issue_date && data.due_date < row.issue_date) {
    errors.due_date = ["The due date can't be before the invoice date."];
  }
  if (hasErrors(errors)) return c.json(errors, 400);

  const { items, ...fields } = data;
  const statements = [];
  if (Object.keys(fields).length) {
    statements.push(
      prepare(`UPDATE invoice SET ${Object.keys(fields).map((k) => `${k} = ?`).join(", ")}, updated_at = ${NOW} WHERE id = ?`, [
        ...Object.values(fields),
        row.id,
      ]),
    );
  }
  // Totals depend on items, discount and tax mode, so recompute when any of them change.
  if (items || fields.discount !== undefined || fields.tax_mode !== undefined) {
    const currentItems = items ?? (await query("SELECT * FROM invoice_item WHERE invoice_id = ? ORDER BY position, id", [row.id]));
    statements.push(...itemStatements(row.id, currentItems, fields.discount ?? row.discount, fields.tax_mode ?? row.tax_mode));
  }
  await batch(statements);
  return c.json(await loadInvoice(await getInvoiceRow("i.id = ?", [row.id])));
});

// DELETE /api/invoices/:id — drafts only; issued invoices must be voided so the numbering has no gaps.
router.delete("/:id", async (c) => {
  const row = await findInvoice(c);
  if (!row) return c.json(NOT_FOUND, 404);
  if (row.status !== "draft") return c.json({ detail: "Only drafts can be deleted. Void an issued invoice instead." }, 400);
  await query("DELETE FROM invoice WHERE id = ?", [row.id]);
  return c.body(null, 204);
});

// ---- Lifecycle ---------------------------------------------------------------

// POST /api/invoices/:id/issue — assigns the next invoice number and locks the invoice.
router.post("/:id/issue", async (c) => {
  const row = await findInvoice(c);
  if (!row) return c.json(NOT_FOUND, 404);
  if (row.status !== "draft") return c.json({ detail: "This invoice has already been issued." }, 400);
  const [{ n }] = await query("SELECT COUNT(*) AS n FROM invoice_item WHERE invoice_id = ?", [row.id]);
  if (!n) return c.json({ detail: "Add at least one line item before issuing." }, 400);

  const settings = await getSettings();
  const number = await nextInvoiceNumber(settings.invoice_prefix, row.issue_date);
  const result = await query(
    `UPDATE invoice SET number = ?, status = 'issued', issued_at = ${NOW}, updated_at = ${NOW} WHERE id = ? AND status = 'draft'`,
    [number, row.id],
  );
  if (!result.affectedRows) return c.json({ detail: "This invoice has already been issued." }, 409);
  if (row.lead_id) {
    await logActivity(row.lead_id, c.get("user").id, "invoice_issued", `Invoice ${number} issued for ${formatInr(row.total)}`, {
      invoice_id: row.id,
      number,
      total: row.total,
    });
  }
  return c.json(await loadInvoice(await getInvoiceRow("i.id = ?", [row.id])));
});

// POST /api/invoices/:id/send — { to?, cc?, message? } emails the client a link to the invoice.
router.post("/:id/send", async (c) => {
  const row = await findInvoice(c);
  if (!row) return c.json(NOT_FOUND, 404);
  if (row.status !== "issued") return c.json({ detail: "Issue the invoice before sending it." }, 400);
  const body = c.get("body");
  const to = String(body.to ?? row.client_email).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return c.json({ to: ["Enter a valid email address."] }, 400);
  const message = String(body.message ?? "").slice(0, 4000);

  const invoice = await loadInvoice(row);
  const sent = await sendInvoiceEmail(invoice, await getSettings(), { to, message });
  if (!sent) return c.json({ detail: "The email couldn't be sent. Check the email settings and try again." }, 502);
  await query(`UPDATE invoice SET sent_at = ${NOW}, updated_at = ${NOW} WHERE id = ?`, [row.id]);
  if (row.lead_id) {
    await logActivity(row.lead_id, c.get("user").id, "invoice_sent", `Invoice ${row.number} emailed to ${to}`, {
      invoice_id: row.id,
      number: row.number,
    });
  }
  return c.json(await loadInvoice(await getInvoiceRow("i.id = ?", [row.id])));
});

// POST /api/invoices/:id/void — { reason }. The number stays used; nothing is deleted.
router.post("/:id/void", async (c) => {
  const row = await findInvoice(c);
  if (!row) return c.json(NOT_FOUND, 404);
  if (row.status !== "issued") return c.json({ detail: "Only issued invoices can be voided." }, 400);
  if (row.amount_paid > 0) return c.json({ detail: "Remove the recorded payments before voiding this invoice." }, 400);
  const reason = String(c.get("body").reason ?? "").trim().slice(0, 255);
  await query(`UPDATE invoice SET status = 'void', voided_at = ${NOW}, void_reason = ?, updated_at = ${NOW} WHERE id = ?`, [
    reason,
    row.id,
  ]);
  if (row.lead_id) {
    await logActivity(row.lead_id, c.get("user").id, "invoice_voided", `Invoice ${row.number} voided${reason ? `: ${reason}` : ""}`, {
      invoice_id: row.id,
      number: row.number,
    });
  }
  return c.json(await loadInvoice(await getInvoiceRow("i.id = ?", [row.id])));
});

// POST /api/invoices/:id/duplicate — a new draft with the same client and items, dated today.
router.post("/:id/duplicate", async (c) => {
  const row = await findInvoice(c);
  if (!row) return c.json(NOT_FOUND, 404);
  const settings = await getSettings();
  const items = await query("SELECT * FROM invoice_item WHERE invoice_id = ? ORDER BY position, id", [row.id]);
  const today = todayInIndia();
  const columns = {
    lead_id: row.lead_id,
    client_name: row.client_name,
    client_company: row.client_company,
    client_email: row.client_email,
    client_phone: row.client_phone,
    client_address: row.client_address,
    client_gstin: row.client_gstin,
    client_state_code: row.client_state_code,
    issue_date: today,
    due_date: addDays(today, settings.default_due_days),
    tax_mode: row.tax_mode,
    discount: row.discount,
    notes: row.notes,
    terms: row.terms,
    public_token: newPublicToken(),
    created_by: c.get("user").id,
  };
  const result = await query(
    `INSERT INTO invoice (${Object.keys(columns).join(", ")}, status, created_at, updated_at)
     VALUES (${Object.keys(columns).map(() => "?").join(", ")}, 'draft', ${NOW}, ${NOW})`,
    Object.values(columns),
  );
  await batch(itemStatements(result.insertId, items, row.discount, row.tax_mode));
  return c.json(await loadInvoice(await getInvoiceRow("i.id = ?", [result.insertId])), 201);
});

// ---- Payments -------------------------------------------------------------------

// POST /api/invoices/:id/payments — { amount, paid_on, method, reference?, note? }
router.post("/:id/payments", async (c) => {
  const row = await findInvoice(c);
  if (!row) return c.json(NOT_FOUND, 404);
  if (row.status !== "issued") return c.json({ detail: "Payments can only be recorded against issued invoices." }, 400);
  const body = c.get("body");
  const errors = {};
  const balance = round2(row.total - row.amount_paid);
  const amount = round2(Number(body.amount));
  if (!Number.isFinite(amount) || amount <= 0) errors.amount = ["Enter an amount above 0."];
  else if (amount > balance) errors.amount = [`That's more than the ${formatInr(balance)} still due.`];
  const paidOn = String(body.paid_on || todayInIndia());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn) || Number.isNaN(new Date(paidOn).getTime())) errors.paid_on = ["Enter a valid date."];
  const method = body.method || "bank_transfer";
  if (!(method in PAYMENT_METHODS)) errors.method = [`"${method}" is not a valid choice.`];
  if (hasErrors(errors)) return c.json(errors, 400);

  await query(
    `INSERT INTO invoice_payment (invoice_id, amount, paid_on, method, reference, note, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ${NOW})`,
    [
      row.id,
      amount,
      paidOn,
      method,
      String(body.reference ?? "").trim().slice(0, 100),
      String(body.note ?? "").trim().slice(0, 500),
      c.get("user").id,
    ],
  );
  await refreshAmountPaid(row.id);
  if (row.lead_id) {
    const paidInFull = amount >= balance;
    await logActivity(
      row.lead_id,
      c.get("user").id,
      "payment_received",
      `${formatInr(amount)} received against ${row.number}${paidInFull ? " (paid in full)" : ""}`,
      { invoice_id: row.id, number: row.number, amount },
    );
  }
  return c.json(await loadInvoice(await getInvoiceRow("i.id = ?", [row.id])), 201);
});

// DELETE /api/invoices/:id/payments/:paymentId — undo a payment recorded by mistake.
router.delete("/:id/payments/:paymentId", async (c) => {
  const row = await findInvoice(c);
  if (!row) return c.json(NOT_FOUND, 404);
  const result = await query("DELETE FROM invoice_payment WHERE id = ? AND invoice_id = ?", [
    parseId(c.req.param("paymentId")) || 0,
    row.id,
  ]);
  if (!result.affectedRows) return c.json({ detail: "Not found." }, 404);
  await refreshAmountPaid(row.id);
  return c.json(await loadInvoice(await getInvoiceRow("i.id = ?", [row.id])));
});

export default router;
