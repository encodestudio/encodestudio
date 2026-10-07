import { Router } from "express";
import { createLead, toPublic, trackingFields, validateSubmission } from "../leads.js";
import { sendLeadEmails } from "../emails.js";

const router = Router();

// POST /api/contact/ — public endpoint the website contact form posts to.
router.post("/", async (req, res) => {
  // Honeypot: real visitors never see or fill `website`; bots do. Pretend it
  // worked so they don't learn they were caught, but store and send nothing.
  if (req.body?.website) {
    return res.status(201).json({ ok: true });
  }

  const { data, errors } = validateSubmission(req.body);
  if (errors) return res.status(400).json(errors);

  const lead = await createLead(data, { source: "website", extra: trackingFields(req.body) });
  res.status(201).json(toPublic(lead));

  // Emails go out after the response so a slow SMTP round trip never delays
  // the visitor. Failures are logged and visible (and resendable) in /leads.
  sendLeadEmails(lead).catch((err) => console.error("Lead email dispatch failed", err));
});

export default router;
