from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models


class CatalogItem(models.Model):
    """
    Shared fields for occasions and extra services.
    Items are never deleted, only deactivated ("soft delete"), so old
    reservations keep pointing to them.
    """

    name_fr = models.CharField(max_length=120)
    name_ar = models.CharField(max_length=120)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True
        ordering = ["-is_active", "name_fr"]

    def __str__(self):
        return self.name_fr


class EventType(CatalogItem):
    """What is celebrated: wedding, engagement, fatha... (no price)."""

    class Meta(CatalogItem.Meta):
        verbose_name = "Type d'occasion"


class Occasion(CatalogItem):
    """
    Wedding, dinner, engagement... If the occasion has price tiers, the
    number of guests picks the price (see price_for); otherwise default_price.
    """

    default_price = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0"), validators=[MinValueValidator(Decimal("0"))]
    )

    class Meta(CatalogItem.Meta):
        verbose_name = "Occasion"

    def price_for(self, guests):
        """Smallest tier that holds `guests`; above the last tier, the last tier's price."""
        tiers = list(self.tiers.all())
        if not tiers:
            return self.default_price
        for tier in tiers:
            if (guests or 0) <= tier.max_guests:
                return tier.price
        return tiers[-1].price


class ExtraService(CatalogItem):
    """
    Optional add-on (DJ, decoration, photographer...) priced per unit.
    If it has options, the chosen option's price is used instead of `price`.
    """

    price = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0"), validators=[MinValueValidator(Decimal("0"))]
    )

    class Meta(CatalogItem.Meta):
        verbose_name = "Service supplémentaire"


class OccasionPriceTier(models.Model):
    """
    Price grid of an occasion by number of guests:
    "up to 100 guests -> 160 000 DA". The smallest tier that fits wins.
    """

    occasion = models.ForeignKey(Occasion, on_delete=models.CASCADE, related_name="tiers")
    max_guests = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0"))])

    class Meta:
        ordering = ["max_guests"]
        constraints = [models.UniqueConstraint(fields=["occasion", "max_guests"], name="unique_tier_per_occasion")]


class ServiceOption(models.Model):
    """A variant of a service with its own price: "In the hall" 35 000, "With travel" 40 000."""

    service = models.ForeignKey(ExtraService, on_delete=models.CASCADE, related_name="options")
    name_fr = models.CharField(max_length=120)
    name_ar = models.CharField(max_length=120)
    price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0"))])

    class Meta:
        ordering = ["price", "id"]

    def __str__(self):
        return f"{self.service} · {self.name_fr}"
