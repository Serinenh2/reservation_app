from django.contrib.auth import get_user_model
from django.core.management import call_command
from rest_framework.test import APITestCase


class AuthTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user("employe", password="Passe-2026!")

    def test_login_returns_tokens_and_me_works(self):
        res = self.client.post("/api/auth/token/", {"username": "employe", "password": "Passe-2026!"})
        self.assertEqual(res.status_code, 200)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data["username"], "employe")

    def test_wrong_password_is_rejected(self):
        res = self.client.post("/api/auth/token/", {"username": "employe", "password": "nope"})
        self.assertEqual(res.status_code, 401)

    def test_me_requires_login(self):
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)

    def test_refresh(self):
        res = self.client.post("/api/auth/token/", {"username": "employe", "password": "Passe-2026!"})
        ref = self.client.post("/api/auth/token/refresh/", {"refresh": res.data["refresh"]})
        self.assertEqual(ref.status_code, 200)
        self.assertIn("access", ref.data)


class EnsureAdminTests(APITestCase):
    def test_creates_admin_once(self):
        import os
        os.environ["ADMIN_USERNAME"] = "patron"
        os.environ["ADMIN_PASSWORD"] = "Admin-2026!"
        try:
            call_command("ensure_admin", verbosity=0)
            call_command("ensure_admin", verbosity=0)  # second run must not fail
            user = get_user_model().objects.get(username="patron")
            self.assertTrue(user.is_superuser)
        finally:
            del os.environ["ADMIN_USERNAME"]
            del os.environ["ADMIN_PASSWORD"]
