from django.contrib import admin

from .models import AppSettings


@admin.register(AppSettings)
class AppSettingsAdmin(admin.ModelAdmin):
    list_display = ("company_name", "min_confirmation_payment", "allow_multiple_events_per_day")
