from django.contrib import admin, messages
from django.utils.html import format_html

from .emails import send_lead_confirmation_email, send_lead_admin_notification_email
from .models import Lead

STATUS_COLORS = {
    Lead.Status.NEW: "#38B6FF",
    Lead.Status.CONTACTED: "#6B7280",
    Lead.Status.QUALIFIED: "#0A0A0A",
    Lead.Status.CONVERTED: "#16A34A",
    Lead.Status.LOST: "#DC2626",
}


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "company", "interest", "status_badge", "email_status", "created_at")
    list_editable = ()
    list_filter = ("status", "interest", "created_at")
    search_fields = ("name", "email", "company", "message", "project_description")
    readonly_fields = ("created_at", "updated_at", "confirmation_email_sent_at", "admin_notification_sent_at")
    date_hierarchy = "created_at"
    actions = ["mark_contacted", "mark_qualified", "mark_converted", "mark_lost", "resend_emails"]

    fieldsets = (
        ("Contact", {"fields": ("name", "email", "phone", "company")}),
        ("Submission", {"fields": ("interest", "project_description", "timeline", "message")}),
        ("Lead management", {"fields": ("status", "notes")}),
        (
            "Email delivery",
            {"fields": ("confirmation_email_sent_at", "admin_notification_sent_at"), "classes": ("collapse",)},
        ),
        ("Timestamps", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    @admin.display(description="Status", ordering="status")
    def status_badge(self, obj):
        color = STATUS_COLORS.get(obj.status, "#6B7280")
        return format_html(
            '<span style="display:inline-block;padding:3px 10px;border-radius:999px;'
            'font-size:11px;font-weight:600;color:#fff;background:{}">{}</span>',
            color,
            obj.get_status_display(),
        )

    @admin.display(description="Emails")
    def email_status(self, obj):
        sent = bool(obj.confirmation_email_sent_at) and bool(obj.admin_notification_sent_at)
        return "✓ sent" if sent else "— pending"

    def _bulk_set_status(self, request, queryset, status, label):
        updated = queryset.update(status=status)
        self.message_user(request, f"{updated} lead(s) marked as {label}.", level=messages.SUCCESS)

    @admin.action(description="Mark selected leads as Contacted")
    def mark_contacted(self, request, queryset):
        self._bulk_set_status(request, queryset, Lead.Status.CONTACTED, "Contacted")

    @admin.action(description="Mark selected leads as Qualified")
    def mark_qualified(self, request, queryset):
        self._bulk_set_status(request, queryset, Lead.Status.QUALIFIED, "Qualified")

    @admin.action(description="Mark selected leads as Converted")
    def mark_converted(self, request, queryset):
        self._bulk_set_status(request, queryset, Lead.Status.CONVERTED, "Converted")

    @admin.action(description="Mark selected leads as Lost")
    def mark_lost(self, request, queryset):
        self._bulk_set_status(request, queryset, Lead.Status.LOST, "Lost")

    @admin.action(description="Resend confirmation + admin emails")
    def resend_emails(self, request, queryset):
        count = 0
        for lead in queryset:
            send_lead_confirmation_email(lead)
            send_lead_admin_notification_email(lead)
            count += 1
        self.message_user(request, f"Resent emails for {count} lead(s).", level=messages.SUCCESS)
