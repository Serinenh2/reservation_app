from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models

from apps.core.files import random_file_name


# Plain module functions (migrations can't store closures).
def photo_path(instance, filename):
    return random_file_name(f"employees/{instance.pk or 'new'}", "photo", filename)


def id_document_path(instance, filename):
    return random_file_name(f"employees/{instance.pk or 'new'}", "id", filename)


class Employee(models.Model):
    """
    A person working at the venue. Files are private: they are served only
    through the API to administrators (see views.EmployeeViewSet.photo).
    """

    last_name = models.CharField(max_length=80)
    first_name = models.CharField(max_length=80)
    position = models.CharField(max_length=80, blank=True)  # cook, waiter, cleaning...
    phone = models.CharField(max_length=40, blank=True)
    hire_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)  # left the company
    monthly_salary = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0"), validators=[MinValueValidator(Decimal("0"))]
    )
    notes = models.TextField(blank=True)
    photo = models.FileField(upload_to=photo_path, blank=True)
    id_document = models.FileField(upload_to=id_document_path, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["last_name", "first_name"]
        verbose_name = "Employé"

    @property
    def full_name(self):
        return f"{self.last_name} {self.first_name}".strip()

    def delete(self, *args, **kwargs):
        # Remove the files from disk with the record.
        for field in (self.photo, self.id_document):
            if field:
                field.delete(save=False)
        return super().delete(*args, **kwargs)

    def __str__(self):
        return self.full_name


class Absence(models.Model):
    """One day of absence. At most one per employee and day."""

    class Kind(models.TextChoices):
        UNJUSTIFIED = "unjustified"
        JUSTIFIED = "justified"
        SICK = "sick"
        LEAVE = "leave"  # paid leave / congé

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="absences")
    date = models.DateField()
    kind = models.CharField(max_length=12, choices=Kind.choices, default=Kind.UNJUSTIFIED)
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["date"]
        constraints = [models.UniqueConstraint(fields=["employee", "date"], name="one_absence_per_day")]
