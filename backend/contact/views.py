import threading

from django.db.models import Count, Q
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response

from .emails import send_lead_admin_notification_email, send_lead_confirmation_email, send_lead_emails
from .models import Lead
from .serializers import LeadManageSerializer, LeadSerializer


class LeadCreateView(generics.CreateAPIView):
    """Public endpoint the website contact form posts to. No auth required."""

    queryset = Lead.objects.all()
    serializer_class = LeadSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        lead = serializer.save()
        # Send confirmation + admin notification in the background so a slow
        # SMTP round trip never delays the form's response to the visitor.
        threading.Thread(target=send_lead_emails, args=(lead,), daemon=True).start()


class LeadViewSet(viewsets.ModelViewSet):
    """Authenticated lead-management API backing the /leads portal.
    Staff-only — visitors never touch this."""

    queryset = Lead.objects.all()
    serializer_class = LeadManageSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "email", "company", "message", "project_description"]
    ordering_fields = ["created_at", "updated_at", "name", "status"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        interest_param = self.request.query_params.get("interest")
        if interest_param:
            qs = qs.filter(interest=interest_param)
        return qs

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Counts per status, for the dashboard header."""
        counts = Lead.objects.aggregate(
            total=Count("id"),
            new=Count("id", filter=Q(status=Lead.Status.NEW)),
            contacted=Count("id", filter=Q(status=Lead.Status.CONTACTED)),
            qualified=Count("id", filter=Q(status=Lead.Status.QUALIFIED)),
            converted=Count("id", filter=Q(status=Lead.Status.CONVERTED)),
            lost=Count("id", filter=Q(status=Lead.Status.LOST)),
        )
        return Response(counts)

    @action(detail=False, methods=["get"])
    def interests(self, request):
        """Distinct interest values currently in use, for the filter dropdown."""
        values = (
            Lead.objects.exclude(interest="")
            .values_list("interest", flat=True)
            .distinct()
            .order_by("interest")
        )
        return Response(list(values))

    @action(detail=True, methods=["post"])
    def resend_emails(self, request, pk=None):
        lead = self.get_object()
        confirmation_ok = send_lead_confirmation_email(lead)
        admin_ok = send_lead_admin_notification_email(lead)
        lead.refresh_from_db()
        return Response(
            {
                "confirmation_sent": confirmation_ok,
                "admin_notification_sent": admin_ok,
                "lead": LeadManageSerializer(lead).data,
            },
            status=status.HTTP_200_OK,
        )
