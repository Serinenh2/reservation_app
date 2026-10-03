from rest_framework.routers import DefaultRouter

from .views import EventTypeViewSet, ExtraServiceViewSet, OccasionViewSet

router = DefaultRouter()
router.register("event-types", EventTypeViewSet, basename="event-type")
router.register("occasions", OccasionViewSet, basename="occasion")
router.register("services", ExtraServiceViewSet, basename="service")
urlpatterns = router.urls
