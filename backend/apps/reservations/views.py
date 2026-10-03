from datetime import date

from django.db import transaction
from django.db.models import Count, Q, Sum
from django.db.models.functions import ExtractMonth
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsStaffOrReadOnly

from . import services
from .models import BlockedDate, Reservation
from .serializers import (
    BlockedDateSerializer,
    PaymentSerializer,
    ReservationListSerializer,
    ReservationSerializer,
)


def parse_date(value, field):
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        raise ValidationError({field: ["invalid_date"]})


class ReservationViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.ListModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """
    /api/reservations/                 GET (filters below)  POST
    /api/reservations/<id>/            GET  PATCH  DELETE (staff: erases it and its payments;
                                       cancel keeps it in the history)
    /api/reservations/<id>/cancel/     POST
    /api/reservations/<id>/restore/    POST  (re-checks date and times)
    /api/reservations/<id>/payments/   POST  add an instalment
    /api/reservations/<id>/payments/<payment_id>/  DELETE (staff)

    List filters: ?search= (client name / phone)  ?status=pending,confirmed  ?client=
                  ?occasion=  ?date_from=YYYY-MM-DD  ?date_to=YYYY-MM-DD  ?ordering=date
    """

    def get_serializer_class(self):
        return ReservationListSerializer if self.action == "list" else ReservationSerializer

    def get_permissions(self):
        if self.action == "destroy":
            return [IsAdminUser()]
        return super().get_permissions()

    def get_queryset(self):
        qs = Reservation.objects.select_related("client", "occasion", "event_type")
        if self.action != "list":
            return qs.prefetch_related("service_lines__service", "service_lines__option", "payments")

        params = self.request.query_params
        search = params.get("search", "").strip()
        if search:
            digits = search.replace(" ", "")
            qs = qs.filter(
                Q(client__full_name__icontains=search)
                | Q(client__phone__icontains=search)
                | Q(client__phone__icontains=digits)
            )
        if params.get("status"):
            qs = qs.filter(status__in=params["status"].split(","))
        if params.get("client"):
            qs = qs.filter(client_id=params["client"])
        if params.get("occasion"):
            qs = qs.filter(occasion_id=params["occasion"])
        if params.get("date_from"):
            qs = qs.filter(event_date__gte=parse_date(params["date_from"], "date_from"))
        if params.get("date_to"):
            qs = qs.filter(event_date__lte=parse_date(params["date_to"], "date_to"))
        if params.get("ordering") == "date":
            qs = qs.order_by("event_date", "start_time")
        return qs

    def _detail(self, reservation, code=status.HTTP_200_OK):
        reservation = self.get_queryset().get(pk=reservation.pk)  # fresh, with prefetch
        data = ReservationSerializer(reservation, context=self.get_serializer_context()).data
        return Response(data, status=code)

    def update(self, request, *args, **kwargs):
        super().update(request, *args, **kwargs)
        return self._detail(self.get_object())

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        reservation = self.get_object()
        reservation.status = Reservation.Status.CANCELLED
        reservation.save(update_fields=["status", "updated_at"])
        return self._detail(reservation)

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        with transaction.atomic():
            reservation = self.get_object()
            if reservation.status == Reservation.Status.CANCELLED:
                if services.is_blocked(reservation.event_date):
                    raise ValidationError({"event_date": ["date_blocked"]})
                if services.find_conflicts(
                    reservation.event_date, reservation.start_time, reservation.end_time, exclude_id=reservation.pk
                ):
                    raise ValidationError({"event_date": ["time_conflict"]})
                reservation.status = Reservation.Status.PENDING
                services.refresh_payments(reservation)
        return self._detail(reservation)

    @action(detail=True, methods=["post"])
    def payments(self, request, pk=None):
        with transaction.atomic():
            reservation = self.get_object()
            serializer = PaymentSerializer(data=request.data, context={"reservation": reservation})
            serializer.is_valid(raise_exception=True)
            serializer.save(reservation=reservation, created_by=request.user)
            services.refresh_payments(reservation)
        return self._detail(reservation, status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=["delete"],
        url_path=r"payments/(?P<payment_id>\d+)",
        permission_classes=[IsAdminUser],
    )
    def delete_payment(self, request, pk=None, payment_id=None):
        with transaction.atomic():
            reservation = self.get_object()
            get_object_or_404(reservation.payments, pk=payment_id).delete()
            services.refresh_payments(reservation)
        return self._detail(reservation)


class BlockedDateViewSet(viewsets.ModelViewSet):
    """/api/blocked-dates/  read: logged in, write: staff.  ?upcoming=1 hides past dates."""

    serializer_class = BlockedDateSerializer
    permission_classes = [IsStaffOrReadOnly]
    pagination_class = None

    def get_queryset(self):
        qs = BlockedDate.objects.all()
        if self.request.query_params.get("upcoming") == "1":
            qs = qs.filter(date__gte=timezone.localdate())
        return qs


class CalendarView(APIView):
    """
    GET /api/calendar/?start=YYYY-MM-DD&end=YYYY-MM-DD
    Everything the month view needs in one request: reservations
    (cancelled included, the page decides how to show them) + blocked dates.
    """

    def get(self, request):
        start = parse_date(request.query_params.get("start"), "start")
        end = parse_date(request.query_params.get("end"), "end")
        if end < start or (end - start).days > 62:
            raise ValidationError({"end": ["invalid_range"]})
        reservations = (
            Reservation.objects.filter(event_date__range=(start, end))
            .select_related("client", "occasion", "event_type")
            .order_by("event_date", "start_time")
        )
        blocked = BlockedDate.objects.filter(date__range=(start, end))
        return Response({
            "reservations": ReservationListSerializer(reservations, many=True).data,
            "blocked": BlockedDateSerializer(blocked, many=True).data,
        })


class DashboardView(APIView):
    """
    GET /api/dashboard/?year=2026
    The figures of the dashboard (cancelled reservations never count)
    + amounts per month for the chart + the next 5 events.
    """

    def get(self, request):
        today = timezone.localdate()
        try:
            year = int(request.query_params.get("year", today.year))
        except ValueError:
            raise ValidationError({"year": ["invalid_date"]})

        active = Reservation.objects.exclude(status=Reservation.Status.CANCELLED)
        money = active.aggregate(total=Sum("total"), paid=Sum("paid_amount"))
        total, paid = money["total"] or 0, money["paid"] or 0

        per_month = {
            row["month"]: row
            for row in active.filter(event_date__year=year)
            .annotate(month=ExtractMonth("event_date"))
            .values("month")
            .annotate(total=Sum("total"), paid=Sum("paid_amount"), count=Count("id"))
        }
        months = [
            {
                "month": m,
                "total": per_month.get(m, {}).get("total") or 0,
                "paid": per_month.get(m, {}).get("paid") or 0,
                "count": per_month.get(m, {}).get("count") or 0,
            }
            for m in range(1, 13)
        ]

        upcoming = active.filter(event_date__gte=today).select_related("client", "occasion", "event_type").order_by("event_date", "start_time")
        return Response({
            "today": active.filter(event_date=today).count(),
            "upcoming": active.filter(event_date__gt=today).count(),
            "count": active.count(),
            "reserved_dates": active.values("event_date").distinct().count(),
            "total": total,
            "paid": paid,
            "remaining": max(total - paid, 0),
            "pending": active.filter(status=Reservation.Status.PENDING, event_date__gte=today).count(),
            "year": year,
            "months": months,
            "next": ReservationListSerializer(upcoming[:5], many=True).data,
        })
