from django.db import transaction
from django.db.models import ProtectedError
from rest_framework import serializers

from .models import EventType, ExtraService, Occasion, OccasionPriceTier, ServiceOption


def _clean_name(value):
    value = " ".join(value.split())
    if not value:
        raise serializers.ValidationError("required")
    return value


class TierSerializer(serializers.ModelSerializer):
    class Meta:
        model = OccasionPriceTier
        fields = ["id", "max_guests", "price"]
        read_only_fields = ["id"]


class OptionSerializer(serializers.ModelSerializer):
    # Writable id: an existing option is updated (old reservations keep pointing to it).
    id = serializers.IntegerField(required=False)

    class Meta:
        model = ServiceOption
        fields = ["id", "name_fr", "name_ar", "price"]

    validate_name_fr = staticmethod(_clean_name)
    validate_name_ar = staticmethod(_clean_name)


class OccasionSerializer(serializers.ModelSerializer):
    """`tiers` is optional; when sent, it replaces the whole grid."""

    tiers = TierSerializer(many=True, required=False)

    class Meta:
        model = Occasion
        fields = ["id", "name_fr", "name_ar", "default_price", "tiers", "is_active"]

    validate_name_fr = staticmethod(_clean_name)
    validate_name_ar = staticmethod(_clean_name)

    def validate_tiers(self, tiers):
        sizes = [t["max_guests"] for t in tiers]
        if len(set(sizes)) != len(sizes):
            raise serializers.ValidationError("duplicate")
        return sorted(tiers, key=lambda t: t["max_guests"])

    @transaction.atomic
    def create(self, validated_data):
        tiers = validated_data.pop("tiers", [])
        occasion = super().create(validated_data)
        OccasionPriceTier.objects.bulk_create(OccasionPriceTier(occasion=occasion, **t) for t in tiers)
        return occasion

    @transaction.atomic
    def update(self, instance, validated_data):
        tiers = validated_data.pop("tiers", None)
        occasion = super().update(instance, validated_data)
        if tiers is not None:
            occasion.tiers.all().delete()
            OccasionPriceTier.objects.bulk_create(OccasionPriceTier(occasion=occasion, **t) for t in tiers)
        return occasion


class ExtraServiceSerializer(serializers.ModelSerializer):
    """
    `options` is optional; when sent it is the full list: options with an id
    are updated, new ones created, missing ones deleted (refused if a
    reservation uses them).
    """

    options = OptionSerializer(many=True, required=False)

    class Meta:
        model = ExtraService
        fields = ["id", "name_fr", "name_ar", "price", "options", "is_active"]

    validate_name_fr = staticmethod(_clean_name)
    validate_name_ar = staticmethod(_clean_name)

    @transaction.atomic
    def create(self, validated_data):
        options = validated_data.pop("options", [])
        service = super().create(validated_data)
        ServiceOption.objects.bulk_create(ServiceOption(service=service, **{k: v for k, v in o.items() if k != "id"}) for o in options)
        return service

    @transaction.atomic
    def update(self, instance, validated_data):
        options = validated_data.pop("options", None)
        service = super().update(instance, validated_data)
        if options is None:
            return service

        existing = {o.id: o for o in service.options.all()}
        kept = set()
        for data in options:
            option = existing.get(data.pop("id", None))
            if option:
                for key, value in data.items():
                    setattr(option, key, value)
                option.save()
                kept.add(option.id)
            else:
                ServiceOption.objects.create(service=service, **data)
        try:
            service.options.exclude(id__in=kept).filter(id__in=existing).delete()
        except ProtectedError:
            raise serializers.ValidationError({"options": ["option_in_use"]})
        return service


class EventTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventType
        fields = ["id", "name_fr", "name_ar", "is_active"]

    validate_name_fr = staticmethod(_clean_name)
    validate_name_ar = staticmethod(_clean_name)
