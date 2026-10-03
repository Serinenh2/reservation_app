from django.urls import path

from .views import AppSettingsView, HealthView, TestEmailView

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("settings/", AppSettingsView.as_view(), name="settings"),
    path("system/test-email/", TestEmailView.as_view(), name="test_email"),
]
