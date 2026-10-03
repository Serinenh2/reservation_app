from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import BlockedDateViewSet, CalendarView, ReservationViewSet

router = DefaultRouter()
router.register("reservations", ReservationViewSet, basename="reservation")
router.register("blocked-dates", BlockedDateViewSet, basename="blocked-date")

urlpatterns = [
    path("calendar/", CalendarView.as_view(), name="calendar"),
] + router.urls
