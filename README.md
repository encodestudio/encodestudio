# Encode Studio Website

Marketing website for Encode Studio: a React frontend plus an API and database. Everything
runs on **Cloudflare's free plan** as one Worker: it serves the built site from the CDN and
runs the `/api` routes on Hono with a D1 (SQLite) database.

```
encodestudio/
├── frontend/       React + Vite + Tailwind CSS + Framer Motion
├── backend/        Cloudflare Worker: Hono, D1, worker-mailer (Gmail SMTP)
├── wrangler.jsonc  Worker config: static assets, D1 binding, vars, domains
└── package.json    root scripts (setup, dev, build, deploy, db, staff)
```

## Local development

```bash
npm install                 # installs root, backend and frontend dependencies
npm run build               # build frontend/dist
npm run db:migrate:local    # local D1 database
npm run staff -- add <username> --superuser
npm run dev                 # site + API on http://localhost:8000
npm run dev:frontend        # optional: Vite hot reload on :5173 (proxies /api to :8000)
```

See [`backend/README.md`](backend/README.md) for the API, migrations and staff accounts.

## Pages

Home · Products (Encode Campus, Encode Learn, Encode Verify) · Services + per-service
pages · Meet the Founder · Contact. Per-route SEO meta and schema come from
`frontend/src/components/Seo.jsx`, and `robots.txt`/`sitemap.xml` from `frontend/public`.

## Contact form and lead manager

- `/contact` posts to `POST /api/contact/`. It validates the input, has a honeypot and a
  rate limit, stores the lead in D1, and emails both the visitor and the team.
- `/leads` is a staff-only CRM (JWT login, not linked from the site, loaded only when visited):
  - **Dashboard**: KPIs with period-over-period change, leads-over-time trend, conversion funnel,
    breakdowns by stage, source, interest and priority, an arrival heatmap, team performance,
    "going cold" and "unassigned" lists, and a live activity feed. Date range runs from 7 days to all time.
  - **Leads**: search, filters, saved views (My leads, Hot, Overdue...), sortable columns,
    bulk stage/owner/priority/tag/delete, CSV export.
  - **Pipeline**: Kanban board with drag-and-drop between stages and lost reasons.
  - **Lead page**: stage stepper, owner, priority, deal value, tags, lead score, a full
    activity timeline (notes, calls, emails, meetings, plus every change), follow-ups, source
    tracking (UTM, referrer, landing page), email delivery and resend, and duplicate detection.
  - **Follow-ups**: overdue, today and upcoming tasks, with a badge in the sidebar.
  - **Team**: admins add, edit and deactivate staff; everyone can change their own password.
  - **Invoices**: GST tax invoices (CGST/SGST or IGST by place of supply) with numbering per
    financial year, created from a lead or on their own. Includes partial payments, overdue
    tracking, void and duplicate, a private client link with print-to-PDF, email to the
    client, and admin settings for business, bank and UPI details. When Razorpay is connected,
    each invoice carries a **Pay now** payment link, and online payments are recorded on it
    automatically.
  - Phone and walk-in leads can be added by hand. Notification emails link straight to the lead.

## Deploy (Cloudflare)

One-time setup:

```bash
npx wrangler login                          # opens the browser to authorize Wrangler
npx wrangler d1 create encodestudio         # paste the database_id into wrangler.jsonc
npm run db:migrate                          # create the tables in production D1
npx wrangler secret put JWT_SECRET
npx wrangler secret put EMAIL_HOST_PASSWORD
npx wrangler secret put RAZORPAY_KEY_ID          # optional: Pay-now links on invoices
npx wrangler secret put RAZORPAY_KEY_SECRET
npx wrangler secret put RAZORPAY_WEBHOOK_SECRET
npm run staff -- add <username> --superuser --remote
```

Every deploy after that:

```bash
npm run deploy      # builds the frontend and uploads the Worker + assets
npm run logs        # live production logs
```

`encodestudio.in` and `www` are attached as Worker custom domains (the `routes` block in
`wrangler.jsonc`). Cloudflare creates their DNS records and certificates.

## Brand system

- Primary accent: Encode Blue `#38B6FF`
- Primary dark: Black `#000000` / Near Black `#0A0A0A`
- Primary light: White `#FFFFFF` / Soft White `#F7F9FB`
- Ratio: ~65% white/light surfaces, ~25% black/dark surfaces, ~10% Encode Blue accent

See `frontend/tailwind.config.js` for the full token set.
