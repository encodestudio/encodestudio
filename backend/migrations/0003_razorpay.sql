-- Razorpay Payment Links: one active link per invoice for its outstanding balance.
ALTER TABLE invoice ADD COLUMN payment_link_id TEXT NULL;
ALTER TABLE invoice ADD COLUMN payment_link_url TEXT NULL;
ALTER TABLE invoice ADD COLUMN payment_link_amount REAL NULL;     -- ₹ the link was created for
ALTER TABLE invoice ADD COLUMN payment_link_status TEXT NULL;     -- created | partially_paid | paid | cancelled | expired
ALTER TABLE invoice ADD COLUMN payment_link_attempt INTEGER NOT NULL DEFAULT 0; -- keeps reference_id unique on re-creation
CREATE INDEX idx_invoice_payment_link ON invoice (payment_link_id);

-- Razorpay payment id ("pay_..."), so a payment seen via both the redirect and the webhook is recorded once.
ALTER TABLE invoice_payment ADD COLUMN gateway_payment_id TEXT NULL;
CREATE UNIQUE INDEX idx_invoice_payment_gateway ON invoice_payment (gateway_payment_id) WHERE gateway_payment_id IS NOT NULL;
