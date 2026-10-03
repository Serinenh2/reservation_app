from django.contrib import admin

from .models import BlockedDate, Payment, Reservation, ReservationService


class ServiceLineInline(admin.TabularInline):
    model = ReservationService
    extra = 0


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ("event_date", "start_time", "end_time", "client", "occasion", "total", "paid_amount", "status")
    list_filter = ("status", "occasion")
    search_fields = ("client__full_name", "client__phone")
    date_hierarchy = "event_date"
    inlines = [ServiceLineInline, PaymentInline]
    # Amounts are calculated by the API; don't edit them here.
    readonly_fields = ("services_total", "subtotal", "discount_amount", "total", "paid_amount", "status")


@admin.register(BlockedDate)
class BlockedDateAdmin(admin.ModelAdmin):
    list_display = ("date", "reason")
