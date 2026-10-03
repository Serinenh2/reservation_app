"""
Celery = background worker.

Why: some jobs are slow or can fail (sending an email, generating a PDF,
exporting a backup). Running them in the background keeps the interface fast.

If CELERY_BROKER_URL is empty (e.g. running without Docker), tasks run
immediately in the same process ("eager mode"), so the app still works.
"""
import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("reservations")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
