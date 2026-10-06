"""
Save the current setup (settings, occasion types, formulas + price grids,
services + options) as the starting data of new installations.

Run on the development computer before deploying, then commit the file:
    python manage.py export_initial_data
"""
import json

from django.core import serializers
from django.core.management.base import BaseCommand

from apps.catalog.models import EventType, ExtraService, Occasion, OccasionPriceTier, ServiceOption
from apps.core.initial_data import FIXTURE
from apps.core.models import AppSettings


class Command(BaseCommand):
    help = "Export the venue setup to apps/core/fixtures/initial_data.json."

    def handle(self, *args, **options):
        querysets = [
            AppSettings.objects.all(),
            EventType.objects.all(),
            Occasion.objects.all(),
            OccasionPriceTier.objects.all(),
            ExtraService.objects.all(),
            ServiceOption.objects.all(),
        ]
        data = []
        for qs in querysets:
            data += json.loads(serializers.serialize("json", qs.order_by("pk")))

        FIXTURE.parent.mkdir(parents=True, exist_ok=True)
        FIXTURE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

        counts = {}
        for item in data:
            counts[item["model"]] = counts.get(item["model"], 0) + 1
        for model, n in counts.items():
            self.stdout.write(f"  {model}: {n}")
        self.stdout.write(self.style.SUCCESS(f"Saved {len(data)} records to {FIXTURE}"))
