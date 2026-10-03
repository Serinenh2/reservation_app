from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from .models import Occasion


class CatalogTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.staff = User.objects.create_user("admin", password="x", is_staff=True)
        self.employee = User.objects.create_user("employe", password="x")

    def test_staff_creates_occasion_and_delete_is_soft(self):
        self.client.force_authenticate(self.staff)
        res = self.client.post("/api/catalog/occasions/", {"name_fr": "Mariage", "name_ar": "زفاف", "default_price": 150000})
        self.assertEqual(res.status_code, 201)
        oid = res.data["id"]
        self.assertEqual(self.client.delete(f"/api/catalog/occasions/{oid}/").status_code, 204)
        self.assertFalse(Occasion.objects.get(pk=oid).is_active)  # still there
        active = self.client.get("/api/catalog/occasions/", {"active": "1"}).data
        self.assertEqual(active, [])

    def test_employee_reads_but_cannot_write(self):
        self.client.force_authenticate(self.employee)
        self.assertEqual(self.client.get("/api/catalog/services/").status_code, 200)
        res = self.client.post("/api/catalog/services/", {"name_fr": "DJ", "name_ar": "دي جي", "price": 20000})
        self.assertEqual(res.status_code, 403)

    def test_negative_price_rejected(self):
        self.client.force_authenticate(self.staff)
        res = self.client.post("/api/catalog/services/", {"name_fr": "DJ", "name_ar": "دي جي", "price": -1})
        self.assertEqual(res.status_code, 400)


class TiersAndOptionsTests(APITestCase):
    def setUp(self):
        self.client.force_authenticate(get_user_model().objects.create_user("admin", password="x", is_staff=True))

    def test_tiers_pick_price_by_guests(self):
        res = self.client.post("/api/catalog/occasions/", {
            "name_fr": "Dîner", "name_ar": "عشاء", "default_price": 0,
            "tiers": [{"max_guests": 200, "price": 280000}, {"max_guests": 100, "price": 160000}],
        }, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual([t["max_guests"] for t in res.data["tiers"]], [100, 200])  # sorted
        occ = Occasion.objects.get(pk=res.data["id"])
        self.assertEqual([occ.price_for(n) for n in (None, 100, 101, 200, 500)], [160000, 160000, 280000, 280000, 280000])

    def test_duplicate_tier_refused(self):
        res = self.client.post("/api/catalog/occasions/", {
            "name_fr": "Dîner", "name_ar": "عشاء",
            "tiers": [{"max_guests": 100, "price": 1}, {"max_guests": 100, "price": 2}],
        }, format="json")
        self.assertEqual(res.status_code, 400)

    def test_options_are_updated_in_place(self):
        res = self.client.post("/api/catalog/services/", {
            "name_fr": "Photographe", "name_ar": "مصور", "price": 0,
            "options": [{"name_fr": "Dans la salle", "name_ar": "داخل القاعة", "price": 35000},
                        {"name_fr": "Avec déplacement", "name_ar": "مع التنقل", "price": 40000}],
        }, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        sid, first = res.data["id"], res.data["options"][0]
        res = self.client.patch(f"/api/catalog/services/{sid}/", {
            "options": [{**first, "price": 36000}],
        }, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual([(o["id"], o["price"]) for o in res.data["options"]], [(first["id"], 36000)])
