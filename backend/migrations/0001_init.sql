-- Encode Studio schema for Cloudflare D1 (SQLite).
--
-- Same tables and columns the MySQL/Django version had, so `scripts/export-mysql.js`
-- can copy existing data across. Datetimes are UTC ISO-8601 strings
-- ("2026-10-11T13:56:39.645Z"), which sort and compare correctly as text.
-- Apply with `npm run db:migrate` (remote) or `npm run db:migrate:local`.

-- Lead-manager portal accounts. Passwords use Django's pbkdf2_sha256 format.
-- Manage with `npm run staff`.
CREATE TABLE auth_user (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  password      TEXT    NOT NULL,
  last_login    TEXT    NULL,
  is_superuser  INTEGER NOT NULL DEFAULT 0,
  username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  first_name    TEXT    NOT NULL DEFAULT '',
  last_name     TEXT    NOT NULL DEFAULT '',
  email         TEXT    NOT NULL DEFAULT '' COLLATE NOCASE,
  is_staff      INTEGER NOT NULL DEFAULT 0,
  is_active     INTEGER NOT NULL DEFAULT 1,
  date_joined   TEXT    NOT NULL
);

CREATE TABLE contact_lead (
  id                          INTEGER PRIMARY KEY AUTOINCREMENT,
  name                        TEXT    NOT NULL COLLATE NOCASE,
  company                     TEXT    NOT NULL DEFAULT '',
  email                       TEXT    NOT NULL COLLATE NOCASE,
  phone                       TEXT    NOT NULL DEFAULT '',
  interest                    TEXT    NOT NULL DEFAULT '',
  project_description         TEXT    NOT NULL DEFAULT '',
  timeline                    TEXT    NOT NULL DEFAULT '',
  message                     TEXT    NOT NULL,
  status                      TEXT    NOT NULL DEFAULT 'new',
  notes                       TEXT    NOT NULL DEFAULT '',
  confirmation_email_sent_at  TEXT    NULL,
  admin_notification_sent_at  TEXT    NULL,
  created_at                  TEXT    NOT NULL,
  updated_at                  TEXT    NOT NULL,
  source                      TEXT    NOT NULL DEFAULT 'website',
  utm_source                  TEXT    NOT NULL DEFAULT '',
  utm_medium                  TEXT    NOT NULL DEFAULT '',
  utm_campaign                TEXT    NOT NULL DEFAULT '',
  referrer                    TEXT    NOT NULL DEFAULT '',
  landing_page                TEXT    NOT NULL DEFAULT '',
  owner_id                    INTEGER NULL,
  priority                    TEXT    NOT NULL DEFAULT 'medium',
  deal_value                  REAL    NULL,
  tags                        TEXT    NOT NULL DEFAULT '',
  lost_reason                 TEXT    NOT NULL DEFAULT '',
  status_changed_at           TEXT    NULL,
  first_contacted_at          TEXT    NULL,
  last_activity_at            TEXT    NULL
);
CREATE INDEX idx_lead_status ON contact_lead (status);
CREATE INDEX idx_lead_created ON contact_lead (created_at);
CREATE INDEX idx_lead_owner ON contact_lead (owner_id);
CREATE INDEX idx_lead_email ON contact_lead (email);

CREATE TABLE lead_activity (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id     INTEGER NOT NULL REFERENCES contact_lead (id) ON DELETE CASCADE,
  user_id     INTEGER NULL REFERENCES auth_user (id) ON DELETE SET NULL,
  type        TEXT    NOT NULL,
  body        TEXT    NOT NULL,
  meta        TEXT    NULL,
  created_at  TEXT    NOT NULL
);
CREATE INDEX idx_activity_lead ON lead_activity (lead_id, created_at);
CREATE INDEX idx_activity_created ON lead_activity (created_at);

CREATE TABLE lead_task (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id       INTEGER NOT NULL REFERENCES contact_lead (id) ON DELETE CASCADE,
  title         TEXT    NOT NULL,
  notes         TEXT    NOT NULL DEFAULT '',
  due_at        TEXT    NULL,
  assigned_to   INTEGER NULL REFERENCES auth_user (id) ON DELETE SET NULL,
  created_by    INTEGER NULL REFERENCES auth_user (id) ON DELETE SET NULL,
  completed_at  TEXT    NULL,
  created_at    TEXT    NOT NULL
);
CREATE INDEX idx_task_due ON lead_task (completed_at, due_at);
CREATE INDEX idx_task_lead ON lead_task (lead_id);

-- Per-IP hit counters for the anonymous endpoints (contact form, login).
CREATE TABLE rate_limit (
  key         TEXT    PRIMARY KEY,
  hits        INTEGER NOT NULL,
  expires_at  TEXT    NOT NULL
);
