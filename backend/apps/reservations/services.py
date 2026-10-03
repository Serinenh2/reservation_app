"""
Business rules that involve several models. Plain functions, no HTTP,
so they are easy to test (see tests.py).

  compute_totals()   price calculation (spec §10)
  event_window()     start/end as datetimes, handles "after midnight"
  find_conflicts()   overlapping reservations (spec §29 scenario 3)
  refresh_payments() paid amount + status from payments (spec §12)
"""
from datetime import datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.db.models import Sum

from apps.core.models import AppSettings

CENT = Decimal("0.01")
ZERO = Decimal("0")


def money(value):
    return Decimal(value).quantize(CENT, rounding=ROUND_HALF_UP)


def compute_totals(base_price, lines, discount_type, discount_value):
    """
    lines: iterable of (unit_price, quantity).
    Returns a dict of Decimals. Raises ValueError("discount_too_high")
    if the discount is larger than the subtotal or above 100 %.
    """
    base_price = money(base_price)
    services_total = money(sum((Decimal(p) * q for p, q in lines), ZERO))
    subtotal = base_price + services_total
    discount_value = money(discount_value or 0)

    if discount_type == "percent":
        if discount_value > 100:
            raise ValueError("discount_too_high")
        discount_amount = money(subtotal * discount_value / 100)
    elif discount_type == "fixed":
        if discount_value > subtotal:
            raise ValueError("discount_too_high")
        discount_amount = discount_value
    else:
        discount_amount = ZERO

    return {
        "services_total": services_total,
        "subtotal": subtotal,
        "discount_amount": discount_amount,
        "total": subtotal - discount_amount,
    }


def event_window(event_date, start_time, end_time):
    """
    (start, end) as naive datetimes. An end time earlier than (or equal to)
    the start time means the event finishes the next day: 19:00 -> 01:00.
    """
    start = datetime.combine(event_date, start_time)
    end = datetime.combine(event_date, end_time)
    if end <= start:
        end += timedelta(days=1)
    return start, end


def find_conflicts(event_date, start_time, end_time, exclude_id=None):
    """
    Active reservations that overlap the given time range.
    Also checks the previous and next day, for events crossing midnight.
    If the settings forbid several events per day, any reservation on the
    same date is a conflict.
    """
    from .models import Reservation

    start, end = event_window(event_date, start_time, end_time)
    candidates = (
        Reservation.objects.exclude(status=Reservation.Status.CANCELLED)
        .filter(event_date__range=(event_date - timedelta(days=1), event_date + timedelta(days=1)))
        .select_related("client")
    )
    if exclude_id:
        candidates = candidates.exclude(pk=exclude_id)

    allow_multiple = AppSettings.load().allow_multiple_events_per_day
    conflicts = []
    for other in candidates:
        if not allow_multiple and other.event_date == event_date:
            conflicts.append(other)
            continue
        other_start, other_end = event_window(other.event_date, other.start_time, other.end_time)
        # Two ranges overlap when each one starts before the other ends.
        # Touching ranges (one ends at 18:00, the next starts at 18:00) are fine.
        if start < other_end and other_start < end:
            conflicts.append(other)
    return conflicts


def is_blocked(event_date):
    from .models import BlockedDate

    return BlockedDate.objects.filter(date=event_date).exists()


def status_for(paid_amount, current_status):
    """Cancelled stays cancelled; otherwise the payments decide."""
    from .models import Reservation

    if current_status == Reservation.Status.CANCELLED:
        return current_status
    minimum = AppSettings.load().min_confirmation_payment
    return Reservation.Status.CONFIRMED if paid_amount >= minimum else Reservation.Status.PENDING


def refresh_payments(reservation):
    """Recalculate the paid amount and the status after a payment change."""
    paid = reservation.payments.aggregate(s=Sum("amount"))["s"] or ZERO
    reservation.paid_amount = money(paid)
    reservation.status = status_for(reservation.paid_amount, reservation.status)
    reservation.save(update_fields=["paid_amount", "status", "updated_at"])
    return reservation
