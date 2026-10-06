from django.contrib.auth import get_user_model
from django.core import mail
from rest_framework.test import APITestCase

from .models import AppSettings


class HealthTests(APITestCase):
    def test_health_is_public(self):
        res = self.client.get("/api/health/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["database"], "ok")


class SettingsTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.staff = User.objects.create_user("admin", password="x", is_staff=True)
        self.employee = User.objects.create_user("employe", password="x")

    def test_single_row(self):
        AppSettings.load()
        AppSettings(company_name="Autre").save()
        self.assertEqual(AppSettings.objects.count(), 1)

    def test_employee_can_read_but_not_write(self):
        self.client.force_authenticate(self.employee)
        self.assertEqual(self.client.get("/api/settings/").status_code, 200)
        res = self.client.patch("/api/settings/", {"company_name": "X"})
        self.assertEqual(res.status_code, 403)

    def test_staff_can_update(self):
        self.client.force_authenticate(self.staff)
        res = self.client.patch("/api/settings/", {"min_confirmation_payment": 30000})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["min_confirmation_payment"], 30000)

    def test_negative_minimum_payment_rejected(self):
        self.client.force_authenticate(self.staff)
        res = self.client.patch("/api/settings/", {"min_confirmation_payment": -5})
        self.assertEqual(res.status_code, 400)
        self.assertIn("min_confirmation_payment", res.data)


class EmailTaskTests(APITestCase):
    def test_test_email_is_sent(self):
        staff = get_user_model().objects.create_user("admin", password="x", is_staff=True)
        self.client.force_authenticate(staff)
        res = self.client.post("/api/system/test-email/", {"to": "client@example.com"})
        self.assertEqual(res.status_code, 202)
        # Without Redis, the task runs inline (eager mode).
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["client@example.com"])


class InitialDataTests(APITestCase):
    """The venue setup is loaded on the first launch only, and never undoes the client's changes."""

    def setUp(self):
        import tempfile

        from django.test import override_settings

        self.data_dir = tempfile.mkdtemp()
        self.override = override_settings(DATA_DIR=self.data_dir)
        self.override.enable()

    def tearDown(self):
        import shutil

        self.override.disable()
        shutil.rmtree(self.data_dir, ignore_errors=True)

    def load(self):
        from django.core.management import call_command

        call_command("load_initial_data", verbosity=0, stdout=__import__("io").StringIO())

    def test_first_launch_loads_the_setup_then_never_again(self):
        from apps.catalog.models import ExtraService, Occasion

        self.load()
        self.assertTrue(Occasion.objects.exists())
        self.assertTrue(ExtraService.objects.exists())
        self.assertTrue(Occasion.objects.filter(tiers__isnull=False).exists())  # price grids too
        self.assertEqual(AppSettings.load().company_name_ar, "إيمان الذهبية")

        # The client deletes a service and renames the venue...
        ExtraService.objects.first().delete()
        remaining = ExtraService.objects.count()
        settings = AppSettings.load()
        settings.company_name = "Nouveau nom"
        settings.save()
        # ...the next start must not bring anything back.
        self.load()
        self.assertEqual(ExtraService.objects.count(), remaining)
        self.assertEqual(AppSettings.load().company_name, "Nouveau nom")

    def test_existing_setup_is_kept(self):
        from apps.catalog.models import EventType

        EventType.objects.create(name_fr="Henné", name_ar="حنة")
        self.load()
        self.assertEqual(list(EventType.objects.values_list("name_fr", flat=True)), ["Henné"])
