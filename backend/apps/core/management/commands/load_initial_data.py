"""
Load the starting data on the very first launch only (run by entrypoint.sh
on every start; it does nothing after the first time).

Skipped, and remembered as done, when:
  - it already ran (marker file next to the database), or
  - the database already has a setup (an installation older than this command).
"""
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.catalog.models import EventType, ExtraService, Occasion
from apps.core.initial_data import FIXTURE, marker_path


class Command(BaseCommand):
    help = "Load the venue setup on the first launch (once)."

    def handle(self, *args, **options):
        marker = marker_path()
        if marker.exists():
            self.stdout.write("Initial data: already loaded once, nothing to do.")
            return

        if EventType.objects.exists() or Occasion.objects.exists() or ExtraService.objects.exists():
            self.stdout.write("Initial data: this database already has a setup, kept as it is.")
        elif not FIXTURE.exists():
            self.stdout.write(self.style.WARNING("Initial data: no fixture file, starting empty."))
        else:
            with transaction.atomic():
                call_command("loaddata", str(FIXTURE), verbosity=0)
            self.stdout.write(self.style.SUCCESS("Initial data: venue setup loaded (first launch)."))

        marker.parent.mkdir(parents=True, exist_ok=True)
        marker.write_text("The starting data was handled on the first launch. Delete this file only to load it again.\n")
