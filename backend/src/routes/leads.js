import { Router } from "express";
import { query } from "../db.js";
import { requireStaff } from "../auth.js";
import { LEAD_TABLE, STATUSES, getLead, toManage } from "../leads.js";
import { sendLeadAdminNotificationEmail, sendLeadConfirmationEmail } from "../emails.js";

// Staff-only lead-management API backing the /leads portal.
const router = Router();
router.use(requireStaff);

const PAGE_SIZE = 20;
const SEARCH_FIELDS = ["name", "email", "company", "message", "project_description"];
const ORDERING_FIELDS = ["created_at", "updated_at", "name", "status"];

function parseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(404).json({ detail: "No Lead matches the given query." });
    return null;
  }
  return id;
}

// GET /api/leads/?page=&search=&status=&interest=&ordering=
router.get("/", async (req, res) => {
  const where = [];
  const params = [];

  const { search, status, interest, ordering } = req.query;
  if (status) {
    where.push("status = ?");
    params.push(String(status));
  }
  if (interest) {
    where.push("interest = ?");
    params.push(String(interest));
  }
  if (search) {
    // Every whitespace-separated term must match at least one field.
    for (const term of String(search).trim().split(/\s+/).filter(Boolean)) {
      const like = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      where.push(`(${SEARCH_FIELDS.map((f) => `${f} LIKE ?`).join(" OR ")})`);
      params.push(...SEARCH_FIELDS.map(() => like));
    }
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  let orderSql = "created_at DESC";
  if (ordering) {
    const field = String(ordering).replace(/^-/, "");
    if (ORDERING_FIELDS.includes(field)) {
      orderSql = `${field} ${String(ordering).startsWith("-") ? "DESC" : "ASC"}`;
    }
  }

  const [{ count }] = await query(`SELECT COUNT(*) AS count FROM ${LEAD_TABLE} ${whereSql}`, params);
  const page = req.query.page ? Number(req.query.page) : 1;
  const lastPage = Math.max(1, Math.ceil(count / PAGE_SIZE));
  if (!Number.isInteger(page) || page < 1 || page > lastPage) {
    return res.status(404).json({ detail: "Invalid page." });
  }

  const rows = await query(
    `SELECT * FROM ${LEAD_TABLE} ${whereSql} ORDER BY ${orderSql}, id DESC LIMIT ? OFFSET ?`,
    [...params, PAGE_SIZE, (page - 1) * PAGE_SIZE],
  );

  const pageUrl = (n) => {
    const url = new URL(req.originalUrl, `${req.protocol}://${req.get("host")}`);
    url.searchParams.set("page", n);
    return url.toString();
  };
  res.json({
    count,
    next: page < lastPage ? pageUrl(page + 1) : null,
    previous: page > 1 ? pageUrl(page - 1) : null,
    results: rows.map(toManage),
  });
});

// GET /api/leads/stats/ — counts per status, for the dashboard header.
router.get("/stats/", async (req, res) => {
  const rows = await query(`SELECT status, COUNT(*) AS n FROM ${LEAD_TABLE} GROUP BY status`);
  const stats = { total: 0, ...Object.fromEntries(Object.keys(STATUSES).map((s) => [s, 0])) };
  for (const { status, n } of rows) {
    stats.total += n;
    if (status in stats) stats[status] = n;
  }
  res.json(stats);
});

// GET /api/leads/interests/ — distinct interest values, for the filter dropdown.
router.get("/interests/", async (req, res) => {
  const rows = await query(
    `SELECT DISTINCT interest FROM ${LEAD_TABLE} WHERE interest <> '' ORDER BY interest`,
  );
  res.json(rows.map((r) => r.interest));
});

// GET /api/leads/:id/
router.get("/:id/", async (req, res) => {
  const id = parseId(req, res);
  if (!id) return;
  const lead = await getLead(id);
  if (!lead) return res.status(404).json({ detail: "No Lead matches the given query." });
  res.json(toManage(lead));
});

// PATCH|PUT /api/leads/:id/ — only status and notes are editable; the
// original submission is read-only.
async function updateLead(req, res) {
  const id = parseId(req, res);
  if (!id) return;
  if (!(await getLead(id))) return res.status(404).json({ detail: "No Lead matches the given query." });

  const sets = [];
  const params = [];
  const errors = {};
  const { status, notes } = req.body || {};
  if (status !== undefined) {
    if (!(status in STATUSES)) errors.status = [`"${status}" is not a valid choice.`];
    sets.push("status = ?");
    params.push(status);
  }
  if (notes !== undefined) {
    if (typeof notes !== "string") errors.notes = ["Not a valid string."];
    sets.push("notes = ?");
    params.push(notes);
  }
  if (Object.keys(errors).length) return res.status(400).json(errors);

  if (sets.length) {
    await query(`UPDATE ${LEAD_TABLE} SET ${sets.join(", ")}, updated_at = UTC_TIMESTAMP(6) WHERE id = ?`, [
      ...params,
      id,
    ]);
  }
  res.json(toManage(await getLead(id)));
}
router.patch("/:id/", updateLead);
router.put("/:id/", updateLead);

// DELETE /api/leads/:id/
router.delete("/:id/", async (req, res) => {
  const id = parseId(req, res);
  if (!id) return;
  const result = await query(`DELETE FROM ${LEAD_TABLE} WHERE id = ?`, [id]);
  if (!result.affectedRows) return res.status(404).json({ detail: "No Lead matches the given query." });
  res.status(204).end();
});

// POST /api/leads/:id/resend_emails/ — retry both emails, e.g. after an SMTP outage.
router.post("/:id/resend_emails/", async (req, res) => {
  const id = parseId(req, res);
  if (!id) return;
  const lead = await getLead(id);
  if (!lead) return res.status(404).json({ detail: "No Lead matches the given query." });

  const confirmationSent = await sendLeadConfirmationEmail(lead);
  const adminNotificationSent = await sendLeadAdminNotificationEmail(lead);
  res.json({
    confirmation_sent: confirmationSent,
    admin_notification_sent: adminNotificationSent,
    lead: toManage(await getLead(id)),
  });
});

export default router;
