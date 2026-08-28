from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView


class StaffTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Only issues tokens to staff accounts — the leads portal is not for
    regular website visitors, even if they somehow had valid credentials."""

    def validate(self, attrs):
        data = super().validate(attrs)
        if not self.user.is_staff or not self.user.is_active:
            raise serializers.ValidationError(
                "This account is not authorized to access the lead management portal."
            )
        data["user"] = {
            "username": self.user.username,
            "name": self.user.get_full_name() or self.user.username,
            "is_superuser": self.user.is_superuser,
        }
        return data


class StaffTokenObtainPairView(TokenObtainPairView):
    serializer_class = StaffTokenObtainPairSerializer


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response(
            {
                "username": user.username,
                "name": user.get_full_name() or user.username,
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
            }
        )
