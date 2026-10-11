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
npm run setup               # installs root, backend and frontend dependencies
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
| `GET` | `/health/` | public | Health check |

Contact body: `{ name, company, email, phone, interest, project_description, timeline, message }`
(`name`, `email`, `message` required) plus the hidden `website` honeypot — if a bot fills
it, the API replies success but stores and sends nothing. Validation errors come back as
`{ field: ["message"] }`, other errors as `{ detail }`.

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
