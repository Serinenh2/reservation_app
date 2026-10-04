from django.db import models

from apps.core.files import random_file_name


def id_document_path(instance, filename):
    return random_file_name(f"clients/{instance.pk or 'new'}", "id", filename)


class Client(models.Model):
    """A person who books an event. Kept forever for the history."""

    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=40, db_index=True)
    phone_alt = models.CharField(max_length=40, blank=True)
    email = models.EmailField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    # ID card (printed on the commitment document "تعهد و إلتزام").
    id_card_number = models.CharField(max_length=40, blank=True)
    id_card_issued_on = models.DateField(null=True, blank=True)
    id_card_issued_at = models.CharField(max_length=100, blank=True)
    # Scan or photo of the ID card. Private: served only through the API.
    id_document = models.FileField(upload_to=id_document_path, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["full_name"]
        verbose_name = "Client"

    def delete(self, *args, **kwargs):
        if self.id_document:
            self.id_document.delete(save=False)
        return super().delete(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name} ({self.phone})"
