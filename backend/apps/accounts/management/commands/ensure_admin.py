"""
Creates the first administrator account automatically on startup,
using ADMIN_USERNAME / ADMIN_PASSWORD from the .env file.

It never changes the password of an account that already exists,
so it is safe to run on every start.
"""
import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create the admin user from environment variables if missing."

    def handle(self, *args, **options):
        username = os.environ.get("ADMIN_USERNAME", "").strip()
        password = os.environ.get("ADMIN_PASSWORD", "").strip()
        email = os.environ.get("ADMIN_EMAIL", "").strip()

        if not username or not password:
            self.stdout.write(self.style.WARNING("ADMIN_USERNAME/ADMIN_PASSWORD not set, skipping."))
            return

        User = get_user_model()
        if User.objects.filter(username=username).exists():
            self.stdout.write(f"Admin '{username}' already exists.")
            return

        User.objects.create_superuser(username=username, email=email, password=password)
        self.stdout.write(self.style.SUCCESS(f"Admin '{username}' created."))
