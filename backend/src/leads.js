import { query } from "./db.js";

// Table created by the original Django app (`contact.Lead`), extended by
// migration 0002 with CRM fields. Existing leads carry over untouched.
export const LEAD_TABLE = "contact_lead";

export const STATUSES = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  converted: "Converted",
  lost: "Lost",
};
export const OPEN_STATUSES = ["new", "contacted", "qualified"];
export const PRIORITIES = ["low", "medium", "high"];
export const SOURCES = {
  website: "Website",
  referral: "Referral",
  phone: "Phone call",
  email: "Email",
  social: "Social media",
  event: "Event",
  walk_in: "Walk-in",
  other: "Other",
};

// Fields a website visitor may submit, with their column limits.
const SUBMISSION_FIELDS = {
  name: { max: 150, required: true },
  company: { max: 150 },
  email: { max: 254, required: true },
  phone: { max: 30 },
  interest: { max: 100 },
  project_description: { max: 500 },
  timeline: { max: 100 },
  message: { max: 10000, required: true },
};
// Attribution captured silently by the contact form. Truncated, never rejected.
const TRACKING_FIELDS = {
  utm_source: 100,
  utm_medium: 100,
  utm_campaign: 100,
  referrer: 500,
  landing_page: 500,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validates a lead body. Returns { data } or { errors } where errors mirror
 *  the old DRF shape: { field: ["message"] }. `partial` skips required checks
 *  for fields that are absent (PATCH). */
export function validateSubmission(body, { partial = false, messageRequired = true } = {}) {
  const data = {};
  const errors = {};
  for (const [field, rule] of Object.entries(SUBMISSION_FIELDS)) {
    if (partial && body?.[field] === undefined) continue;
    const raw = body?.[field];
    const value = raw == null ? "" : String(raw).trim();
    const required = rule.required && (field !== "message" || messageRequired);
    if (required && !value) {
      errors[field] = ["This field may not be blank."];
    } else if (value.length > rule.max) {
      errors[field] = [`Ensure this field has no more than ${rule.max} characters.`];
    }
    data[field] = value;
  }
  if (data.email !== undefined && !errors.email && data.email && !EMAIL_RE.test(data.email)) {
    errors.email = ["Enter a valid email address."];
  }
  return Object.keys(errors).length ? { errors } : { data };
}

export function trackingFields(body) {
  return Object.fromEntries(
    Object.entries(TRACKING_FIELDS).map(([field, max]) => [field, String(body?.[field] ?? "").trim().slice(0, max)]),
  );
}

export function normalizeTags(value) {
  const list = Array.isArray(value) ? value : String(value ?? "").split(",");
  const tags = [...new Set(list.map((t) => String(t).trim().toLowerCase().replace(/\s+/g, "-")).filter(Boolean))];
  return tags.join(",").slice(0, 500);
}

/** Simple 0–100 lead score from fit, intent and engagement signals. */
export function scoreLead(lead) {
  const factors = [];
  const add = (points, label) => points && factors.push({ points, label });
  add(lead.phone ? 10 : 0, "Phone number provided");
  add(lead.company ? 10 : 0, "Company provided");
  add((lead.project_description || "").length > 20 ? 10 : 0, "Described the project");
  add((lead.message || "").length > 150 ? 10 : 0, "Detailed message");
  const timeline = (lead.timeline || "").toLowerCase();
  add(/asap|urgent|immediate|week|1 month|this month/.test(timeline) ? 15 : timeline ? 5 : 0, "Timeline given");
  add(lead.deal_value ? 15 : 0, "Deal value estimated");
  add({ high: 15, medium: 5 }[lead.priority] || 0, "Priority");
  add({ contacted: 5, qualified: 15, converted: 15 }[lead.status] || 0, "Pipeline stage");
  add(lead.source === "referral" ? 10 : 0, "Referral");
  const score = Math.min(100, factors.reduce((sum, f) => sum + f.points, 0));
  return { score, factors };
}

/** Public shape returned to the contact form. */
export function toPublic(lead) {
  return {
    id: lead.id,
    name: lead.name,
    company: lead.company,
    email: lead.email,
    phone: lead.phone,
    interest: lead.interest,
    project_description: lead.project_description,
    timeline: lead.timeline,
    message: lead.message,
    created_at: lead.created_at,
  };
}

/** Full shape used by the lead-manager portal. Expects the owner join columns
 *  from LEAD_SELECT. */
export function toManage(lead) {
  const { score, factors } = scoreLead(lead);
  return {
    ...toPublic(lead),
    status: lead.status,
    status_display: STATUSES[lead.status] || lead.status,
    notes: lead.notes,
    source: lead.source,
    source_display: SOURCES[lead.source] || lead.source,
    utm_source: lead.utm_source,
    utm_medium: lead.utm_medium,
    utm_campaign: lead.utm_campaign,
    referrer: lead.referrer,
    landing_page: lead.landing_page,
    owner: lead.owner_id ? { id: lead.owner_id, name: lead.owner_name } : null,
    priority: lead.priority,
    deal_value: lead.deal_value == null ? null : Number(lead.deal_value),
    tags: lead.tags ? lead.tags.split(",") : [],
    lost_reason: lead.lost_reason,
    score,
    score_factors: factors,
    open_tasks: Number(lead.open_tasks ?? 0),
    next_task_due_at: lead.next_task_due_at ?? null,
    status_changed_at: lead.status_changed_at,
    first_contacted_at: lead.first_contacted_at,
    last_activity_at: lead.last_activity_at,
    confirmation_email_sent_at: lead.confirmation_email_sent_at,
    admin_notification_sent_at: lead.admin_notification_sent_at,
    updated_at: lead.updated_at,
  };
}

const OWNER_NAME_SQL = `NULLIF(TRIM(CONCAT(o.first_name, ' ', o.last_name)), '')`;
export const LEAD_SELECT = `
  SELECT l.*, COALESCE(${OWNER_NAME_SQL}, o.username) AS owner_name,
         (SELECT COUNT(*) FROM lead_task t WHERE t.lead_id = l.id AND t.completed_at IS NULL) AS open_tasks,
         (SELECT MIN(t.due_at) FROM lead_task t WHERE t.lead_id = l.id AND t.completed_at IS NULL) AS next_task_due_at
  FROM ${LEAD_TABLE} l
  LEFT JOIN auth_user o ON o.id = l.owner_id`;

export async function getLead(id) {
  const rows = await query(`${LEAD_SELECT} WHERE l.id = ?`, [id]);
  return rows[0] || null;
}

export async function createLead(data, { source = "website", userId = null, extra = {} } = {}) {
  const fields = {
    name: data.name,
    company: data.company ?? "",
    email: data.email,
    phone: data.phone ?? "",
    interest: data.interest ?? "",
    project_description: data.project_description ?? "",
    timeline: data.timeline ?? "",
    message: data.message ?? "",
    notes: "",
    status: "new",
    source,
    ...extra,
  };
  const columns = Object.keys(fields);
  const result = await query(
    `INSERT INTO ${LEAD_TABLE} (${columns.join(", ")}, created_at, updated_at, status_changed_at, last_activity_at)
     VALUES (${columns.map(() => "?").join(", ")}, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6), UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))`,
    Object.values(fields),
  );
  const body =
    source === "website" ? "Lead submitted via the website contact form" : `Lead added manually (${SOURCES[source] || source})`;
  await logActivity(result.insertId, userId, "created", body);
  return getLead(result.insertId);
}

export async function markEmailSent(id, column) {
  if (column !== "confirmation_email_sent_at" && column !== "admin_notification_sent_at") {
    throw new Error(`Unknown email column: ${column}`);
  }
  await query(`UPDATE ${LEAD_TABLE} SET ${column} = UTC_TIMESTAMP(6) WHERE id = ?`, [id]);
}

// Activity types that count as reaching out to the lead.
export const CONTACT_ACTIVITY_TYPES = ["call", "email", "meeting"];

export async function logActivity(leadId, userId, type, body = "", meta = null) {
  await query(
    `INSERT INTO lead_activity (lead_id, user_id, type, body, meta, created_at)
     VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(6))`,
    [leadId, userId, type, body, meta ? JSON.stringify(meta) : null],
  );
  if (type !== "email_sent") {
    await query(`UPDATE ${LEAD_TABLE} SET last_activity_at = UTC_TIMESTAMP(6) WHERE id = ?`, [leadId]);
  }
  if (CONTACT_ACTIVITY_TYPES.includes(type)) {
    await query(
      `UPDATE ${LEAD_TABLE} SET first_contacted_at = COALESCE(first_contacted_at, UTC_TIMESTAMP(6)) WHERE id = ?`,
      [leadId],
    );
  }
}
