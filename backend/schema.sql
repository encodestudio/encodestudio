-- Encode Studio schema. Safe to run repeatedly (`npm run db:init`).
--
-- Table and column definitions match what the original Django app created,
-- so an existing database is used as-is (nothing here alters it) and a fresh
-- one ends up identical.

CREATE TABLE IF NOT EXISTS contact_lead (
  id                          BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name                        VARCHAR(150) NOT NULL,
  company                     VARCHAR(150) NOT NULL DEFAULT '',
  email                       VARCHAR(254) NOT NULL,
  phone                       VARCHAR(30)  NOT NULL DEFAULT '',
  interest                    VARCHAR(100) NOT NULL DEFAULT '',
  project_description         VARCHAR(500) NOT NULL DEFAULT '',
  timeline                    VARCHAR(100) NOT NULL DEFAULT '',
  message                     LONGTEXT     NOT NULL,
  status                      VARCHAR(20)  NOT NULL DEFAULT 'new',
  notes                       LONGTEXT     NOT NULL,
  confirmation_email_sent_at  DATETIME(6)  NULL,
  admin_notification_sent_at  DATETIME(6)  NULL,
  created_at                  DATETIME(6)  NOT NULL,
  updated_at                  DATETIME(6)  NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lead-manager portal accounts. Passwords use Django's pbkdf2_sha256 format.
-- Manage with `npm run staff`.
CREATE TABLE IF NOT EXISTS auth_user (
  id            INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  password      VARCHAR(128) NOT NULL,
  last_login    DATETIME(6)  NULL,
  is_superuser  TINYINT(1)   NOT NULL DEFAULT 0,
  username      VARCHAR(150) NOT NULL UNIQUE,
  first_name    VARCHAR(150) NOT NULL DEFAULT '',
  last_name     VARCHAR(150) NOT NULL DEFAULT '',
  email         VARCHAR(254) NOT NULL DEFAULT '',
  is_staff      TINYINT(1)   NOT NULL DEFAULT 0,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  date_joined   DATETIME(6)  NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
