from django.contrib import admin

from .models import Absence, Employee


class AbsenceInline(admin.TabularInline):
    model = Absence
    extra = 0


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ("last_name", "first_name", "position", "hire_date", "end_date", "monthly_salary")
    search_fields = ("last_name", "first_name", "phone")
    inlines = [AbsenceInline]
