from django.contrib import admin

from .models import EventType, ExtraService, Occasion, OccasionPriceTier, ServiceOption


class TierInline(admin.TabularInline):
    model = OccasionPriceTier
    extra = 0


class OptionInline(admin.TabularInline):
    model = ServiceOption
    extra = 0


@admin.register(Occasion)
class OccasionAdmin(admin.ModelAdmin):
    list_display = ("name_fr", "name_ar", "default_price", "is_active")
    list_filter = ("is_active",)
    inlines = [TierInline]


@admin.register(ExtraService)
class ExtraServiceAdmin(admin.ModelAdmin):
    list_display = ("name_fr", "name_ar", "price", "is_active")
    list_filter = ("is_active",)
    inlines = [OptionInline]


@admin.register(EventType)
class EventTypeAdmin(admin.ModelAdmin):
    list_display = ("name_fr", "name_ar", "is_active")
    list_filter = ("is_active",)
