import { Hono } from "hono";
import { MAX_PARAMS, NOW, batch, chunk, fieldOrder, now, prepare, query, userNameSql } from "../db.js";
import { requireStaff } from "../auth.js";
import {
  CONTACT_ACTIVITY_TYPES,
  LEAD_SELECT,
  LEAD_TABLE,
  PRIORITIES,
  SOURCES,
  STATUSES,
  activityStatements,
  createLead,
  getLead,
  logActivity,
  normalizeTags,
  toManage,
  validateSubmission,
} from "../leads.js";
import { sendLeadAdminNotificationEmail, sendLeadConfirmationEmail, sendLeadEmails } from "../emails.js";

// Staff-only lead-management API backing the /leads portal.
const router = new Hono({ strict: false });
router.use(requireStaff);

const DEFAULT_PAGE_SIZE = 20;
const SEARCH_FIELDS = ["l.name", "l.email", "l.company", "l.phone", "l.message", "l.project_description", "l.tags"];
const ORDERING = {
  created_at: "l.created_at",
  updated_at: "l.updated_at",
  last_activity_at: "l.last_activity_at",
  name: "l.name",
  status: fieldOrder("l.status", ["new", "contacted", "qualified", "converted", "lost"]),
  priority: fieldOrder("l.priority", ["low", "medium", "high"]),
  deal_value: "l.deal_value",
};
const NOT_FOUND = { detail: "No Lead matches the given query." };
const MANUAL_ACTIVITY_TYPES = ["note", ...CONTACT_ACTIVITY_TYPES];

const list = (value) =>
  String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/** Turns list/board/export query params into a WHERE clause. */
function buildFilters(q, user, { skipStatus = false } = {}) {
  const where = [];
  const params = [];
  const inList = (column, values) => {
    where.push(`${column} IN (${values.map(() => "?").join(", ")})`);
    params.push(...values);
  };

  if (!skipStatus && q.status) inList("l.status", list(q.status));
  if (q.interest) inList("l.interest", list(q.interest));
  if (q.source) inList("l.source", list(q.source));
  if (q.priority) inList("l.priority", list(q.priority));
  if (q.owner === "me") {
    where.push("l.owner_id = ?");
    params.push(user.id);
  } else if (q.owner === "none") {
    where.push("l.owner_id IS NULL");
  } else if (q.owner) {
    where.push("l.owner_id = ?");
    params.push(Number(q.owner));
  }
  if (q.tag) {
    where.push("instr(',' || l.tags || ',', ',' || ? || ',') > 0");
    params.push(String(q.tag).toLowerCase());
  }
  if (q.created_from) {
    where.push("l.created_at >= ?");
    params.push(new Date(q.created_from));
  }
  if (q.created_to) {
    where.push("l.created_at < ?");
    params.push(new Date(q.created_to));
  }
  if (q.stale === "1") {
    // Open leads nobody has touched for 3+ days.
    where.push(`l.status IN ('new', 'contacted', 'qualified') AND l.last_activity_at < ${now("-3 days")}`);
  }
  if (q.overdue === "1") {
    where.push(
      `EXISTS (SELECT 1 FROM lead_task t WHERE t.lead_id = l.id AND t.completed_at IS NULL AND t.due_at < ${NOW})`,
    );
  }
  if (q.search) {
    // Every whitespace-separated term must match at least one field. Capped so
    // the query stays under D1's limit of 100 bound parameters.
    for (const term of String(q.search).trim().split(/\s+/).filter(Boolean).slice(0, 8)) {
      const like = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      where.push(`(${SEARCH_FIELDS.map((f) => `${f} LIKE ? ESCAPE '\\'`).join(" OR ")})`);
      params.push(...SEARCH_FIELDS.map(() => like));
    }
  }
  return { whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "", params };
}

function orderSql(ordering) {
  const field = String(ordering || "").replace(/^-/, "");
  if (!ORDERING[field]) return "l.created_at DESC";
  return `${ORDERING[field]} ${String(ordering).startsWith("-") ? "DESC" : "ASC"}`;
}

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function getStaffUser(id) {
  const rows = await query("SELECT id, username, first_name, last_name FROM auth_user WHERE id = ? AND is_staff = 1", [
    Number(id) || 0,
  ]);
  return rows[0] || null;
}

const userName = (u) => `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username;

/** Validates the CRM fields shared by create and update. */
async function validateCrmFields(body, errors) {
  const data = {};
  if (body.status !== undefined) {
    if (!(body.status in STATUSES)) errors.status = [`"${body.status}" is not a valid choice.`];
    data.status = body.status;
  }
  if (body.priority !== undefined) {
    if (!PRIORITIES.includes(body.priority)) errors.priority = [`"${body.priority}" is not a valid choice.`];
    data.priority = body.priority;
  }
  if (body.source !== undefined) {
    if (!(body.source in SOURCES)) errors.source = [`"${body.source}" is not a valid choice.`];
    data.source = body.source;
  }
  if (body.deal_value !== undefined) {
    if (body.deal_value === null || body.deal_value === "") {
      data.deal_value = null;
    } else {
      const value = Number(body.deal_value);
      if (!Number.isFinite(value) || value < 0 || value >= 1e10) errors.deal_value = ["Enter a valid amount."];
      data.deal_value = value;
    }
  }
  if (body.tags !== undefined) data.tags = normalizeTags(body.tags);
  if (body.lost_reason !== undefined) data.lost_reason = String(body.lost_reason ?? "").trim().slice(0, 255);
  if (body.notes !== undefined) {
    if (typeof body.notes !== "string") errors.notes = ["Not a valid string."];
    data.notes = body.notes;
  }
  if (body.owner_id !== undefined) {
    if (body.owner_id === null || body.owner_id === "") {
      data.owner_id = null;
    } else if (!(await getStaffUser(body.owner_id))) {
      errors.owner_id = ["Unknown team member."];
    } else {
      data.owner_id = Number(body.owner_id);
    }
  }
  return data;
}

// GET /api/leads/?page=&page_size=&search=&status=&interest=&source=&priority=&owner=&tag=&created_from=&created_to=&stale=&overdue=&ordering=
router.get("/", async (c) => {
  const q = c.req.query();
  const { whereSql, params } = buildFilters(q, c.get("user"));
  const pageSize = Math.min(100, Math.max(1, Number(q.page_size) || DEFAULT_PAGE_SIZE));

  const [{ count }] = await query(`SELECT COUNT(*) AS count FROM ${LEAD_TABLE} l ${whereSql}`, params);
  const page = q.page ? Number(q.page) : 1;
  const lastPage = Math.max(1, Math.ceil(count / pageSize));
  if (!Number.isInteger(page) || page < 1 || page > lastPage) {
    return c.json({ detail: "Invalid page." }, 404);
  }

  const rows = await query(
    `${LEAD_SELECT} ${whereSql} ORDER BY ${orderSql(q.ordering)}, l.id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize],
  );

  const pageUrl = (n) => {
    const url = new URL(c.req.url);
    url.searchParams.set("page", n);
    return url.toString();
  };
  return c.json({
    count,
    next: page < lastPage ? pageUrl(page + 1) : null,
    previous: page > 1 ? pageUrl(page - 1) : null,
    results: rows.map(toManage),
  });
});

// POST /api/leads/ — add a lead by hand (phone call, referral, event...).
router.post("/", async (c) => {
  const body = c.get("body");
  const user = c.get("user");
  const { data, errors: contactErrors } = validateSubmission(body, { messageRequired: false });
  const errors = { ...contactErrors };
  const crm = await validateCrmFields({ source: "other", ...body }, errors);
  if (Object.keys(errors).length) return c.json(errors, 400);

  const { source, status, notes, ...extra } = crm;
  const lead = await createLead(data, { source, userId: user.id, extra: { ...extra, notes: notes ?? "" } });
  if (status && status !== "new") {
    await query(`UPDATE ${LEAD_TABLE} SET status = ? WHERE id = ?`, [status, lead.id]);
  }
  if (body.send_emails === true) {
    c.executionCtx.waitUntil(sendLeadEmails(lead).catch((err) => console.error("Lead email dispatch failed", err)));
  }
  return c.json(toManage(await getLead(lead.id)), 201);
});

// GET /api/leads/stats/ — counts per status, for the dashboard header.
router.get("/stats", async (c) => {
  const rows = await query(`SELECT status, COUNT(*) AS n FROM ${LEAD_TABLE} GROUP BY status`);
  const stats = { total: 0, ...Object.fromEntries(Object.keys(STATUSES).map((s) => [s, 0])) };
  for (const { status, n } of rows) {
    stats.total += n;
    if (status in stats) stats[status] = n;
  }
  return c.json(stats);
});

// GET /api/leads/interests/ — distinct interest values, for the filter dropdown.
router.get("/interests", async (c) => {
  const rows = await query(`SELECT DISTINCT interest FROM ${LEAD_TABLE} WHERE interest <> '' ORDER BY interest`);
  return c.json(rows.map((r) => r.interest));
});

// GET /api/leads/tags/ — tags in use with counts.
router.get("/tags", async (c) => {
  const rows = await query(`SELECT tags FROM ${LEAD_TABLE} WHERE tags <> ''`);
  const counts = {};
  for (const { tags } of rows) for (const tag of tags.split(",")) counts[tag] = (counts[tag] || 0) + 1;
  return c.json(
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag, count]) => ({ tag, count })),
  );
});

// GET /api/leads/board/ — pipeline columns (same filters as the list, minus status).
router.get("/board", async (c) => {
  const { whereSql, params } = buildFilters(c.req.query(), c.get("user"), { skipStatus: true });
  const limit = 100;
  const columns = [];
  for (const status of Object.keys(STATUSES)) {
    const statusWhere = whereSql ? `${whereSql} AND l.status = ?` : "WHERE l.status = ?";
    const [{ count, value }] = await query(
      `SELECT COUNT(*) AS count, COALESCE(SUM(l.deal_value), 0) AS value FROM ${LEAD_TABLE} l ${statusWhere}`,
      [...params, status],
    );
    const rows = await query(
      `${LEAD_SELECT} ${statusWhere} ORDER BY ${fieldOrder("l.priority", ["high", "medium", "low"])}, l.created_at DESC LIMIT ?`,
      [...params, status, limit],
    );
    columns.push({ status, label: STATUSES[status], count, value: Number(value), leads: rows.map(toManage) });
  }
  return c.json({ columns });
});

// GET /api/leads/export.csv — every lead matching the filters, as CSV.
router.get("/export.csv", async (c) => {
  const q = c.req.query();
  const { whereSql, params } = buildFilters(q, c.get("user"));
  const rows = (await query(`${LEAD_SELECT} ${whereSql} ORDER BY ${orderSql(q.ordering)}, l.id DESC`, params)).map(toManage);
  const columns = [
    ["id", (l) => l.id],
    ["created_at", (l) => l.created_at?.toISOString()],
    ["name", (l) => l.name],
    ["email", (l) => l.email],
    ["phone", (l) => l.phone],
    ["company", (l) => l.company],
    ["status", (l) => l.status_display],
    ["priority", (l) => l.priority],
    ["score", (l) => l.score],
    ["owner", (l) => l.owner?.name],
    ["deal_value", (l) => l.deal_value],
    ["source", (l) => l.source_display],
    ["interest", (l) => l.interest],
    ["timeline", (l) => l.timeline],
    ["tags", (l) => l.tags.join(", ")],
    ["project_description", (l) => l.project_description],
    ["message", (l) => l.message],
    ["lost_reason", (l) => l.lost_reason],
    ["utm_source", (l) => l.utm_source],
    ["utm_medium", (l) => l.utm_medium],
    ["utm_campaign", (l) => l.utm_campaign],
    ["referrer", (l) => l.referrer],
    ["last_activity_at", (l) => l.last_activity_at?.toISOString()],
  ];
  const cell = (value) => {
    let text = value == null ? "" : String(value);
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`; // block spreadsheet formula injection
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = [columns.map(([h]) => h).join(","), ...rows.map((l) => columns.map(([, get]) => cell(get(l))).join(","))].join(
    "\r\n",
  );
  const stamp = new Date().toISOString().slice(0, 10);
  return c.body(`﻿${csv}`, 200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="encode-leads-${stamp}.csv"`,
  });
});

// POST /api/leads/bulk/ — { ids, action: status|owner|priority|add_tag|delete, value }
router.post("/bulk", async (c) => {
  const { ids, action, value } = c.get("body");
  const user = c.get("user");
  const leadIds = [...new Set((Array.isArray(ids) ? ids : []).map(parseId).filter(Boolean))].slice(0, 500);
  if (!leadIds.length) return c.json({ detail: "Select at least one lead." }, 400);
  const idChunks = chunk(leadIds, MAX_PARAMS);
  const inIds = (part) => part.map(() => "?").join(", ");
  const existing = [];
  for (const part of idChunks) {
    existing.push(...(await query(`SELECT id, status, owner_id, tags FROM ${LEAD_TABLE} WHERE id IN (${inIds(part)})`, part)));
  }

  if (action === "delete") {
    await batch(idChunks.map((part) => prepare(`DELETE FROM ${LEAD_TABLE} WHERE id IN (${inIds(part)})`, part)));
    return c.json({ updated: existing.length });
  }

  // Updates and timeline entries are batched, so a bulk edit costs a few D1
  // round trips instead of several queries per lead.
  const statements = [];
  const errors = {};
  const field = { status: "status", owner: "owner_id", priority: "priority" }[action];
  if (field) {
    const data = await validateCrmFields({ [field]: value }, errors);
    if (Object.keys(errors).length) return c.json(errors, 400);
    const newValue = data[field];
    let ownerName = "nobody";
    if (field === "owner_id" && newValue) ownerName = userName(await getStaffUser(newValue));
    for (const lead of existing) {
      if (lead[field] === newValue) continue;
      const extra = field === "status" ? `, status_changed_at = ${NOW}` : "";
      statements.push(
        prepare(`UPDATE ${LEAD_TABLE} SET ${field} = ?, updated_at = ${NOW}${extra} WHERE id = ?`, [newValue, lead.id]),
      );
      if (field === "status") {
        statements.push(...activityStatements(lead.id, user.id, "status_change", "", { from: lead.status, to: newValue }));
      } else if (field === "owner_id") {
        statements.push(
          ...activityStatements(lead.id, user.id, "assignment", `Assigned to ${ownerName}`, { owner_id: newValue }),
        );
      } else {
        statements.push(
          ...activityStatements(lead.id, user.id, "field_update", `Priority set to ${newValue}`, { fields: ["priority"] }),
        );
      }
    }
  } else if (action === "add_tag") {
    const tag = normalizeTags(value);
    if (!tag || tag.includes(",")) return c.json({ detail: "Enter a single tag." }, 400);
    for (const lead of existing) {
      const tags = normalizeTags([...(lead.tags ? lead.tags.split(",") : []), tag]);
      if (tags === lead.tags) continue;
      statements.push(prepare(`UPDATE ${LEAD_TABLE} SET tags = ?, updated_at = ${NOW} WHERE id = ?`, [tags, lead.id]));
      statements.push(...activityStatements(lead.id, user.id, "field_update", `Tagged "${tag}"`, { fields: ["tags"] }));
    }
  } else {
    return c.json({ detail: "Unknown bulk action." }, 400);
  }
  for (const part of chunk(statements, 150)) await batch(part);
  return c.json({ updated: existing.length });
});

// GET /api/leads/:id/
router.get("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  const lead = id && (await getLead(id));
  if (!lead) return c.json(NOT_FOUND, 404);
  return c.json(toManage(lead));
});

// PATCH|PUT /api/leads/:id/ — every change is recorded on the lead's timeline.
async function updateLead(c) {
  const id = parseId(c.req.param("id"));
  const lead = id && (await getLead(id));
  if (!lead) return c.json(NOT_FOUND, 404);
  const body = c.get("body");
  const user = c.get("user");

  const { data: contact, errors: contactErrors } = validateSubmission(body, { partial: true });
  const errors = { ...contactErrors };
  const crm = await validateCrmFields(body, errors);
  if (Object.keys(errors).length) return c.json(errors, 400);

  const changes = Object.fromEntries(
    Object.entries({ ...contact, ...crm }).filter(([key, value]) => {
      const current = key === "deal_value" && lead[key] != null ? Number(lead[key]) : lead[key];
      return value !== current;
    }),
  );
  if (Object.keys(changes).length) {
    const sets = Object.keys(changes).map((key) => `${key} = ?`);
    if ("status" in changes) {
      sets.push(`status_changed_at = ${NOW}`);
      if (lead.status === "new") sets.push(`first_contacted_at = COALESCE(first_contacted_at, ${NOW})`);
    }
    const statements = [
      prepare(`UPDATE ${LEAD_TABLE} SET ${sets.join(", ")}, updated_at = ${NOW} WHERE id = ?`, [
        ...Object.values(changes),
        id,
      ]),
    ];

    const { status, owner_id: ownerId, notes, ...rest } = changes;
    if (status !== undefined) {
      const reason = status === "lost" && changes.lost_reason ? changes.lost_reason : "";
      statements.push(...activityStatements(id, user.id, "status_change", reason, { from: lead.status, to: status }));
      delete rest.lost_reason;
    }
    if (ownerId !== undefined) {
      const owner = ownerId ? await getStaffUser(ownerId) : null;
      statements.push(
        ...activityStatements(id, user.id, "assignment", `Assigned to ${owner ? userName(owner) : "nobody"}`, {
          owner_id: ownerId,
        }),
      );
    }
    if (notes !== undefined) {
      statements.push(...activityStatements(id, user.id, "field_update", "Updated the lead summary", { fields: ["notes"] }));
    }
    const fields = Object.keys(rest);
    if (fields.length) {
      statements.push(
        ...activityStatements(id, user.id, "field_update", `Updated ${fields.join(", ").replace(/_/g, " ")}`, { fields }),
      );
    }
    await batch(statements);
  }
  return c.json(toManage(await getLead(id)));
}
router.patch("/:id", updateLead);
router.put("/:id", updateLead);

// DELETE /api/leads/:id/
router.delete("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  const result = id ? await query(`DELETE FROM ${LEAD_TABLE} WHERE id = ?`, [id]) : { affectedRows: 0 };
  if (!result.affectedRows) return c.json(NOT_FOUND, 404);
  return c.body(null, 204);
});

// GET /api/leads/:id/activities/ — the lead's timeline, newest first.
router.get("/:id/activities", async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id || !(await getLead(id))) return c.json(NOT_FOUND, 404);
  const rows = await query(
    `SELECT a.*, ${userNameSql("u")} AS user_name
     FROM lead_activity a LEFT JOIN auth_user u ON u.id = a.user_id
     WHERE a.lead_id = ? ORDER BY a.created_at DESC, a.id DESC`,
    [id],
  );
  return c.json(
    rows.map((a) => ({
      id: a.id,
      type: a.type,
      body: a.body,
      meta: a.meta,
      user: a.user_id ? { id: a.user_id, name: a.user_name } : null,
      created_at: a.created_at,
    })),
  );
});

// POST /api/leads/:id/activities/ — log a note, call, email or meeting.
router.post("/:id/activities", async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id || !(await getLead(id))) return c.json(NOT_FOUND, 404);
  const type = c.get("body").type || "note";
  const body = String(c.get("body").body ?? "").trim();
  if (!MANUAL_ACTIVITY_TYPES.includes(type)) return c.json({ type: [`"${type}" is not a valid choice.`] }, 400);
  if (!body) return c.json({ body: ["This field may not be blank."] }, 400);
  if (body.length > 10000) return c.json({ body: ["That note is too long."] }, 400);
  await logActivity(id, c.get("user").id, type, body);
  return c.json({ ok: true }, 201);
});

// DELETE /api/leads/:id/activities/:activityId/ — authors (or superusers) can remove their own entries.
router.delete("/:id/activities/:activityId", async (c) => {
  const user = c.get("user");
  const rows = await query("SELECT * FROM lead_activity WHERE id = ? AND lead_id = ?", [
    parseId(c.req.param("activityId")),
    parseId(c.req.param("id")),
  ]);
  const activity = rows[0];
  if (!activity) return c.json({ detail: "Not found." }, 404);
  if (!MANUAL_ACTIVITY_TYPES.includes(activity.type)) {
    return c.json({ detail: "System entries can't be deleted." }, 400);
  }
  if (activity.user_id !== user.id && !user.is_superuser) {
    return c.json({ detail: "You can only delete your own entries." }, 403);
  }
  await query("DELETE FROM lead_activity WHERE id = ?", [activity.id]);
  return c.body(null, 204);
});

// GET /api/leads/:id/related/ — other leads from the same person (email or phone).
router.get("/:id/related", async (c) => {
  const id = parseId(c.req.param("id"));
  const lead = id && (await getLead(id));
  if (!lead) return c.json(NOT_FOUND, 404);
  const rows = await query(
    `${LEAD_SELECT} WHERE l.id <> ? AND (l.email = ? OR (? <> '' AND l.phone = ?)) ORDER BY l.created_at DESC LIMIT 20`,
    [id, lead.email, lead.phone, lead.phone],
  );
  return c.json(rows.map(toManage));
});

// POST /api/leads/:id/resend_emails/ — retry both emails, e.g. after an SMTP outage.
router.post("/:id/resend_emails", async (c) => {
  const id = parseId(c.req.param("id"));
  const lead = id && (await getLead(id));
  if (!lead) return c.json(NOT_FOUND, 404);

  const confirmationSent = await sendLeadConfirmationEmail(lead);
  const adminNotificationSent = await sendLeadAdminNotificationEmail(lead);
  return c.json({
    confirmation_sent: confirmationSent,
    admin_notification_sent: adminNotificationSent,
    lead: toManage(await getLead(id)),
  });
});

export default router;
