# encodestudio-contact (Cloudflare Worker)

Handles the website contact form. Replaces the Django `/api/contact/` endpoint that
ran on App Runner + RDS. Runs on the Cloudflare Workers free tier (100k requests/day).

## Email transport: Resend

The Worker emails leads via [Resend](https://resend.com) (free tier: 3,000 emails/month,
100/day). One-time setup:

1. Create a Resend account, then **API Keys → Create** (scope: "Sending access"). Copy the key.
2. **Domains → Add Domain → `encodestudio.in`.** Resend shows a few DNS records
   (an SPF `TXT`, a DKIM `TXT`, and usually a `MX`/return-path on a subdomain).
   Add them in Cloudflare DNS (or hand them to Claude to add via the API), then click
   **Verify**. Until the domain is verified you can only send *from* `onboarding@resend.dev`
   and *to* your own account email — fine for a first test.
3. Set `MAIL_FROM` in `wrangler.toml` to a verified address, e.g.
   `Encode Studio <leads@encodestudio.in>`.

## Deploy

```bash
cd worker
npm install
npx wrangler login                       # or: export CLOUDFLARE_API_TOKEN=...
npx wrangler secret put RESEND_API_KEY    # paste the Resend key
npx wrangler deploy
```

Deploy prints the URL: `https://encodestudio-contact.<subdomain>.workers.dev`.
Put that in `frontend/.env.production` as `VITE_CONTACT_ENDPOINT`, then rebuild/redeploy
the frontend.

### Optional: custom domain

After the first deploy, uncomment the `routes` line in `wrangler.toml`
(`contact.encodestudio.in`) and `wrangler deploy` again. Cloudflare creates the DNS
record automatically since the zone is on the same account.

### Optional: Turnstile spam protection

1. Cloudflare dashboard → Turnstile → add a widget for `encodestudio.in`.
2. `npx wrangler secret put TURNSTILE_SECRET`
3. Render the widget on the contact form and send its token as `turnstileToken`
   in the POST body. The Worker enforces it only when the secret is set.

## Local dev

```bash
cd worker
echo 'RESEND_API_KEY = "re_..."' > .dev.vars
npx wrangler dev          # serves on http://localhost:8787
```

`frontend/.env` already points `VITE_CONTACT_ENDPOINT` at `http://localhost:8787`.

## Request contract

`POST` JSON: `{ name, company, email, phone, interest, project_description, timeline, message }`
plus an optional hidden `website` honeypot. Responses: `200 {ok:true}` on success,
`4xx` with `{detail}` or `{<field>}` messages on validation failure (the frontend
flattens these into the error banner, same as the old Django API).
