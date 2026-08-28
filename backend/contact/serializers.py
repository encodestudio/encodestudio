from rest_framework import serializers

from .models import Lead


class LeadSerializer(serializers.ModelSerializer):
    """Public-facing serializer used by the website contact form. Only exposes
    the fields a visitor is allowed to submit — internal fields (status, notes,
    email-delivery timestamps) are deliberately excluded."""

    class Meta:
        model = Lead
        fields = [
            "id",
            "name",
            "company",
            "email",
            "phone",
            "interest",
            "project_description",
            "timeline",
            "message",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class LeadManageSerializer(serializers.ModelSerializer):
    """Full serializer used by the authenticated lead-management portal."""

    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Lead
        fields = [
            "id",
            "name",
            "company",
            "email",
            "phone",
            "interest",
            "project_description",
            "timeline",
            "message",
            "status",
            "status_display",
            "notes",
            "confirmation_email_sent_at",
            "admin_notification_sent_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "name",
            "company",
            "email",
            "phone",
            "interest",
            "project_description",
            "timeline",
            "message",
            "confirmation_email_sent_at",
            "admin_notification_sent_at",
            "created_at",
            "updated_at",
        ]
