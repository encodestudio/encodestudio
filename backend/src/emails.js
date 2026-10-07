import nodemailer from "nodemailer";
import { config } from "./config.js";
import { logActivity, markEmailSent } from "./leads.js";

const transport = config.email.useConsole
  ? nodemailer.createTransport({ jsonTransport: true })
  : nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.useSsl,
      requireTLS: config.email.useTls && !config.email.useSsl,
      auth: config.email.user ? { user: config.email.user, pass: config.email.password } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 10_000,
    });

async function send(message) {
  const info = await transport.sendMail({ from: config.email.from, ...message });
  if (config.email.useConsole) {
    // Same idea as Django's console backend: print instead of sending.
    console.log(`[email:console] to=${[message.to, message.cc].flat().filter(Boolean).join(", ")} subject="${message.subject}"\n${message.text}\n`);
  }
  return info;
}

const escapeHtml = (value = "") =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const formatDate = (value) =>
  new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";

function confirmationHtml(lead) {
  const line = (label, value) =>
    value
      ? `<p style="margin:0 0 6px 0; font-size:14px; color:#111827;"><strong>${label}:</strong> ${escapeHtml(value)}</p>`
      : "";
  return `<!doctype html>
<html>
  <body style="margin:0; padding:0; background-color:#F7F9FB; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F9FB; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #E5E7EB;">
            <tr>
              <td style="background-color:#000000; padding:28px 32px;">
                <span style="color:#ffffff; font-size:18px; font-weight:700; letter-spacing:-0.02em;">ENCODE<span style="color:#38B6FF;">STUDIO</span></span>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px 8px 32px;">
                <p style="margin:0 0 4px 0; font-size:12px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:#38B6FF;">Message received</p>
                <h1 style="margin:0 0 20px 0; font-size:24px; line-height:1.3; color:#000000;">Thanks for reaching out, ${escapeHtml(lead.name || "there")}.</h1>
                <p style="margin:0 0 16px 0; font-size:15px; line-height:1.6; color:#374151;">
                  We've received your message and a member of the Encode Studio team will get back
                  to you shortly to start the conversation.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 24px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F9FB; border-radius:12px; padding:4px;">
                  <tr><td style="padding:16px 20px;">
                    <p style="margin:0 0 10px 0; font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#6B7280;">What you told us</p>
                    ${line("Interested in", lead.interest)}
                    ${line("Project", lead.project_description)}
                    ${line("Timeline", lead.timeline)}
                    <p style="margin:6px 0 0 0; font-size:14px; color:#111827; white-space:pre-wrap;"><strong>Message:</strong> ${escapeHtml(lead.message)}</p>
                  </td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 36px 32px;">
                <p style="margin:0; font-size:14px; line-height:1.6; color:#6B7280;">
                  In the meantime, feel free to explore what we're building at
                  <a href="https://encodestudio.in" style="color:#38B6FF; text-decoration:none;">encodestudio.in</a>.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px; background-color:#F7F9FB; border-top:1px solid #E5E7EB;">
                <p style="margin:0; font-size:12px; color:#6B7280;">Encode Studio — We design, build and operate digital products that solve real-world problems.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function notificationHtml(lead, leadUrl) {
  const row = (label, value, html) =>
    value
      ? `<tr>
                    <td style="padding:8px 0; border-bottom:1px solid #E5E7EB; font-size:13px; color:#6B7280; width:140px;">${label}</td>
                    <td style="padding:8px 0; border-bottom:1px solid #E5E7EB; font-size:14px; color:#111827;">${html ?? escapeHtml(value)}</td>
                  </tr>`
      : "";
  return `<!doctype html>
<html>
  <body style="margin:0; padding:0; background-color:#F7F9FB; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F9FB; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #E5E7EB;">
            <tr>
              <td style="background-color:#38B6FF; padding:24px 32px;">
                <span style="color:#000000; font-size:13px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase;">New Website Lead</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 8px 32px;">
                <h1 style="margin:0 0 4px 0; font-size:22px; color:#000000;">${escapeHtml(lead.name)}</h1>
                <p style="margin:0 0 24px 0; font-size:14px; color:#6B7280;">Submitted ${formatDate(lead.created_at)} via encodestudio.in/contact</p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${row("Email", lead.email, `<a href="mailto:${escapeHtml(lead.email)}" style="color:#38B6FF;">${escapeHtml(lead.email)}</a>`)}
                  ${row("Phone", lead.phone)}
                  ${row("Company", lead.company)}
                  ${row("Interested in", lead.interest)}
                  ${row("Project", lead.project_description)}
                  ${row("Timeline", lead.timeline)}
                </table>

                <p style="margin:20px 0 6px 0; font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#6B7280;">Message</p>
                <p style="margin:0 0 28px 0; font-size:14px; line-height:1.6; color:#111827; white-space:pre-wrap; background-color:#F7F9FB; padding:14px 16px; border-radius:10px;">${escapeHtml(lead.message)}</p>

                <a href="${escapeHtml(leadUrl)}" style="display:inline-block; background-color:#000000; color:#ffffff; text-decoration:none; font-size:14px; font-weight:600; padding:12px 22px; border-radius:999px;">Open in Lead Manager →</a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px; background-color:#F7F9FB; border-top:1px solid #E5E7EB;">
                <p style="margin:0; font-size:12px; color:#6B7280;">Encode Studio — automated lead notification.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Thank-you confirmation to the person who submitted the form. */
export async function sendLeadConfirmationEmail(lead) {
  const text =
    `Hi ${lead.name || "there"},\n\n` +
    "Thanks for reaching out to Encode Studio. We've received your message and a " +
    "member of our team will get back to you shortly to start the conversation.\n\n" +
    `Interested in: ${lead.interest || "-"}\n` +
    `Project: ${lead.project_description || "-"}\n` +
    `Timeline: ${lead.timeline || "-"}\n` +
    `Message: ${lead.message}\n\n` +
    "— Encode Studio\n" +
    "https://encodestudio.in";
  try {
    await send({
      to: lead.email,
      subject: "We've received your message — Encode Studio",
      text,
      html: confirmationHtml(lead),
    });
    await markEmailSent(lead.id, "confirmation_email_sent_at");
    await logActivity(lead.id, null, "email_sent", `Confirmation email sent to ${lead.email}`);
    return true;
  } catch (err) {
    console.error(`Failed to send lead confirmation email to ${lead.email} (lead #${lead.id})`, err);
    return false;
  }
}

/** Notify the studio team that a new lead came in via the website. */
export async function sendLeadAdminNotificationEmail(lead) {
  const leadUrl = `${config.leadsPortalUrl}?lead=${lead.id}`;
  const text =
    "New lead submitted via encodestudio.in/contact\n\n" +
    `Name: ${lead.name}\n` +
    `Email: ${lead.email}\n` +
    `Phone: ${lead.phone || "-"}\n` +
    `Company: ${lead.company || "-"}\n` +
    `Interested in: ${lead.interest || "-"}\n` +
    `Project: ${lead.project_description || "-"}\n` +
    `Timeline: ${lead.timeline || "-"}\n\n` +
    `Message:\n${lead.message}\n\n` +
    `Manage this lead: ${leadUrl}`;
  try {
    await send({
      to: config.email.adminTo,
      cc: config.email.adminCc,
      replyTo: lead.email,
      subject: `New lead: ${lead.name} (${lead.interest || "General enquiry"})`,
      text,
      html: notificationHtml(lead, leadUrl),
    });
    await markEmailSent(lead.id, "admin_notification_sent_at");
    await logActivity(lead.id, null, "email_sent", `Team notified at ${config.email.adminTo}`);
    return true;
  } catch (err) {
    console.error(`Failed to send admin notification email for lead #${lead.id}`, err);
    return false;
  }
}

/** Sends both emails for a new lead. */
export async function sendLeadEmails(lead) {
  await sendLeadConfirmationEmail(lead);
  await sendLeadAdminNotificationEmail(lead);
}
