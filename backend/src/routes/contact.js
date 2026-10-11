import { Hono } from "hono";
import { createLead, toPublic, trackingFields, validateSubmission } from "../leads.js";
import { sendLeadEmails } from "../emails.js";

const router = new Hono({ strict: false });

// POST /api/contact/ — public endpoint the website contact form posts to.
router.post("/", async (c) => {
  const body = c.get("body");
  // Honeypot: real visitors never see or fill `website`; bots do. Pretend it
  // worked so they don't learn they were caught, but store and send nothing.
  if (body.website) {
    return c.json({ ok: true }, 201);
  }

  const { data, errors } = validateSubmission(body);
  if (errors) return c.json(errors, 400);

  const lead = await createLead(data, { source: "website", extra: trackingFields(body) });

  // Emails go out after the response so a slow SMTP round trip never delays
  // the visitor. Failures are logged and visible (and resendable) in /leads.
  c.executionCtx.waitUntil(sendLeadEmails(lead).catch((err) => console.error("Lead email dispatch failed", err)));
  return c.json(toPublic(lead), 201);
});

export default router;
