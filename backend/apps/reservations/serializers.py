"""
Validation + JSON for reservations.

Error messages are short codes ("date_blocked", "time_conflict"...):
the frontend translates them (see errors.* in fr.json / ar.json).
"""
from django.db import transaction
from rest_framework import serializers

from apps.catalog.models import EventType, ExtraService, ServiceOption
from apps.clients.models import Client

from . import services
from .models import BlockedDate, Payment, Reservation, ReservationService


class ServiceLineSerializer(serializers.ModelSerializer):
    service = serializers.PrimaryKeyRelatedField(queryset=ExtraService.objects.all())
    option = serializers.PrimaryKeyRelatedField(queryset=ServiceOption.objects.all(), required=False, allow_null=True)
    name_fr = serializers.CharField(source="service.name_fr", read_only=True)
    name_ar = serializers.CharField(source="service.name_ar", read_only=True)
    option_fr = serializers.CharField(source="option.name_fr", read_only=True, default="")
    option_ar = serializers.CharField(source="option.name_ar", read_only=True, default="")
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    line_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = ReservationService
        fields = ["service", "option", "name_fr", "name_ar", "option_fr", "option_ar", "quantity", "unit_price", "line_total"]

    def validate(self, attrs):
        service, option = attrs["service"], attrs.get("option")
        # A service with options needs one of ITS options; a service without options takes none.
        if option and option.service_id != service.id:
            raise serializers.ValidationError({"option": "invalid_option"})
        if not option and service.options.exists():
            raise serializers.ValidationError({"option": "option_required"})
        return attrs


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ["id", "amount", "paid_on", "method", "note", "created_at"]
        read_only_fields = ["created_at"]

    def validate(self, attrs):
        reservation = self.context["reservation"]
        if reservation.status == Reservation.Status.CANCELLED:
            raise serializers.ValidationError({"amount": "reservation_cancelled"})
        # Never accept more than what is still owed.
        if attrs["amount"] > reservation.remaining_amount:
            raise serializers.ValidationError({"amount": "exceeds_remaining"})
        return attrs


class ClientMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ["id", "full_name", "phone"]


class ReservationListSerializer(serializers.ModelSerializer):
    """Light version for tables and the calendar."""

    client = ClientMiniSerializer(read_only=True)
    event_type_fr = serializers.CharField(source="event_type.name_fr", read_only=True, default="")
    event_type_ar = serializers.CharField(source="event_type.name_ar", read_only=True, default="")
    occasion_fr = serializers.CharField(source="occasion.name_fr", read_only=True)
    occasion_ar = serializers.CharField(source="occasion.name_ar", read_only=True)
    remaining_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    payment_state = serializers.CharField(read_only=True)

    class Meta:
        model = Reservation
        fields = [
            "id", "client", "event_type", "event_type_fr", "event_type_ar", "occasion", "occasion_fr", "occasion_ar",
            "event_date", "start_time", "end_time", "guests_women", "guests_men", "guests",
            "total", "paid_amount", "remaining_amount", "payment_state", "status",
        ]


class ReservationSerializer(ReservationListSerializer):
    """Full version: create, edit, detail page."""

    client_id = serializers.PrimaryKeyRelatedField(source="client", queryset=Client.objects.all(), write_only=True)
    services = ServiceLineSerializer(source="service_lines", many=True, required=False)
    payments = PaymentSerializer(many=True, read_only=True)
    base_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0, required=False)

    class Meta(ReservationListSerializer.Meta):
        fields = ReservationListSerializer.Meta.fields + [
            "client_id", "base_price", "discount_type", "discount_value",
            "services_total", "subtotal", "discount_amount",
            "notes", "services", "payments", "created_at", "updated_at",
        ]
        read_only_fields = [
            "guests",
            "services_total", "subtotal", "discount_amount", "total",
            "paid_amount", "status", "created_at", "updated_at",
        ]

    def validate(self, attrs):
        instance = self.instance
        get = lambda key: attrs.get(key, getattr(instance, key, None))  # noqa: E731

        # Total guests = women + men (recomputed whenever one of them changes).
        if not instance or "guests_women" in attrs or "guests_men" in attrs:
            attrs["guests"] = (get("guests_women") or 0) + (get("guests_men") or 0)

        occasion = get("occasion")
        event_date, start_time, end_time = get("event_date"), get("start_time"), get("end_time")
        errors = {}

        # Inactive occasions/services can't be chosen for new bookings,
        # but an existing reservation may keep the one it already has.
        if occasion and not occasion.is_active and (not instance or instance.occasion_id != occasion.id):
            errors["occasion"] = "inactive"
        event_type = get("event_type")
        if not event_type:
            errors["event_type"] = "required"
        elif not event_type.is_active and (not instance or instance.event_type_id != event_type.id):
            errors["event_type"] = "inactive"
        lines = attrs.get("service_lines")
        if lines is not None:
            kept = set(instance.service_lines.values_list("service_id", flat=True)) if instance else set()
            if any(not line["service"].is_active and line["service"].id not in kept for line in lines):
                errors["services"] = "inactive"
            if len({line["service"].id for line in lines}) != len(lines):
                errors["services"] = "duplicate"

        if start_time and end_time and start_time == end_time:
            errors["end_time"] = "same_as_start"

        if errors:
            raise serializers.ValidationError(errors)

        # Only check dates/times when they change (or on create), and never
        # for cancelled reservations: they don't occupy the venue.
        cancelled = instance and instance.status == Reservation.Status.CANCELLED
        moved = not instance or any(k in attrs for k in ("event_date", "start_time", "end_time"))
        if moved and not cancelled:
            if services.is_blocked(event_date):
                raise serializers.ValidationError({"event_date": "date_blocked"})
            conflicts = services.find_conflicts(event_date, start_time, end_time, exclude_id=instance and instance.pk)
            if conflicts:
                raise serializers.ValidationError({
                    "event_date": "time_conflict",
                    "conflicts": [
                        {
                            "id": c.id,
                            "client": c.client.full_name,
                            "event_date": c.event_date.isoformat(),
                            "start_time": c.start_time.strftime("%H:%M"),
                            "end_time": c.end_time.strftime("%H:%M"),
                        }
                        for c in conflicts
                    ],
                })

        # Default price comes from the occasion (its tier for this number
        # of guests) when not typed.
        if "base_price" not in attrs and not instance:
            attrs["base_price"] = occasion.price_for(attrs.get("guests"))
        return attrs

    def _apply_totals(self, reservation, lines):
        try:
            totals = services.compute_totals(
                reservation.base_price,
                [(line.unit_price, line.quantity) for line in lines],
                reservation.discount_type,
                reservation.discount_value,
            )
        except ValueError as exc:
            raise serializers.ValidationError({"discount_value": [str(exc)]})
        if totals["total"] < reservation.paid_amount:
            raise serializers.ValidationError({"discount_value": ["total_below_paid"]})
        for key, value in totals.items():
            setattr(reservation, key, value)

    def _save(self, reservation, validated_data, lines_data):
        for key, value in validated_data.items():
            setattr(reservation, key, value)

        if lines_data is None:
            lines = list(reservation.service_lines.all()) if reservation.pk else []
        else:
            # Keep the old price for services already on the reservation,
            # use the current catalog price for new ones.
            old_prices = (
                {(l.service_id, l.option_id): l.unit_price for l in reservation.service_lines.all()} if reservation.pk else {}
            )
            lines = []
            for item in lines_data:
                service, option = item["service"], item.get("option")
                current_price = option.price if option else service.price
                lines.append(ReservationService(
                    service=service,
                    option=option,
                    quantity=item.get("quantity", 1),
                    unit_price=old_prices.get((service.id, option and option.id), current_price),
                ))

        self._apply_totals(reservation, lines)
        reservation.status = services.status_for(reservation.paid_amount, reservation.status)
        reservation.save()

        if lines_data is not None:
            reservation.service_lines.all().delete()
            for line in lines:
                line.reservation = reservation
            ReservationService.objects.bulk_create(lines)
        return reservation

    @transaction.atomic
    def create(self, validated_data):
        lines_data = validated_data.pop("service_lines", [])
        reservation = Reservation(created_by=self.context["request"].user)
        return self._save(reservation, validated_data, lines_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        lines_data = validated_data.pop("service_lines", None)
        return self._save(instance, validated_data, lines_data)


class BlockedDateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlockedDate
        fields = ["id", "date", "reason", "created_at"]
        read_only_fields = ["created_at"]

    def validate_date(self, value):
        taken = Reservation.objects.exclude(status=Reservation.Status.CANCELLED).filter(event_date=value)
        if self.instance:
            taken = taken.exclude(event_date=self.instance.date)
        if taken.exists():
            raise serializers.ValidationError("date_has_reservations")
        return value
