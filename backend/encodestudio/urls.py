from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView

from contact.auth import MeView, StaffTokenObtainPairView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/login/", StaffTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/me/", MeView.as_view(), name="auth_me"),
    path("api/", include("contact.urls")),
]
