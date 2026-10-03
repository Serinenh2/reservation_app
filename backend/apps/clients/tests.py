from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from .models import Client


class ClientApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user("employe", password="x")
        self.client.force_authenticate(self.user)

    def test_create_and_search_by_name_or_phone(self):
        res = self.client.post("/api/clients/", {"full_name": "  Sarah   Benali ", "phone": "0550 12 34 56"})
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["full_name"], "Sarah Benali")
        Client.objects.create(full_name="Yacine Haddad", phone="0661987654")

        names = lambda q: [c["full_name"] for c in self.client.get("/api/clients/", {"search": q}).data["results"]]  # noqa: E731
        self.assertEqual(names("sarah"), ["Sarah Benali"])
        self.assertEqual(names("0661 98"), ["Yacine Haddad"])

    def test_invalid_phone_rejected(self):
        res = self.client.post("/api/clients/", {"full_name": "X", "phone": "abc"})
        self.assertEqual(res.status_code, 400)
        self.assertIn("phone", res.data)

    def test_requires_login(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get("/api/clients/").status_code, 401)


class ClientTotalsTests(APITestCase):
    def test_detail_sums_active_reservations_only(self):
        from datetime import date, time

        from apps.catalog.models import Occasion
        from apps.reservations.models import Reservation

        self.client.force_authenticate(get_user_model().objects.create_user("u", password="x"))
        person = Client.objects.create(full_name="Sarah", phone="0550123456")
        occ = Occasion.objects.create(name_fr="Mariage", name_ar="زفاف")
        common = dict(client=person, occasion=occ, start_time=time(19), end_time=time(23), base_price=0)
        Reservation.objects.create(event_date=date(2026, 1, 1), total=100000, paid_amount=30000, **common)
        Reservation.objects.create(event_date=date(2026, 2, 1), total=50000, status="cancelled", **common)
        data = self.client.get(f"/api/clients/{person.id}/").data
        self.assertEqual((data["reservation_count"], data["total_amount"], data["paid_amount"]), (2, 100000, 30000))
