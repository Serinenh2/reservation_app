from rest_framework import serializers

from .models import Client


class ClientSerializer(serializers.ModelSerializer):
    # Filled by the list query (annotate), so the table shows it without extra requests.
    reservation_count = serializers.IntegerField(read_only=True, default=0)
    # Sums over non-cancelled reservations (history page).
    total_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True, default=0)
    paid_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True, default=0)

    class Meta:
        model = Client
        fields = [
            "id",
            "full_name",
            "phone",
            "phone_alt",
            "email",
            "address",
            "notes",
            "reservation_count",
            "total_amount",
            "paid_amount",
            "created_at",
        ]
        read_only_fields = ["created_at"]

    def validate_full_name(self, value):
        value = " ".join(value.split())
        if not value:
            raise serializers.ValidationError("required")
        return value

    def validate_phone(self, value):
        value = value.strip()
        # Digits, spaces, +, -, dots and parentheses; at least 6 digits.
        if sum(c.isdigit() for c in value) < 6 or any(not (c.isdigit() or c in " +-.()") for c in value):
            raise serializers.ValidationError("invalid_phone")
        return value
