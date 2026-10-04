"""
GET /api/search/?q=...   One box to find anything.

What the text looks like decides the search:
  "15/10/2026", "15-10-2026", "2026-10-15", "15/10"  -> that day
  "10/2026"                                          -> that month
  anything else                                      -> clients (name, phone, email,
                                                        ID card number) + workers (staff)

Cancelled reservations are shown but never counted in the money totals.
"""
import re
from calendar import monthrange
from datetime import date

from django.db.models import Q
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clients.serializers import ClientSerializer
from apps.clients.views import clients_with_totals, match_phone, only_digits

from .models import BlockedDate, Reservation
from .serializers import BlockedDateSerializer, ReservationListSerializer

DAY = re.compile(r"^(\d{1,2})[/.\-](\d{1,2})(?:[/.\-](\d{2,4}))?$")  # 15/10/2026, 15/10
ISO_DAY = re.compile(r"^(\d{4})-(\d{1,2})-(\d{1,2})$")  # 2026-10-15
MONTH = re.compile(r"^(\d{1,2})[/.\-](\d{4})$")  # 10/2026
CLIENT_LIMIT = 10
RESERVATIONS_PER_CLIENT = 20


def parse_query(q):
    """('day', date) | ('month', (year, month)) | ('text', q)"""
    today = timezone.localdate()
    try:
        if m := ISO_DAY.match(q):
            return "day", date(int(m[1]), int(m[2]), int(m[3]))
        if m := MONTH.match(q):
            year, month = int(m[2]), int(m[1])
            if 1 <= month <= 12:
                return "month", (year, month)
        if m := DAY.match(q):
            year = int(m[3]) if m[3] else today.year
            if year < 100:
                year += 2000
            return "day", date(year, int(m[2]), int(m[1]))
    except ValueError:  # 31/02/2026: not a real date, search it as text
        pass
    return "text", q


def money(reservations):
    """Sums over non-cancelled reservations."""
    active = [r for r in reservations if r.status != Reservation.Status.CANCELLED]
    total = sum((r.total for r in active), 0)
    paid = sum((r.paid_amount for r in active), 0)
    return {"total": total, "paid": paid, "remaining": max(total - paid, 0), "count": len(active)}


class SearchView(APIView):
    def get(self, request):
        q = " ".join(request.query_params.get("q", "").split())
        if len(q) < 2:
            return Response({"kind": "empty"})

        kind, value = parse_query(q)
        reservations = Reservation.objects.select_related("client", "occasion", "event_type").order_by("event_date", "start_time")

        if kind in ("day", "month"):
            if kind == "day":
                found = list(reservations.filter(event_date=value))
                blocked = BlockedDate.objects.filter(date=value)
                period = {"date": value.isoformat()}
            else:
                year, month = value
                found = list(reservations.filter(event_date__year=year, event_date__month=month))
                blocked = BlockedDate.objects.filter(date__year=year, date__month=month)
                period = {"start": date(year, month, 1).isoformat(), "end": date(year, month, monthrange(year, month)[1]).isoformat()}
            # Full client details for every reservation found.
            client_ids = {r.client_id for r in found}
            clients = ClientSerializer(clients_with_totals().filter(id__in=client_ids), many=True).data
            return Response({
                "kind": kind,
                **period,
                "blocked": BlockedDateSerializer(blocked, many=True).data,
                "reservations": ReservationListSerializer(found, many=True).data,
                "clients": {c["id"]: c for c in clients},
                "totals": money(found),
            })

        # Text: clients, then each client's reservations and money.
        digits = only_digits(q)
        qs, phone = match_phone(clients_with_totals(), q, "phone", "phone_alt")
        by_id_card = Q(id_card_number__icontains=digits) if len(digits) >= 3 else Q(pk__in=[])
        clients = list(qs.filter(Q(full_name__icontains=q) | Q(email__icontains=q) | phone | by_id_card)[:CLIENT_LIMIT])
        by_client = {}
        for r in reservations.filter(client__in=clients).order_by("-event_date"):
            by_client.setdefault(r.client_id, []).append(r)
        results = []
        for client in clients:
            mine = by_client.get(client.id, [])
            results.append({
                "client": ClientSerializer(client).data,
                "reservations": ReservationListSerializer(mine[:RESERVATIONS_PER_CLIENT], many=True).data,
                "totals": money(mine),
            })

        employees = []
        if request.user.is_staff:
            from apps.staff.models import Employee
            from apps.staff.serializers import EmployeeSerializer

            staff_qs, staff_phone = match_phone(Employee.objects.all(), q, "phone")
            match = staff_qs.filter(
                Q(last_name__icontains=q) | Q(first_name__icontains=q) | Q(position__icontains=q) | staff_phone
            )[:CLIENT_LIMIT]
            employees = EmployeeSerializer(match, many=True).data

        return Response({"kind": "text", "query": q, "clients": results, "employees": employees})
