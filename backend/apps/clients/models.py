from django.db import models


class Client(models.Model):
    """A person who books an event. Kept forever for the history."""

    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=40, db_index=True)
    phone_alt = models.CharField(max_length=40, blank=True)
    email = models.EmailField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["full_name"]
        verbose_name = "Client"

    def __str__(self):
        return f"{self.full_name} ({self.phone})"
