from django.conf import settings
from django.db import connection
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AppSettings
from .permissions import IsStaffOrReadOnly
from .serializers import AppSettingsSerializer, TestEmailSerializer
from .tasks import send_email_task


class HealthView(APIView):
    """GET /api/health/ -> is the database and the task queue reachable?"""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        result = {"database": "ok", "queue": "ok"}

        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
        except Exception:
            result["database"] = "error"

        if settings.CELERY_TASK_ALWAYS_EAGER:
            result["queue"] = "inline"  # no Redis: tasks run immediately
        else:
            try:
                import redis

                redis.Redis.from_url(settings.CELERY_BROKER_URL, socket_connect_timeout=1).ping()
            except Exception:
                result["queue"] = "error"

        healthy = "error" not in result.values()
        result["status"] = "ok" if healthy else "degraded"
        return Response(result, status=200 if healthy else 503)


class AppSettingsView(generics.RetrieveUpdateAPIView):
    """GET / PATCH /api/settings/"""

    serializer_class = AppSettingsSerializer
    permission_classes = [IsStaffOrReadOnly]

    def get_object(self):
        return AppSettings.load()


class TestEmailView(APIView):
    """POST /api/system/test-email/ {to} -> queues a test email."""

    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = TestEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        company = AppSettings.load().company_name
        send_email_task.delay(
            f"{company} — test",
            "La configuration email fonctionne. / إعدادات البريد الإلكتروني تعمل.",
            [serializer.validated_data["to"]],
        )
        return Response({"queued": True}, status=status.HTTP_202_ACCEPTED)
