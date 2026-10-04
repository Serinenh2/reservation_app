from django.urls import path
from rest_framework.routers import DefaultRouter

from .search import SearchView
from .views import BlockedDateViewSet, CalendarView, ReservationViewSet

router = DefaultRouter()
router.register("reservations", ReservationViewSet, basename="reservation")
router.register("blocked-dates", BlockedDateViewSet, basename="blocked-date")

urlpatterns = [
    path("calendar/", CalendarView.as_view(), name="calendar"),
    path("search/", SearchView.as_view(), name="search"),
] + router.urls
