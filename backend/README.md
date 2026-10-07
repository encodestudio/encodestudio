# Encode Studio — Backend (Node.js + Express + MySQL)

One Node process that serves:

- the JSON API under `/api` (contact form, lead-manager portal, auth), and
- the built React app (`frontend/dist`) for every other URL, with client-side routing.

It uses the **same MySQL database and tables** the old Django backend created
(`contact_lead`, `auth_user`), so existing leads and staff logins carry over with no
migration. The DB is configured with the same `DB_*` variables as before.

## Setup

```bash
cd backend
npm install
cp .env.example .env      # skip if you already have backend/.env — it works as-is
npm run db:init           # creates the tables only if they don't exist yet
npm run staff -- add <username> --name "First Last" --superuser
npm run dev               # http://localhost:8000, restarts on file changes
```

For a brand-new database, create it and the app user first with `setup.sql`
(`mysql -u root -p < setup.sql`).

In development run the frontend separately (`npm run dev` in `/frontend`); Vite proxies
`/api` to this server on port 8000.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/contact/` | public, 20/hour/IP | Create a lead from the contact form |
| `POST` | `/api/auth/login/` | public, 20/hour/IP | Staff login → `{access, refresh, user}` |
| `POST` | `/api/auth/refresh/` | refresh token | New `{access, refresh}` (refresh tokens rotate) |
| `GET` | `/api/auth/me/` | access token | Current user |
| `GET` | `/api/leads/` | staff | List; `?page=`, `?search=`, `?status=`, `?interest=`, `?ordering=` |
| `GET` | `/api/leads/stats/` | staff | Counts per status |
| `GET` | `/api/leads/interests/` | staff | Distinct interests for the filter |
| `GET` | `/api/leads/:id/` | staff | One lead |
| `PATCH` | `/api/leads/:id/` | staff | Update `status` and/or `notes` only |
| `DELETE` | `/api/leads/:id/` | staff | Delete a lead |
| `POST` | `/api/leads/:id/resend_emails/` | staff | Resend confirmation + admin emails |
| `GET` | `/health/` | public | Health check |

Contact body: `{ name, company, email, phone, interest, project_description, timeline, message }`
(`name`, `email`, `message` required) plus the hidden `website` honeypot — if a bot fills
it, the API replies success but stores and sends nothing. Validation errors come back as
`{ field: ["message"] }`, other errors as `{ detail }`.

## Lead-manager accounts

The `/leads` portal accepts only active **staff** accounts. Tokens: access 8h, refresh 7d.
Passwords are stored in Django's `pbkdf2_sha256` format, so accounts created under Django
still work, and accounts created here would work in Django too.

```bash
npm run staff -- list
npm run staff -- add jane --email jane@encodestudio.in --name "Jane Doe"
npm run staff -- password jane
npm run staff -- disable jane      # or: enable jane
```

## Emails

On every new lead, two emails go out after the response is sent (`src/emails.js`):

1. **Confirmation** to the visitor, echoing what they submitted.
2. **Admin notification** to `ADMIN_EMAIL`, CC `ADMIN_EMAIL_CC`, reply-to the lead, with an
   "Open in Lead Manager" button linking to `LEADS_PORTAL_URL?lead=<id>`.

Delivery times are recorded on the lead; failures are logged and can be retried from the
portal's **Resend** button.

Without `EMAIL_HOST` (or with `EMAIL_BACKEND=console`) emails are printed to the server log.
To send for real, set the SMTP variables — e.g. Gmail / Google Workspace (`smtp.gmail.com`,
port 587, an App Password) or any transactional provider (Brevo, Resend, Mailgun,
Postmark, SendGrid all offer SMTP).

## Configuration

See [`.env.example`](.env.example). Production requires `NODE_ENV=production` and
`JWT_SECRET`. Set `DB_SSL=True` when the MySQL server requires TLS.
