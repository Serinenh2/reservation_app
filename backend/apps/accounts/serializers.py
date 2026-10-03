from django.contrib.auth import get_user_model
from rest_framework import serializers


class MeSerializer(serializers.ModelSerializer):
    """The logged-in user, as shown in the top bar."""

    class Meta:
        model = get_user_model()
        fields = ["id", "username", "first_name", "last_name", "email", "is_staff"]
        read_only_fields = fields
