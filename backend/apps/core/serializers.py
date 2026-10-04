from rest_framework import serializers

from .models import AppSettings


class AppSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppSettings
        fields = [
            "company_name",
            "company_name_ar",
            "company_phone",
            "company_email",
            "company_address",
            "min_confirmation_payment",
            "allow_multiple_events_per_day",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]


class TestEmailSerializer(serializers.Serializer):
    to = serializers.EmailField()
