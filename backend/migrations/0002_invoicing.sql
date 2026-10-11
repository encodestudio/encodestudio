-- Invoicing: GST invoices linked to leads, with line items and payments.
-- Money is stored in rupees as REAL, always rounded to 2 decimals by the API.

-- Business details printed on every invoice. Single row (id = 1).
CREATE TABLE invoice_settings (
  id                INTEGER PRIMARY KEY CHECK (id = 1),
  business_name     TEXT    NOT NULL DEFAULT 'Encode Studio',
  legal_name        TEXT    NOT NULL DEFAULT '',
  gstin             TEXT    NOT NULL DEFAULT '',
  pan               TEXT    NOT NULL DEFAULT '',
  address           TEXT    NOT NULL DEFAULT '',
  state_code        TEXT    NOT NULL DEFAULT '',
  email             TEXT    NOT NULL DEFAULT '',
  phone             TEXT    NOT NULL DEFAULT '',
  website           TEXT    NOT NULL DEFAULT 'https://encodestudio.in',
  bank_name         TEXT    NOT NULL DEFAULT '',
  account_name      TEXT    NOT NULL DEFAULT '',
  account_number    TEXT    NOT NULL DEFAULT '',
  ifsc              TEXT    NOT NULL DEFAULT '',
  upi_id            TEXT    NOT NULL DEFAULT '',
  invoice_prefix    TEXT    NOT NULL DEFAULT 'ES',
  default_due_days  INTEGER NOT NULL DEFAULT 15,
  default_tax_rate  REAL    NOT NULL DEFAULT 18,
  default_sac       TEXT    NOT NULL DEFAULT '998314',
  default_notes     TEXT    NOT NULL DEFAULT 'Thank you for your business.',
  default_terms     TEXT    NOT NULL DEFAULT '',
  updated_at        TEXT    NULL
);
INSERT INTO invoice_settings (id) VALUES (1);

-- Invoice numbers run consecutively within each Indian financial year (Apr–Mar), as GST requires.
CREATE TABLE invoice_sequence (
  fy           TEXT    PRIMARY KEY,
  last_number  INTEGER NOT NULL
);

CREATE TABLE invoice (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  number             TEXT    NULL UNIQUE,            -- assigned when issued; drafts have none
  lead_id            INTEGER NULL REFERENCES contact_lead (id) ON DELETE SET NULL,
  status             TEXT    NOT NULL DEFAULT 'draft', -- draft | issued | void (paid/overdue are derived)
  client_name        TEXT    NOT NULL,
  client_company     TEXT    NOT NULL DEFAULT '',
  client_email       TEXT    NOT NULL DEFAULT '' COLLATE NOCASE,
  client_phone       TEXT    NOT NULL DEFAULT '',
  client_address     TEXT    NOT NULL DEFAULT '',
  client_gstin       TEXT    NOT NULL DEFAULT '',
  client_state_code  TEXT    NOT NULL DEFAULT '',     -- place of supply
  issue_date         TEXT    NOT NULL,                -- YYYY-MM-DD
  due_date           TEXT    NULL,                    -- YYYY-MM-DD
  tax_mode           TEXT    NOT NULL DEFAULT 'intra', -- intra (CGST+SGST) | inter (IGST) | none
  discount           REAL    NOT NULL DEFAULT 0,
  subtotal           REAL    NOT NULL DEFAULT 0,
  tax_total          REAL    NOT NULL DEFAULT 0,
  total              REAL    NOT NULL DEFAULT 0,
  amount_paid        REAL    NOT NULL DEFAULT 0,
  notes              TEXT    NOT NULL DEFAULT '',
  terms              TEXT    NOT NULL DEFAULT '',
  public_token       TEXT    NOT NULL UNIQUE,         -- unguessable id for the client's view link
  issued_at          TEXT    NULL,
  sent_at            TEXT    NULL,
  voided_at          TEXT    NULL,
  void_reason        TEXT    NOT NULL DEFAULT '',
  created_by         INTEGER NULL REFERENCES auth_user (id) ON DELETE SET NULL,
  created_at         TEXT    NOT NULL,
  updated_at         TEXT    NOT NULL
);
CREATE INDEX idx_invoice_lead ON invoice (lead_id);
CREATE INDEX idx_invoice_status ON invoice (status, due_date);
CREATE INDEX idx_invoice_issue ON invoice (issue_date);

CREATE TABLE invoice_item (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id   INTEGER NOT NULL REFERENCES invoice (id) ON DELETE CASCADE,
  position     INTEGER NOT NULL,
  description  TEXT    NOT NULL,
  sac          TEXT    NOT NULL DEFAULT '',
  quantity     REAL    NOT NULL DEFAULT 1,
  unit_price   REAL    NOT NULL DEFAULT 0,
  tax_rate     REAL    NOT NULL DEFAULT 0
);
CREATE INDEX idx_invoice_item_invoice ON invoice_item (invoice_id, position);

CREATE TABLE invoice_payment (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id   INTEGER NOT NULL REFERENCES invoice (id) ON DELETE CASCADE,
  amount       REAL    NOT NULL,
  paid_on      TEXT    NOT NULL,                      -- YYYY-MM-DD
  method       TEXT    NOT NULL DEFAULT 'bank_transfer',
  reference    TEXT    NOT NULL DEFAULT '',
  note         TEXT    NOT NULL DEFAULT '',
  created_by   INTEGER NULL REFERENCES auth_user (id) ON DELETE SET NULL,
  created_at   TEXT    NOT NULL
);
CREATE INDEX idx_invoice_payment_invoice ON invoice_payment (invoice_id);
CREATE INDEX idx_invoice_payment_date ON invoice_payment (paid_on);
