# Encode Studio — Backend (Cloudflare Worker + Hono + D1)

The API runs as a Cloudflare Worker (`src/index.js`), configured by `wrangler.jsonc` at the
repo root. The same Worker also serves the built React app (`frontend/dist`) as static
assets, so the site and the API share one origin, and it all fits in Cloudflare's free plan.

- **Hono** handles routing. Only `/api/*` and `/health/` run Worker code; every other URL is
  served straight from Cloudflare's CDN, and unknown paths get `index.html` for React Router.
- **D1** (Cloudflare's SQLite) holds the data. It has the same tables and columns the old
  MySQL/Django database had: `contact_lead`, `auth_user`, `lead_activity` and `lead_task`.
- **Email** goes out through the existing Gmail SMTP account, using `worker-mailer` over
  Cloudflare TCP sockets.

## Setup (local)

From the repo root:

```bash
npm install                 # installs root, backend and frontend dependencies
npm run build               # builds frontend/dist (the Worker serves it)
npm run db:migrate:local    # creates the local D1 database in .wrangler/
npm run staff -- add <username> --name "First Last" --superuser
npm run dev                 # Worker on http://localhost:8000
npm run dev:frontend        # optional: Vite on :5173 with hot reload, proxies /api to :8000
```

Local settings and secrets live in `.dev.vars` at the repo root (gitignored). It has
`EMAIL_BACKEND=console`, so emails are printed to the terminal instead of being sent.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/contact/` | public, 20/hour/IP | Create a lead from the contact form |
| `POST` | `/api/auth/login/` | public, 20/hour/IP | Staff login → `{access, refresh, user}` |
| `POST` | `/api/auth/refresh/` | refresh token | New `{access, refresh}` (refresh tokens rotate) |
| `GET` | `/api/auth/me/` | access token | Current user |
| `GET` | `/api/leads/` | staff | List; `?page=&page_size=&search=&status=&source=&priority=&owner=me|none|<id>&interest=&tag=&created_from=&created_to=&stale=1&overdue=1&ordering=` |
| `POST` | `/api/leads/` | staff | Add a lead manually (phone, referral, event...) |
| `GET` | `/api/leads/board/` | staff | Pipeline columns with counts and value |
| `GET` | `/api/leads/export.csv` | staff | CSV of every lead matching the list filters |
| `POST` | `/api/leads/bulk/` | staff | `{ ids, action: status|owner|priority|add_tag|delete, value }` |
| `GET` | `/api/leads/stats/`, `/interests/`, `/tags/` | staff | Counts and filter options |
| `GET` / `PATCH` / `DELETE` | `/api/leads/:id/` | staff | Read, edit (every change is logged on the timeline), delete |
| `GET` / `POST` | `/api/leads/:id/activities/` | staff | Timeline; log a note, call, email or meeting |
| `GET` | `/api/leads/:id/related/` | staff | Other leads with the same email or phone |
| `POST` | `/api/leads/:id/resend_emails/` | staff | Resend confirmation + admin emails |
| `GET` / `POST` / `PATCH` / `DELETE` | `/api/tasks/` | staff | Follow-ups (`?scope=mine&state=open|done&lead=`), plus `/summary/` |
| `GET` / `POST` / `PATCH` | `/api/users/` | staff / admin | Team members (admins add, edit, deactivate) |
| `GET` | `/api/analytics/?from=&to=&tz=` | staff | KPIs, trend, funnel, breakdowns, heatmap, activity feed |
| `GET` / `POST` | `/api/invoices/` | staff | List (`?status=draft|outstanding|overdue|paid|void&search=&lead=`); create a draft (`lead_id` fills the client from the lead) |
| `GET` / `PATCH` / `DELETE` | `/api/invoices/:id/` | staff | Read; edit (drafts fully, issued only due date/notes/terms); delete drafts |
| `POST` | `/api/invoices/:id/issue/`, `/send/`, `/void/`, `/duplicate/` | staff | Assign the next number; email the client a view link; void; copy to a new draft |
| `POST` / `DELETE` | `/api/invoices/:id/payments/[:paymentId/]` | staff | Record or remove a payment |
| `GET` | `/api/invoices/summary/` | staff | Outstanding, overdue, received this month, invoiced this FY |
| `GET` / `PUT` | `/api/invoices/settings/` | staff / admin | Business details, bank/UPI, numbering and defaults |
| `GET` | `/api/public/invoices/:token` | public (token) | The client's copy of an issued invoice |
| `POST` | `/api/invoices/:id/payment-link/`, `/payment-link/sync/` | staff | Create/refresh the Razorpay link; pull payments made on it |
| `POST` | `/api/public/invoices/:token/razorpay-return` | public (Razorpay signature) | Confirms a payment when Razorpay redirects the client back |
| `POST` | `/api/webhooks/razorpay` | Razorpay webhook signature | `payment_link.*` events |
| `GET` | `/health/` | public | Health check |

Contact body: `{ name, company, email, phone, interest, project_description, timeline, message }`
(`name`, `email`, `message` required) plus the hidden `website` honeypot — if a bot fills
it, the API replies success but stores and sends nothing. Validation errors come back as
`{ field: ["message"] }`, other errors as `{ detail }`.

## Invoicing

GST invoices live in `invoice`, `invoice_item` and `invoice_payment` (migration `0002`),
with business details in `invoice_settings`. The rules follow Indian GST practice:

- **Numbering.** Drafts have no number. Issuing assigns the next number in the financial year
  (April–March), e.g. `ES/2026-27/001`, from `invoice_sequence`. Issued invoices can't be
  deleted or edited (apart from due date, notes and terms). Instead they're voided, which
  keeps the number, and duplicated into a corrected draft.
- **Tax.** CGST + SGST when the client's state (place of supply) matches the business
  state, IGST when it doesn't, and no GST when the business has no GSTIN. A discount is
  taken off before tax. The maths lives in `frontend/src/lib/invoiceMath.js`, shared by the
  editor's live totals and the API, so they always agree.
- **Status.** Only `draft`, `issued` and `void` are stored. *Part paid*, *paid* and
  *overdue* are worked out from payments and the due date, in India's timezone.
- **Client view.** Each issued invoice has a private link, `/invoice/<128-bit token>`,
  that needs no login. Clients download a PDF through the browser's print dialog. Sending
  emails that link through the same Gmail SMTP, CC'ing `ADMIN_EMAIL`.
- Issuing, sending, payments and voids are logged on the linked lead's timeline.

### Razorpay payment links

With `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` set (`npx wrangler secret put …`), each
issued invoice that still has money owing gets a Razorpay Payment Link for exactly its
balance (`src/razorpay.js`). The link shows as **Pay now** in the invoice email and on the
client's invoice page. Razorpay's own SMS/email notifications are off, so the client gets
just one email.

- A link's amount can't be changed. When the balance changes (for example a manual payment
  is recorded), the old link is cancelled and a new one is created. Its `reference_id` gets a
  `-2`, `-3`, … suffix because Razorpay requires every reference to be unique. Voiding an
  invoice cancels its link, and balances under ₹1 (Razorpay's minimum) get no link.
- Payments are recorded in two ways: when Razorpay redirects the client back to
  `/invoice/:token` (signed with the key secret), and through the webhook (signed with
  `RAZORPAY_WEBHOOK_SECRET`). Either way, the amounts are read from Razorpay's API, never
  from the request. Each `pay_…` id is stored once (unique index), so a payment arriving
  both ways, or a webhook retry, is recorded only once.
- If Razorpay is down or rejects the request, the invoice is still issued or sent without
  a link, and the portal shows the error with a **Create payment link** button to retry.
- Webhook: Razorpay Dashboard → Account & Settings → Webhooks → URL
  `https://encodestudio.in/api/webhooks/razorpay`, with the events `payment_link.paid`,
  `payment_link.partially_paid`, `payment_link.cancelled` and `payment_link.expired`.
- `rzp_test_…` keys put the portal in test mode (badge shown); `rzp_live_…` keys take
  real payments. `RAZORPAY_API_BASE` exists only for pointing local dev at a mock.

## Database migrations

Migrations are plain SQL files in `migrations/`, applied with Wrangler and recorded in D1's
`d1_migrations` table. To change the schema, add the next numbered file
(`0002_<name>.sql`), then run:

```bash
npm run db:migrate:local    # local dev database
npm run db:migrate          # production
```

Datetimes are stored as UTC ISO-8601 text (`2026-10-11T13:56:39.645Z`). `src/db.js` turns
`*_at` columns back into `Date` objects and writes `Date` parameters in the same format.
D1 accepts at most 100 bound parameters per statement, so long `IN (...)` lists are chunked.

### Importing the old MySQL data

`scripts/export-mysql.js` reads the old database (using the `DB_*` variables in
`backend/.env`), writes `backend/d1-import.sql`, and can load it into D1:

```bash
npm run export-mysql -- --apply --remote   # into production D1 (use a freshly migrated, empty DB)
```

## Lead-manager accounts

The `/leads` portal accepts only active **staff** accounts. Tokens: access 8h, refresh 7d.
Passwords are stored in Django's `pbkdf2_sha256` format.

```bash
npm run staff -- list --remote
npm run staff -- add jane --email jane@encodestudio.in --name "Jane Doe" --remote
npm run staff -- password jane --remote
npm run staff -- disable jane --remote      # or: enable jane
```

Without `--remote` these commands work on the local dev database. Passwords use 40,000
PBKDF2 iterations, because Workers' Web Crypto caps PBKDF2 at 100,000 and the free plan
allows about 10 ms of CPU per request. Accounts imported from Django (1,000,000 iterations)
can't log in until their password is reset with `password`.

## Emails

On every new lead, two emails go out after the response is sent (`src/emails.js`):

1. **Confirmation** to the visitor, echoing what they submitted.
2. **Admin notification** to `ADMIN_EMAIL`, CC `ADMIN_EMAIL_CC`, reply-to the lead, with an
   "Open in Lead Manager" button linking to `LEADS_PORTAL_URL?lead=<id>`.

Delivery times are recorded on the lead; failures are logged and can be retried from the
portal's **Resend** button.

Without `EMAIL_HOST` (or with `EMAIL_BACKEND=console`) emails are printed to the Worker log
(`npm run logs`). Production uses Gmail SMTP (`smtp.gmail.com:587` with an App Password),
set in `wrangler.jsonc` `vars` plus the `EMAIL_HOST_PASSWORD` secret. Any SMTP provider on
port 587 or 465 works; Cloudflare blocks outbound port 25.

## Configuration

Non-secret settings are in `vars` in `wrangler.jsonc`. Set the secrets once per account:

```bash
npx wrangler secret put JWT_SECRET            # long random string
npx wrangler secret put EMAIL_HOST_PASSWORD   # Gmail App Password
```

The anonymous endpoints (contact form, login) are limited to `CONTACT_RATE_LIMIT_PER_HOUR`
requests per IP per hour, counted in D1's `rate_limit` table.
