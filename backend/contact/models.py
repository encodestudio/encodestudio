from django.db import models


class Lead(models.Model):
    class Status(models.TextChoices):
        NEW = "new", "New"
        CONTACTED = "contacted", "Contacted"
        QUALIFIED = "qualified", "Qualified"
        CONVERTED = "converted", "Converted"
        LOST = "lost", "Lost"

    name = models.CharField(max_length=150)
    company = models.CharField(max_length=150, blank=True)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    interest = models.CharField(max_length=100, blank=True)
    project_description = models.CharField(max_length=500, blank=True)
    timeline = models.CharField(max_length=100, blank=True)
    message = models.TextField()

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    notes = models.TextField(blank=True, help_text="Internal notes — not visible to the lead.")

    confirmation_email_sent_at = models.DateTimeField(null=True, blank=True)
    admin_notification_sent_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} <{self.email}> — {self.interest or 'General'}"
