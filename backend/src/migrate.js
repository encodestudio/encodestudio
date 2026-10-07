import fs from "node:fs/promises";
import path from "node:path";
import { ROOT_DIR } from "./config.js";
import { pool } from "./db.js";

// Ordered, run-once schema migrations. Applied ones are recorded in
// `app_migrations`. Every step is also written to be safe to re-run, because
// MySQL DDL can't be rolled back if a migration fails halfway.
const MIGRATIONS = [
  {
    name: "0001_base_tables",
    async up(conn) {
      const sql = await fs.readFile(path.join(ROOT_DIR, "schema.sql"), "utf8");
      for (const statement of splitSql(sql)) await conn.query(statement);
    },
  },
  {
    name: "0002_crm",
    async up(conn) {
      const columns = [
        ["source", "VARCHAR(30) NOT NULL DEFAULT 'website'"],
        ["utm_source", "VARCHAR(100) NOT NULL DEFAULT ''"],
        ["utm_medium", "VARCHAR(100) NOT NULL DEFAULT ''"],
        ["utm_campaign", "VARCHAR(100) NOT NULL DEFAULT ''"],
        ["referrer", "VARCHAR(500) NOT NULL DEFAULT ''"],
        ["landing_page", "VARCHAR(500) NOT NULL DEFAULT ''"],
        ["owner_id", "INT NULL"],
        ["priority", "VARCHAR(10) NOT NULL DEFAULT 'medium'"],
        ["deal_value", "DECIMAL(12,2) NULL"],
        ["tags", "VARCHAR(500) NOT NULL DEFAULT ''"],
        ["lost_reason", "VARCHAR(255) NOT NULL DEFAULT ''"],
        ["status_changed_at", "DATETIME(6) NULL"],
        ["first_contacted_at", "DATETIME(6) NULL"],
        ["last_activity_at", "DATETIME(6) NULL"],
      ];
      for (const [name, definition] of columns) {
        if (!(await hasColumn(conn, "contact_lead", name))) {
          await conn.query(`ALTER TABLE contact_lead ADD COLUMN ${name} ${definition}`);
        }
      }
      for (const [name, cols] of [
        ["idx_lead_status", "status"],
        ["idx_lead_created", "created_at"],
        ["idx_lead_owner", "owner_id"],
        ["idx_lead_email", "email"],
      ]) {
        if (!(await hasIndex(conn, "contact_lead", name))) {
          await conn.query(`CREATE INDEX ${name} ON contact_lead (${cols})`);
        }
      }

      await conn.query(`
        CREATE TABLE IF NOT EXISTS lead_activity (
          id          BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
          lead_id     BIGINT       NOT NULL,
          user_id     INT          NULL,
          type        VARCHAR(30)  NOT NULL,
          body        TEXT         NOT NULL,
          meta        JSON         NULL,
          created_at  DATETIME(6)  NOT NULL,
          KEY idx_activity_lead (lead_id, created_at),
          KEY idx_activity_created (created_at),
          CONSTRAINT fk_activity_lead FOREIGN KEY (lead_id) REFERENCES contact_lead (id) ON DELETE CASCADE,
          CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES auth_user (id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS lead_task (
          id            BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
          lead_id       BIGINT        NOT NULL,
          title         VARCHAR(255)  NOT NULL,
          notes         TEXT          NOT NULL,
          due_at        DATETIME(6)   NULL,
          assigned_to   INT           NULL,
          created_by    INT           NULL,
          completed_at  DATETIME(6)   NULL,
          created_at    DATETIME(6)   NOT NULL,
          KEY idx_task_due (completed_at, due_at),
          KEY idx_task_lead (lead_id),
          CONSTRAINT fk_task_lead FOREIGN KEY (lead_id) REFERENCES contact_lead (id) ON DELETE CASCADE,
          CONSTRAINT fk_task_assignee FOREIGN KEY (assigned_to) REFERENCES auth_user (id) ON DELETE SET NULL,
          CONSTRAINT fk_task_creator FOREIGN KEY (created_by) REFERENCES auth_user (id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

      // Backfill so existing leads have a timeline and sensible timestamps.
      await conn.query(
        `UPDATE contact_lead SET status_changed_at = COALESCE(status_changed_at, updated_at),
                                 last_activity_at = COALESCE(last_activity_at, updated_at)`,
      );
      await conn.query(`
        INSERT INTO lead_activity (lead_id, user_id, type, body, meta, created_at)
        SELECT l.id, NULL, 'created', 'Lead submitted via the website contact form', NULL, l.created_at
        FROM contact_lead l
        WHERE NOT EXISTS (SELECT 1 FROM lead_activity a WHERE a.lead_id = l.id AND a.type = 'created')`);
      await conn.query(`
        INSERT INTO lead_activity (lead_id, user_id, type, body, meta, created_at)
        SELECT l.id, NULL, 'note', l.notes, JSON_OBJECT('migrated', TRUE), l.updated_at
        FROM contact_lead l
        WHERE l.notes <> ''
          AND NOT EXISTS (SELECT 1 FROM lead_activity a WHERE a.lead_id = l.id AND a.type = 'note')`);
    },
  },
];

function splitSql(sql) {
  return sql
    .replace(/^\s*--.*$/gm, "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function hasColumn(conn, table, column) {
  const [rows] = await conn.query(
    "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [table, column],
  );
  return rows.length > 0;
}

async function hasIndex(conn, table, index) {
  const [rows] = await conn.query(
    "SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?",
    [table, index],
  );
  return rows.length > 0;
}

/** Applies pending migrations. Returns the names that were applied. */
export async function migrate() {
  const conn = await pool.getConnection();
  try {
    // Serialise concurrent starts (e.g. several app instances booting at once).
    await conn.query("SELECT GET_LOCK('encodestudio_migrate', 60)");
    await conn.query(`
      CREATE TABLE IF NOT EXISTS app_migrations (
        name        VARCHAR(100) NOT NULL PRIMARY KEY,
        applied_at  DATETIME(6)  NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    const [rows] = await conn.query("SELECT name FROM app_migrations");
    const done = new Set(rows.map((r) => r.name));

    const applied = [];
    for (const migration of MIGRATIONS) {
      if (done.has(migration.name)) continue;
      await migration.up(conn);
      await conn.query("INSERT INTO app_migrations (name, applied_at) VALUES (?, UTC_TIMESTAMP(6))", [migration.name]);
      applied.push(migration.name);
    }
    return applied;
  } finally {
    await conn.query("SELECT RELEASE_LOCK('encodestudio_migrate')").catch(() => {});
    conn.release();
  }
}
