import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase

from .models import Employee

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
PDF = b"%PDF-1.4\n" + b"\x00" * 64

MEDIA = tempfile.mkdtemp()


@override_settings(MEDIA_ROOT=MEDIA)
class EmployeeTests(APITestCase):
    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(MEDIA, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        User = get_user_model()
        self.staff = User.objects.create_user("admin", password="x", is_staff=True)
        self.employee_user = User.objects.create_user("employe", password="x")
        self.client.force_authenticate(self.staff)

    def create(self, **extra):
        data = {"last_name": "Haddad", "first_name": "Yacine", "hire_date": "2024-03-01", "monthly_salary": 45000, **extra}
        return self.client.post("/api/employees/", data, format="multipart")

    def test_staff_only(self):
        self.client.force_authenticate(self.employee_user)
        self.assertEqual(self.client.get("/api/employees/").status_code, 403)

    def test_create_with_files_and_download_them(self):
        res = self.create(
            photo=SimpleUploadedFile("moi.png", PNG, content_type="image/png"),
            id_document=SimpleUploadedFile("carte.pdf", PDF, content_type="application/pdf"),
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.assertTrue(res.data["has_photo"])
        self.assertEqual(res.data["id_document_type"], "pdf")
        self.assertNotIn("photo", res.data)  # never a public URL
        eid = res.data["id"]
        stored = Employee.objects.get(pk=eid).photo.name
        self.assertTrue(stored.startswith(f"employees/{eid}/photo-"))
        self.assertNotIn("moi", stored)  # user's file name not kept

        photo = self.client.get(f"/api/employees/{eid}/photo/")
        self.assertEqual(photo.status_code, 200)
        self.assertEqual(b"".join(photo.streaming_content), PNG)

        # an employee account can't download it
        self.client.force_authenticate(self.employee_user)
        self.assertEqual(self.client.get(f"/api/employees/{eid}/id-document/").status_code, 403)

    def test_fake_image_refused(self):
        res = self.create(photo=SimpleUploadedFile("virus.png", b"MZ not a png", content_type="image/png"))
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["photo"], ["file_type"])
        res = self.create(id_document=SimpleUploadedFile("doc.exe", PDF))
        self.assertEqual(res.status_code, 400)

    def test_delete_photo(self):
        eid = self.create(photo=SimpleUploadedFile("a.png", PNG)).data["id"]
        self.assertEqual(self.client.delete(f"/api/employees/{eid}/photo/").status_code, 204)
        self.assertFalse(self.client.get(f"/api/employees/{eid}/").data["has_photo"])
        self.assertEqual(self.client.get(f"/api/employees/{eid}/photo/").status_code, 404)

    def test_absences_by_month(self):
        eid = self.create().data["id"]
        add = lambda d, kind="unjustified": self.client.post(  # noqa: E731
            f"/api/employees/{eid}/absences/", {"date": d, "kind": kind}, format="json"
        )
        self.assertEqual(add("2026-10-05").status_code, 201)
        self.assertEqual(add("2026-10-12", "sick").status_code, 201)
        self.assertEqual(add("2026-11-02").status_code, 201)
        self.assertEqual(add("2026-10-05").data["date"], ["absence_exists"])  # same day twice
        self.assertEqual(add("2020-01-01").data["date"], ["outside_employment"])  # before hire date

        october = self.client.get(f"/api/employees/{eid}/absences/", {"month": "2026-10"}).data
        self.assertEqual([a["date"] for a in october], ["2026-10-05", "2026-10-12"])
        listing = self.client.get("/api/employees/", {"month": "2026-10"}).data
        self.assertEqual(listing[0]["absences_in_month"], 2)

        aid = october[0]["id"]
        self.assertEqual(self.client.delete(f"/api/employees/{eid}/absences/{aid}/").status_code, 204)

    def test_end_date_before_hire_refused(self):
        res = self.create(end_date="2024-01-01")
        self.assertEqual(res.data["end_date"], ["end_before_start"])
