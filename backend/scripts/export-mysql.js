// One-off: copy leads, staff, activities and tasks from the old MySQL database
// into D1. Reads the MySQL connection from backend/.env (the same DB_* variables
// as before) and writes backend/d1-import.sql, then (with --apply) loads it.
//
//   npm run export-mysql                      # just write d1-import.sql
//   npm run export-mysql -- --apply           # also load it into the local dev D1
//   npm run export-mysql -- --apply --remote  # also load it into production D1
//
// Run it against an empty D1 database (fresh migrations). Staff passwords copied
// from Django use 1,000,000 PBKDF2 iterations, which Workers can't verify, so
// reset each one afterwards: `npm run staff -- password <username> --remote`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import mysql from "mysql2/promise";
import { d1, sqlValue } from "./d1.js";

const BACKEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(BACKEND, "d1-import.sql");
const { values: flags } = parseArgs({
  options: { apply: { type: "boolean", default: false }, remote: { type: "boolean", default: false } },
});

try {
  process.loadEnvFile(path.join(BACKEND, ".env"));
} catch {
  // rely on the environment
}
const env = process.env;
const conn = await mysql.createConnection({
  host: env.DB_HOST || "127.0.0.1",
  port: Number(env.DB_PORT || 3306),
  user: env.DB_USER || "root",
  password: env.DB_PASSWORD || "",
  database: env.DB_NAME || "encodestudio",
  ssl: /^true$/i.test(env.DB_SSL || "") ? {} : undefined,
  timezone: "Z",
});

// Tables in foreign-key order, with the columns D1 has.
const TABLES = {
  auth_user: ["id", "password", "last_login", "is_superuser", "username", "first_name", "last_name", "email", "is_staff", "is_active", "date_joined"],
  contact_lead: [
    "id", "name", "company", "email", "phone", "interest", "project_description", "timeline", "message", "status", "notes",
    "confirmation_email_sent_at", "admin_notification_sent_at", "created_at", "updated_at", "source", "utm_source",
    "utm_medium", "utm_campaign", "referrer", "landing_page", "owner_id", "priority", "deal_value", "tags", "lost_reason",
    "status_changed_at", "first_contacted_at", "last_activity_at",
  ],
  lead_activity: ["id", "lead_id", "user_id", "type", "body", "meta", "created_at"],
  lead_task: ["id", "lead_id", "title", "notes", "due_at", "assigned_to", "created_by", "completed_at", "created_at"],
};

const literal = (value, column) => {
  if (value instanceof Date) return sqlValue(value.toISOString());
  if (Buffer.isBuffer(value)) return sqlValue(value.toString("utf8"));
  if (value !== null && typeof value === "object") return sqlValue(JSON.stringify(value));
  if (column === "deal_value" && value != null) return String(Number(value)); // DECIMAL comes back as a string
  return sqlValue(value);
};

const lines = ["PRAGMA defer_foreign_keys = true;"];
const counts = {};
try {
  for (const [table, wanted] of Object.entries(TABLES)) {
    const [existing] = await conn.query(
      "SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
      [table],
    );
    const have = new Set(existing.map((c) => c.name));
    if (!have.size) {
      counts[table] = "missing (skipped)";
      continue;
    }
    const columns = wanted.filter((c) => have.has(c));
    const [rows] = await conn.query(`SELECT ${columns.join(", ")} FROM ${table} ORDER BY id`);
    for (const row of rows) {
      lines.push(`INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map((c) => literal(row[c], c)).join(", ")});`);
    }
    counts[table] = rows.length;
  }
} finally {
  await conn.end();
}

// Same backfill the MySQL CRM migration did, for data that predates it.
const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";
lines.push(
  `UPDATE contact_lead SET status_changed_at = COALESCE(status_changed_at, updated_at), last_activity_at = COALESCE(last_activity_at, updated_at);`,
  `INSERT INTO lead_activity (lead_id, user_id, type, body, meta, created_at)
   SELECT l.id, NULL, 'created', 'Lead submitted via the website contact form', NULL, l.created_at FROM contact_lead l
   WHERE NOT EXISTS (SELECT 1 FROM lead_activity a WHERE a.lead_id = l.id AND a.type = 'created');`,
  `INSERT INTO lead_activity (lead_id, user_id, type, body, meta, created_at)
   SELECT l.id, NULL, 'note', l.notes, '{"migrated":true}', COALESCE(l.updated_at, ${NOW}) FROM contact_lead l
   WHERE l.notes <> '' AND NOT EXISTS (SELECT 1 FROM lead_activity a WHERE a.lead_id = l.id AND a.type = 'note');`,
);

fs.writeFileSync(OUT, lines.join("\n") + "\n");
console.table(counts);
console.log(`Wrote ${path.relative(process.cwd(), OUT)}`);

if (flags.apply) {
  console.log(`Loading into the ${flags.remote ? "PRODUCTION (remote)" : "local dev"} D1 database...`);
  d1(OUT, { remote: flags.remote, file: true });
  console.log("Done. Reset staff passwords with `npm run staff -- password <username>" + (flags.remote ? " --remote`." : "`."));
}
