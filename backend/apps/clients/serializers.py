from rest_framework import serializers

from apps.core.files import DOCUMENT_TYPES, check_file, document_type

from .models import Client


class ClientSerializer(serializers.ModelSerializer):
    # Filled by the list query (annotate), so the table shows it without extra requests.
    reservation_count = serializers.IntegerField(read_only=True, default=0)
    # Uploaded here, never returned as a URL (see ClientViewSet.id_document).
    id_document = serializers.FileField(write_only=True, required=False)
    has_id_document = serializers.SerializerMethodField()
    id_document_type = serializers.SerializerMethodField()
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
            "id_card_number",
            "id_card_issued_on",
            "id_card_issued_at",
            "id_document",
            "has_id_document",
            "id_document_type",
            "notes",
            "reservation_count",
            "total_amount",
            "paid_amount",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_has_id_document(self, obj):
        return bool(obj.id_document)

    def get_id_document_type(self, obj):
        return document_type(obj.id_document)

    def validate_id_document(self, file):
        return check_file(file, DOCUMENT_TYPES, max_mb=10)

    def create(self, validated_data):
        # Save first so the file lands in clients/<id>/.
        file = validated_data.pop("id_document", None)
        client = super().create(validated_data)
        if file:
            client.id_document = file
            client.save()
        return client

    def update(self, instance, validated_data):
        if "id_document" in validated_data and instance.id_document:
            instance.id_document.delete(save=False)  # replaced: remove the old file
        return super().update(instance, validated_data)

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
