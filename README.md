# Encode Studio Website

Marketing website for Encode Studio: a React frontend, a Node.js (Express) backend, and
a MySQL database. In production it runs as **one Node app** that serves both the site and
the API, so it fits on any low-cost Node host. No AWS needed.

```
encodestudio/
├── frontend/   React + Vite + Tailwind CSS + Framer Motion
├── backend/    Node.js + Express + MySQL (mysql2), Nodemailer
└── package.json  root build/start scripts used by hosts
```

## Local development

```bash
# 1. API on :8000 (reads backend/.env — DB credentials as before)
cd backend && npm install && npm run dev

# 2. Site on :5173, proxies /api to :8000
cd frontend && npm install && npm run dev
```

First time with an empty database: `npm run db:init` then
`npm run staff -- add <username> --superuser` in `backend/`. See
[`backend/README.md`](backend/README.md).

## Pages

Home · Products (Encode Campus, Encode Learn, Encode Verify) · Services + per-service
pages · Meet the Founder · Contact. Per-route SEO meta and schema come from
`frontend/src/components/Seo.jsx`, and `robots.txt`/`sitemap.xml` from `frontend/public`.

## Contact form and lead manager

- `/contact` posts to `POST /api/contact/`. It validates the input, has a honeypot and a
  rate limit, stores the lead in MySQL, and emails both the visitor and the team.
- `/leads` is a staff-only portal (JWT login). It is not linked from the site. Staff can
  change a lead's status (New → Contacted → Qualified → Converted / Lost), add internal
  notes, search and filter, and see or resend emails. Links in notification emails open
  the lead directly (`/leads?lead=<id>`).

## Production build & deploy

From the repo root:

```bash
npm run build   # installs + builds frontend/dist, installs backend prod deps
npm start       # node backend/src/server.js on $PORT
```

Set these on the host: `NODE_ENV=production`, `JWT_SECRET`, the `DB_*` variables,
SMTP `EMAIL_*`, and `LEADS_PORTAL_URL=https://encodestudio.in/leads`. (If `backend/.env`
is uploaded, it is read too. Real environment variables win.)

Any host that runs `npm run build` + `npm start` works. Low-cost options:

- **Shared/cloud hosting with Node.js + MySQL** (e.g. cPanel or hPanel "Node.js app"):
  the cheapest all-in-one choice. MySQL runs on the same plan. Point the app's startup
  file at `backend/src/server.js`.
- **A small VPS** (Hetzner, DigitalOcean, Oracle Cloud's Always Free tier, …): run MySQL
  and the app with `pm2` or systemd behind Caddy/nginx. Full control, flat monthly price.
- **Render / Railway** for the Node app, plus a MySQL database hosted elsewhere
  (`DB_SSL=True`). Render's free web tier sleeps when idle.

Keep the domain on Cloudflare (DNS + free SSL/CDN) and point `encodestudio.in` at the host.

## Brand system

- Primary accent: Encode Blue `#38B6FF`
- Primary dark: Black `#000000` / Near Black `#0A0A0A`
- Primary light: White `#FFFFFF` / Soft White `#F7F9FB`
- Ratio: ~65% white/light surfaces, ~25% black/dark surfaces, ~10% Encode Blue accent

See `frontend/tailwind.config.js` for the full token set.
