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
