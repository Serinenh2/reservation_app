from rest_framework import viewsets

from apps.core.permissions import IsStaffOrReadOnly

from .models import ExtraService, Occasion
from .serializers import EventTypeSerializer, ExtraServiceSerializer, OccasionSerializer


class CatalogViewSet(viewsets.ModelViewSet):
    """
    Read: any logged-in user. Write: staff only.
    ?active=1 returns only active items (used by the reservation form).
    DELETE does not delete: it deactivates (soft delete).
    """

    permission_classes = [IsStaffOrReadOnly]
    pagination_class = None  # short lists, always loaded whole
    prefetch = None

    def get_queryset(self):
        qs = self.serializer_class.Meta.model.objects.all()
        if self.prefetch:
            qs = qs.prefetch_related(self.prefetch)
        if self.request.query_params.get("active") == "1":
            qs = qs.filter(is_active=True)
        return qs

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])


class OccasionViewSet(CatalogViewSet):
    serializer_class = OccasionSerializer
    prefetch = "tiers"


class ExtraServiceViewSet(CatalogViewSet):
    serializer_class = ExtraServiceSerializer
    prefetch = "options"


class EventTypeViewSet(CatalogViewSet):
    serializer_class = EventTypeSerializer
