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
        self.assertEqual(names("0550123456"), ["Sarah Benali"])  # saved with spaces, typed without

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


class ClientIdDocumentTests(APITestCase):
    PDF = b"%PDF-1.4\n" + b"\x00" * 64

    def setUp(self):
        import tempfile

        from django.test import override_settings

        self.media = tempfile.mkdtemp()
        self.override = override_settings(MEDIA_ROOT=self.media)
        self.override.enable()
        self.client.force_authenticate(get_user_model().objects.create_user("employe", password="x"))

    def tearDown(self):
        import shutil

        self.override.disable()
        shutil.rmtree(self.media, ignore_errors=True)

    def test_upload_view_and_remove(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        res = self.client.post(
            "/api/clients/",
            {"full_name": "Sarah", "phone": "0550123456", "id_document": SimpleUploadedFile("cni.pdf", self.PDF)},
            format="multipart",
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual((res.data["has_id_document"], res.data["id_document_type"]), (True, "pdf"))
        self.assertNotIn("id_document", res.data)  # no public URL
        cid = res.data["id"]
        stored = Client.objects.get(pk=cid).id_document.name
        self.assertTrue(stored.startswith(f"clients/{cid}/id-"))

        doc = self.client.get(f"/api/clients/{cid}/id-document/")
        self.assertEqual(b"".join(doc.streaming_content), self.PDF)

        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(f"/api/clients/{cid}/id-document/").status_code, 401)

    def test_fake_file_refused_and_delete(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        cid = Client.objects.create(full_name="X", phone="0550123456").id
        res = self.client.patch(f"/api/clients/{cid}/", {"id_document": SimpleUploadedFile("a.pdf", b"MZ fake")}, format="multipart")
        self.assertEqual(res.data["id_document"], ["file_type"])
        self.client.patch(f"/api/clients/{cid}/", {"id_document": SimpleUploadedFile("a.pdf", self.PDF)}, format="multipart")
        self.assertEqual(self.client.delete(f"/api/clients/{cid}/id-document/").status_code, 204)
        self.assertFalse(self.client.get(f"/api/clients/{cid}/").data["has_id_document"])
