# Encode Studio Website

Full-stack marketing website for Encode Studio — React (Vite) frontend, Django REST
Framework backend, MySQL database.

```
encodestudio/
├── frontend/   React + Vite + Tailwind CSS + Framer Motion
└── backend/    Django + Django REST Framework + MySQL (via PyMySQL)
```

## Quick start

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

Runs at `http://localhost:5173`.

**Backend**

See [`backend/README.md`](backend/README.md) for full setup (MySQL database creation,
`.env`, migrations). Once configured:

```bash
cd backend
./venv/Scripts/python manage.py runserver
```

Runs at `http://localhost:8000`. The frontend contact form posts to
`http://localhost:8000/api/contact/` (configurable via `frontend/.env`).

## Pages

Home · Products (Encode Campus, Encode Learn, Encode Verify) · Services · Meet the
Founder · Contact — following the site architecture and brand system defined in the
Encode Studio branding and content documents.

## Lead management portal

`/leads` is a staff-only, JWT-authenticated dashboard for managing contact-form
submissions — status workflow, notes, search/filters, and resend-email — separate from
the public site (no nav/footer, not linked anywhere) and from the Django admin. See
[`backend/README.md`](backend/README.md#lead-management) for how accounts are created
and how the API works.

## Brand system

- Primary accent: Encode Blue `#38B6FF`
- Primary dark: Black `#000000` / Near Black `#0A0A0A`
- Primary light: White `#FFFFFF` / Soft White `#F7F9FB`
- Ratio: ~65% white/light surfaces, ~25% black/dark surfaces, ~10% Encode Blue accent

See `frontend/tailwind.config.js` for the full token set.
