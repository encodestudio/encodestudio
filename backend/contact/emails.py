import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone

logger = logging.getLogger(__name__)


def send_lead_confirmation_email(lead):
    """Send a thank-you confirmation to the person who submitted the form."""
    subject = "We've received your message — Encode Studio"
    text_body = (
        f"Hi {lead.name or 'there'},\n\n"
        "Thanks for reaching out to Encode Studio. We've received your message and a "
        "member of our team will get back to you shortly to start the conversation.\n\n"
        f"Interested in: {lead.interest or '-'}\n"
        f"Project: {lead.project_description or '-'}\n"
        f"Timeline: {lead.timeline or '-'}\n"
        f"Message: {lead.message}\n\n"
        "— Encode Studio\n"
        "https://encodestudio.in"
    )
    html_body = render_to_string("emails/lead_confirmation.html", {"lead": lead})

    try:
        message = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[lead.email],
        )
        message.attach_alternative(html_body, "text/html")
        message.send(fail_silently=False)
        lead.confirmation_email_sent_at = timezone.now()
        lead.save(update_fields=["confirmation_email_sent_at"])
        return True
    except Exception:
        logger.exception("Failed to send lead confirmation email to %s (lead #%s)", lead.email, lead.pk)
        return False


def send_lead_admin_notification_email(lead):
    """Notify the studio team that a new lead came in via the website."""
    subject = f"New lead: {lead.name} ({lead.interest or 'General enquiry'})"
    text_body = (
        f"New lead submitted via encodestudio.in/contact\n\n"
        f"Name: {lead.name}\n"
        f"Email: {lead.email}\n"
        f"Phone: {lead.phone or '-'}\n"
        f"Company: {lead.company or '-'}\n"
        f"Interested in: {lead.interest or '-'}\n"
        f"Project: {lead.project_description or '-'}\n"
        f"Timeline: {lead.timeline or '-'}\n\n"
        f"Message:\n{lead.message}\n\n"
        f"Manage this lead: {settings.FRONTEND_ADMIN_URL}{lead.pk}/change/"
    )
    html_body = render_to_string(
        "emails/lead_notification.html",
        {"lead": lead, "admin_url": settings.FRONTEND_ADMIN_URL},
    )

    try:
        message = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[settings.ADMIN_EMAIL],
            cc=settings.ADMIN_EMAIL_CC,
            reply_to=[lead.email],
        )
        message.attach_alternative(html_body, "text/html")
        message.send(fail_silently=False)
        lead.admin_notification_sent_at = timezone.now()
        lead.save(update_fields=["admin_notification_sent_at"])
        return True
    except Exception:
        logger.exception("Failed to send admin notification email for lead #%s", lead.pk)
        return False


def send_lead_emails(lead):
    """Send both the sender confirmation and the admin notification for a new lead."""
    send_lead_confirmation_email(lead)
    send_lead_admin_notification_email(lead)
