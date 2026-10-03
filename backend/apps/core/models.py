from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q


class AppSettings(models.Model):
    """
    Company-wide settings. There is always exactly ONE row (id = 1).
    Use AppSettings.load() to read it; never create a second row.
    """

    company_name = models.CharField(max_length=150, default="Dar El Afrah")
    company_phone = models.CharField(max_length=40, blank=True)
    company_email = models.EmailField(blank=True)
    company_address = models.CharField(max_length=255, blank=True)

    # Spec §12: a reservation becomes "confirmed" once total payments
    # reach this amount. Configurable, never hard-coded.
    min_confirmation_payment = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("20000"),
        validators=[MinValueValidator(Decimal("0"))],
    )

    # Spec §29 scenario 3: allow several events on the same day
    # as long as their time ranges do not overlap.
    allow_multiple_events_per_day = models.BooleanField(default=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Paramètres"
        verbose_name_plural = "Paramètres"
        constraints = [
            # Database-level guard, in addition to the serializer validation.
            models.CheckConstraint(
                condition=Q(min_confirmation_payment__gte=0),
                name="settings_min_payment_not_negative",
            )
        ]

    def save(self, *args, **kwargs):
        self.pk = 1  # force the single row
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass  # settings can't be deleted

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return self.company_name
