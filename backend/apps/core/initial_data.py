"""
Starting data for a new installation: the venue's setup (settings, occasion
types, formulas with their price grids, services with their options).
No clients, reservations, payments or employees.

  python manage.py export_initial_data   on the development computer: saves the
                                         current setup into FIXTURE (commit it)
  python manage.py load_initial_data     on every start (entrypoint.sh): loads
                                         FIXTURE once, on the very first launch

"Once" is remembered by a marker file next to the database (same Docker
volume), so later changes or deletions by the client are never undone.
"""
from pathlib import Path

from django.conf import settings

FIXTURE = Path(__file__).resolve().parent / "fixtures" / "initial_data.json"


def marker_path():
    return Path(settings.DATA_DIR) / ".initial_data_loaded"
