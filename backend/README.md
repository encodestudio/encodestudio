# Encode Studio — Backend (Django + DRF + MySQL)

## Setup

1. Create a virtual environment and install dependencies:

   ```bash
   python -m venv venv
   ./venv/Scripts/pip install -r requirements.txt
   ```

2. Create the MySQL database and app user. Edit the password in `setup.sql`, then run:

   ```bash
   mysql -u root -p < setup.sql
   ```

3. Copy `.env.example` to `.env` and fill in the DB password you set above:

   ```bash
   cp .env.example .env
   ```

4. Run migrations and start the server:

   ```bash
   ./venv/Scripts/python manage.py migrate
   ./venv/Scripts/python manage.py createsuperuser
   ./venv/Scripts/python manage.py runserver
   ```

The API is served at `http://localhost:8000/api/`. The Django admin (to view submitted
leads) is at `http://localhost:8000/admin/`.

## Endpoints

- `POST /api/contact/` — create a lead from the website contact form. Body:
  `{ name, company, email, phone, interest, project_description, timeline, message }`
  (`name`, `email`, `message` are required; the rest are optional).

## Lead management

Every contact-form submission is stored as a `Lead` in the `contact` app. Lead managers
use the frontend portal at **`/leads`** (not the Django admin — see below) to:

- Work a **status workflow**: New → Contacted → Qualified → Converted / Lost.
- Add **internal notes** per lead, not visible to the person who submitted the form.
- **Filter & search** by status, interest, and free text across name/email/company/message.
- See **email delivery status** per lead and **resend** the confirmation/admin emails if
  either failed.

This is served by an authenticated API (`contact/views.py::LeadViewSet`) at
`/api/leads/` — `GET` (list, filterable via `?status=`, `?interest=`, `?search=`),
`GET /api/leads/stats/`, `GET /api/leads/interests/`, `PATCH /api/leads/{id}/` (status
+ notes only — the original submission is read-only), and
`POST /api/leads/{id}/resend_emails/`.

### Portal accounts

`/leads` requires a **staff** Django account (`is_staff=True`) — regular website
visitors can never reach it, even if they guessed valid-looking credentials, because the
login endpoint (`StaffTokenObtainPairSerializer` in `contact/auth.py`) rejects non-staff
users before issuing a token. The superuser created via `createsuperuser` already
qualifies. To add another lead manager without giving them superuser/admin-site access:

```bash
./venv/Scripts/python manage.py shell -c "
from django.contrib.auth.models import User
User.objects.create_user('jane', email='jane@encodestudio.in', password='choose-a-strong-password', is_staff=True)
"
```

Auth is JWT (`djangorestframework-simplejwt`): `POST /api/auth/login/` returns an access
token (8h) and refresh token (7d); the frontend stores both in `localStorage` and
silently refreshes on expiry. `GET /api/auth/me/` returns the logged-in user's identity.

The Django admin at `/admin/` still exists (useful for you as a developer — e.g. bulk
actions, raw data access) but is not what lead managers are given; nothing in the
frontend links to it.

## Automated emails

On every new lead, two emails are sent automatically (see `contact/emails.py`):

1. **Confirmation** → the person who submitted the form, thanking them and echoing back
   what they submitted.
2. **Admin notification** → `ADMIN_EMAIL` (`shivam@encodestudio.in`), CC'd to
   `ADMIN_EMAIL_CC` (`encodestudio.in@gmail.com`), with the full lead detail and a link
   into the admin panel. Replying to this email replies directly to the lead.

Both are sent from a background thread so a slow SMTP round trip never delays the
contact form's response to the visitor.

### Configuring real email delivery

By default `EMAIL_BACKEND` is the **console backend** — emails are printed to the
`runserver` log instead of actually being sent, so nothing goes out until you configure
real SMTP credentials. To send real email, set these in `backend/.env`:

```bash
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.your-provider.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-smtp-username
EMAIL_HOST_PASSWORD=your-smtp-password-or-api-key
EMAIL_USE_TLS=True
```

Common options for `encodestudio.in`:
- **Google Workspace** (if the domain's mail is hosted there): `smtp.gmail.com`, port
  `587`, with an [App Password](https://myaccount.google.com/apppasswords) for the sending
  account — not the account's normal login password.
- **Transactional email provider** (recommended for production — better deliverability
  and no daily sending caps): SendGrid, Mailgun, Postmark, Amazon SES, or Brevo. Each
  gives you an SMTP host/username/API-key to drop into the same four variables above.

Never commit real credentials — `backend/.env` is already gitignored.

## Notes

- MySQL access uses `PyMySQL` (pure-Python driver) via `django.db.backends.mysql`, so no
  MySQL C connector / `mysqlclient` build toolchain is required on Windows.
- CORS is restricted to the origins in `CORS_ALLOWED_ORIGINS` (defaults to the Vite dev
  server at `http://localhost:5173`).
- The contact endpoint is rate-limited to 20 requests/hour per IP to deter spam.
