from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q


class Reservation(models.Model):
    """
    One event on one date. All amounts are calculated on the server
    (see services.py); the browser only shows a preview.
    """

    class Status(models.TextChoices):
        PENDING = "pending"        # not enough paid yet
        CONFIRMED = "confirmed"    # payments reached AppSettings.min_confirmation_payment
        CANCELLED = "cancelled"    # kept in history, frees the date

    class Discount(models.TextChoices):
        NONE = "none"
        FIXED = "fixed"            # amount in DA
        PERCENT = "percent"        # 0-100 %

    client = models.ForeignKey("clients.Client", on_delete=models.PROTECT, related_name="reservations")
    # What is celebrated (wedding, engagement...). Optional only for
    # reservations created before this field existed.
    event_type = models.ForeignKey(
        "catalog.EventType", null=True, blank=True, on_delete=models.PROTECT, related_name="reservations"
    )
    # The package served (dinner + tea, afternoon coffee): it sets the price.
    occasion = models.ForeignKey("catalog.Occasion", on_delete=models.PROTECT, related_name="reservations")

    event_date = models.DateField(db_index=True)
    start_time = models.TimeField()
    # If end_time <= start_time the event ends the next day (e.g. 19:00 -> 01:00).
    end_time = models.TimeField()
    # Women and men are counted separately; `guests` is their sum (used by
    # the occasion price tiers). Set by the serializer, never typed.
    guests_women = models.PositiveIntegerField(default=0)
    guests_men = models.PositiveIntegerField(default=0)
    # Children are counted apart (commitment rule 09); not in `guests`, which sets the price.
    guests_children = models.PositiveIntegerField(default=0)
    guests = models.PositiveIntegerField(default=0)

    base_price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0"))])
    discount_type = models.CharField(max_length=10, choices=Discount.choices, default=Discount.NONE)
    discount_value = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0"), validators=[MinValueValidator(Decimal("0"))]
    )

    # Calculated by services.compute_totals(), never typed by the user.
    services_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))

    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING, db_index=True)
    notes = models.TextField(blank=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-event_date", "-start_time"]
        constraints = [
            models.CheckConstraint(condition=Q(total__gte=0), name="reservation_total_not_negative"),
        ]

    @property
    def remaining_amount(self):
        return max(self.total - self.paid_amount, Decimal("0"))

    @property
    def payment_state(self):
        if self.paid_amount <= 0:
            return "unpaid"
        return "paid" if self.paid_amount >= self.total else "partial"

    def __str__(self):
        return f"{self.event_date} {self.client}"


class ReservationService(models.Model):
    """An extra service on a reservation. The price is copied at booking time."""

    reservation = models.ForeignKey(Reservation, on_delete=models.CASCADE, related_name="service_lines")
    service = models.ForeignKey("catalog.ExtraService", on_delete=models.PROTECT, related_name="+")
    # Required when the service has options (e.g. photographer "with travel").
    option = models.ForeignKey("catalog.ServiceOption", null=True, blank=True, on_delete=models.PROTECT, related_name="+")
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        ordering = ["id"]

    @property
    def line_total(self):
        return self.unit_price * self.quantity


class Payment(models.Model):
    """One instalment. A reservation can be paid in several times."""

    class Method(models.TextChoices):
        CASH = "cash"
        TRANSFER = "transfer"
        CHEQUE = "cheque"
        OTHER = "other"

    reservation = models.ForeignKey(Reservation, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    paid_on = models.DateField()
    method = models.CharField(max_length=10, choices=Method.choices, default=Method.CASH)
    note = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["paid_on", "id"]
        constraints = [models.CheckConstraint(condition=Q(amount__gt=0), name="payment_amount_positive")]


class BlockedDate(models.Model):
    """A day when no reservation can be made (closure, maintenance, private use)."""

    date = models.DateField(unique=True)
    reason = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["date"]

    def __str__(self):
        return str(self.date)
