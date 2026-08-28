from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import LeadCreateView, LeadViewSet

router = DefaultRouter()
router.register("leads", LeadViewSet, basename="lead")

urlpatterns = [
    path("contact/", LeadCreateView.as_view(), name="contact-create"),
    path("", include(router.urls)),
]
