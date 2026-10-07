import { query } from "./db.js";

// Table created by the original Django app (`contact.Lead`) — kept as-is so
// existing leads carry over untouched.
export const LEAD_TABLE = "contact_lead";

export const STATUSES = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  converted: "Converted",
  lost: "Lost",
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validates a contact-form body. Returns { data } or { errors } where errors
 *  mirrors the old DRF shape: { field: ["message"] }. */
export function validateSubmission(body) {
  const data = {};
  const errors = {};
  for (const [field, rule] of Object.entries(SUBMISSION_FIELDS)) {
    const raw = body?.[field];
    const value = raw == null ? "" : String(raw).trim();
    if (rule.required && !value) {
      errors[field] = ["This field may not be blank."];
    } else if (value.length > rule.max) {
      errors[field] = [`Ensure this field has no more than ${rule.max} characters.`];
    }
    data[field] = value;
  }
  if (!errors.email && !EMAIL_RE.test(data.email)) {
    errors.email = ["Enter a valid email address."];
  }
  return Object.keys(errors).length ? { errors } : { data };
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

/** Full shape used by the lead-manager portal. */
export function toManage(lead) {
  return {
    ...toPublic(lead),
    status: lead.status,
    status_display: STATUSES[lead.status] || lead.status,
    notes: lead.notes,
    confirmation_email_sent_at: lead.confirmation_email_sent_at,
    admin_notification_sent_at: lead.admin_notification_sent_at,
    updated_at: lead.updated_at,
  };
}

export async function createLead(data) {
  const result = await query(
    `INSERT INTO ${LEAD_TABLE}
       (name, company, email, phone, interest, project_description, timeline, message,
        status, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', '', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))`,
    [
      data.name,
      data.company,
      data.email,
      data.phone,
      data.interest,
      data.project_description,
      data.timeline,
      data.message,
    ],
  );
  return getLead(result.insertId);
}

export async function getLead(id) {
  const rows = await query(`SELECT * FROM ${LEAD_TABLE} WHERE id = ?`, [id]);
  return rows[0] || null;
}

export async function markEmailSent(id, column) {
  if (column !== "confirmation_email_sent_at" && column !== "admin_notification_sent_at") {
    throw new Error(`Unknown email column: ${column}`);
  }
  await query(`UPDATE ${LEAD_TABLE} SET ${column} = UTC_TIMESTAMP(6) WHERE id = ?`, [id]);
}
