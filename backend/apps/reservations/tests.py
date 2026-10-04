from datetime import date, time
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APITestCase

from apps.catalog.models import EventType, ExtraService, Occasion, OccasionPriceTier, ServiceOption
from apps.clients.models import Client
from apps.core.models import AppSettings

from . import services
from .models import BlockedDate, Reservation

D = Decimal


class ComputeTotalsTests(TestCase):
    def test_services_and_fixed_discount(self):
        t = services.compute_totals(D("150000"), [(D("20000"), 1), (D("500"), 100)], "fixed", D("10000"))
        self.assertEqual(t["services_total"], D("70000.00"))
        self.assertEqual(t["subtotal"], D("220000.00"))
        self.assertEqual(t["total"], D("210000.00"))

    def test_percent_discount_rounds_to_cents(self):
        t = services.compute_totals(D("99999"), [], "percent", D("33.33"))
        self.assertEqual(t["discount_amount"], D("33329.67"))
        self.assertEqual(t["total"], D("66669.33"))

    def test_discount_cannot_exceed_subtotal(self):
        with self.assertRaisesMessage(ValueError, "discount_too_high"):
            services.compute_totals(D("1000"), [], "fixed", D("1001"))
        with self.assertRaisesMessage(ValueError, "discount_too_high"):
            services.compute_totals(D("1000"), [], "percent", D("101"))


class ConflictTests(TestCase):
    def setUp(self):
        self.client_obj = Client.objects.create(full_name="Sarah", phone="0550123456")
        self.occasion = Occasion.objects.create(name_fr="Mariage", name_ar="زفاف", default_price=0)

    def book(self, day, start, end, **kw):
        return Reservation.objects.create(
            client=self.client_obj, occasion=self.occasion, event_date=day,
            start_time=start, end_time=end, base_price=0, **kw,
        )

    def test_after_midnight_overlaps_next_day(self):
        # 15 Oct 19:00 -> 16 Oct 01:00 blocks an event on 16 Oct at 00:00.
        self.book(date(2026, 10, 15), time(19), time(1))
        self.assertTrue(services.find_conflicts(date(2026, 10, 16), time(0), time(3)))
        self.assertFalse(services.find_conflicts(date(2026, 10, 16), time(1), time(5)))  # touching is fine

    def test_same_day_non_overlapping_allowed_when_setting_on(self):
        self.book(date(2026, 10, 15), time(12), time(16))
        self.assertFalse(services.find_conflicts(date(2026, 10, 15), time(18), time(23)))
        self.assertTrue(services.find_conflicts(date(2026, 10, 15), time(15), time(17)))

    def test_same_day_refused_when_setting_off(self):
        settings = AppSettings.load()
        settings.allow_multiple_events_per_day = False
        settings.save()
        self.book(date(2026, 10, 15), time(12), time(16))
        self.assertTrue(services.find_conflicts(date(2026, 10, 15), time(18), time(23)))

    def test_cancelled_reservations_free_the_slot(self):
        self.book(date(2026, 10, 15), time(19), time(23), status=Reservation.Status.CANCELLED)
        self.assertFalse(services.find_conflicts(date(2026, 10, 15), time(19), time(23)))


class ReservationApiTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user("employe", password="x")
        self.staff = User.objects.create_user("admin", password="x", is_staff=True)
        self.client.force_authenticate(self.user)
        self.person = Client.objects.create(full_name="Sarah Benali", phone="0550123456")
        self.wedding = Occasion.objects.create(name_fr="Mariage", name_ar="زفاف", default_price=150000)
        self.event_type = EventType.objects.create(name_fr="Mariage", name_ar="زفاف")
        self.dj = ExtraService.objects.create(name_fr="DJ", name_ar="دي جي", price=20000)
        settings = AppSettings.load()
        settings.min_confirmation_payment = D("20000")
        settings.save()

    def payload(self, **kw):
        data = {
            "client_id": self.person.id,
            "event_type": self.event_type.id,
            "occasion": self.wedding.id,
            "event_date": "2026-10-15",
            "start_time": "19:00",
            "end_time": "01:00",
            "guests_women": 120,
            "guests_men": 130,
            "guests_children": 30,
            "discount_type": "fixed",
            "discount_value": 10000,
            "services": [{"service": self.dj.id, "quantity": 1}],
        }
        data.update(kw)
        return data

    def create(self, **kw):
        return self.client.post("/api/reservations/", self.payload(**kw), format="json")

    def test_create_calculates_totals_on_server(self):
        # Even if the browser sends a fake total, the server ignores it.
        res = self.create(total=1)
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["base_price"], 150000)  # from the occasion
        self.assertEqual((res.data["guests"], res.data["guests_children"]), (250, 30))  # children not in the total
        self.assertEqual(res.data["total"], 160000)
        self.assertEqual(res.data["status"], "pending")
        self.assertEqual(res.data["services"][0]["unit_price"], 20000)

    def test_tier_price_and_service_option(self):
        OccasionPriceTier.objects.create(occasion=self.wedding, max_guests=100, price=160000)
        OccasionPriceTier.objects.create(occasion=self.wedding, max_guests=300, price=300000)
        photo = ExtraService.objects.create(name_fr="Photographe", name_ar="مصور", price=0)
        travel = ServiceOption.objects.create(service=photo, name_fr="Avec déplacement", name_ar="مع التنقل", price=40000)
        other = ServiceOption.objects.create(service=self.dj, name_fr="X", name_ar="X", price=1)

        # option required for a service that has options
        res = self.create(services=[{"service": photo.id}])
        self.assertEqual(res.status_code, 400)
        # option from another service refused
        res = self.create(services=[{"service": photo.id, "option": other.id}])
        self.assertEqual(res.status_code, 400)

        res = self.create(guests_women=100, guests_men=150, discount_type="none", services=[{"service": photo.id, "option": travel.id}])
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["base_price"], 300000)  # 250 guests -> "up to 300" tier
        self.assertEqual(res.data["services"][0]["option_fr"], "Avec déplacement")
        self.assertEqual(res.data["total"], 340000)

    def test_event_type_required_and_returned(self):
        res = self.create(event_type=None)
        self.assertEqual(res.status_code, 400)
        self.assertIn("event_type", res.data)
        res = self.create()
        self.assertEqual((res.data["event_type_fr"], res.data["occasion_fr"]), ("Mariage", "Mariage"))
        self.event_type.is_active = False
        self.event_type.save()
        self.assertEqual(self.create(event_date="2026-12-01").status_code, 400)  # archived type refused

    def test_conflict_is_reported_with_details(self):
        self.create()
        res = self.create(event_date="2026-10-16", start_time="00:00", end_time="04:00")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["event_date"], ["time_conflict"])
        self.assertEqual(res.data["conflicts"][0]["client"], "Sarah Benali")

    def test_blocked_date_refused(self):
        BlockedDate.objects.create(date=date(2026, 10, 15), reason="Travaux")
        res = self.create()
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["event_date"], ["date_blocked"])

    def test_cannot_block_a_date_with_reservations(self):
        self.create()
        self.client.force_authenticate(self.staff)
        res = self.client.post("/api/blocked-dates/", {"date": "2026-10-15"})
        self.assertEqual(res.status_code, 400)

    def test_payments_update_status_and_refuse_overpayment(self):
        rid = self.create().data["id"]
        pay = lambda amount: self.client.post(  # noqa: E731
            f"/api/reservations/{rid}/payments/", {"amount": amount, "paid_on": "2026-09-01"}, format="json"
        )
        res = pay(15000)
        self.assertEqual(res.status_code, 201)
        self.assertEqual((res.data["status"], res.data["payment_state"]), ("pending", "partial"))
        res = pay(5000)
        self.assertEqual(res.data["status"], "confirmed")
        self.assertEqual(res.data["remaining_amount"], 140000)
        self.assertEqual(pay(140001).status_code, 400)
        self.assertEqual(pay(140000).data["payment_state"], "paid")

    def test_deleting_payment_is_staff_only_and_recomputes_status(self):
        rid = self.create().data["id"]
        res = self.client.post(f"/api/reservations/{rid}/payments/", {"amount": 20000, "paid_on": "2026-09-01"})
        pid = res.data["payments"][0]["id"]
        self.assertEqual(self.client.delete(f"/api/reservations/{rid}/payments/{pid}/").status_code, 403)
        self.client.force_authenticate(self.staff)
        res = self.client.delete(f"/api/reservations/{rid}/payments/{pid}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], "pending")

    def test_discount_below_paid_refused(self):
        rid = self.create().data["id"]
        self.client.post(f"/api/reservations/{rid}/payments/", {"amount": 150000, "paid_on": "2026-09-01"})
        res = self.client.patch(f"/api/reservations/{rid}/", {"discount_value": 50000}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["discount_value"], ["total_below_paid"])

    def test_cancel_frees_date_and_restore_rechecks(self):
        rid = self.create().data["id"]
        self.assertEqual(self.client.post(f"/api/reservations/{rid}/cancel/").data["status"], "cancelled")
        other = self.create()
        self.assertEqual(other.status_code, 201)
        res = self.client.post(f"/api/reservations/{rid}/restore/")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["event_date"], ["time_conflict"])

    def test_edit_keeps_own_slot(self):
        rid = self.create().data["id"]
        res = self.client.patch(f"/api/reservations/{rid}/", {"end_time": "02:00", "guests_men": 180}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual((res.data["guests_women"], res.data["guests_men"], res.data["guests"]), (120, 180, 300))

    def test_delete_is_staff_only_and_removes_payments(self):
        rid = self.create().data["id"]
        self.client.post(f"/api/reservations/{rid}/payments/", {"amount": 5000, "paid_on": "2026-09-01"})
        self.assertEqual(self.client.delete(f"/api/reservations/{rid}/").status_code, 403)
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.delete(f"/api/reservations/{rid}/").status_code, 204)
        self.assertFalse(Reservation.objects.filter(pk=rid).exists())
        self.assertEqual(self.client.get(f"/api/reservations/{rid}/").status_code, 404)

    def test_client_with_reservations_cannot_be_deleted(self):
        self.create()
        res = self.client.delete(f"/api/clients/{self.person.id}/")
        self.assertEqual(res.status_code, 409)

    def test_calendar_returns_reservations_and_blocked_dates(self):
        self.create()
        BlockedDate.objects.create(date=date(2026, 10, 20))
        res = self.client.get("/api/calendar/", {"start": "2026-09-28", "end": "2026-11-08"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data["reservations"]), 1)
        self.assertEqual(res.data["blocked"][0]["date"], "2026-10-20")
        self.assertEqual(self.client.get("/api/calendar/", {"start": "x", "end": "y"}).status_code, 400)


class SearchTests(APITestCase):
    def setUp(self):
        from apps.reservations.search import parse_query  # noqa: F401

        User = get_user_model()
        self.staff = User.objects.create_user("admin", password="x", is_staff=True)
        self.user = User.objects.create_user("employe", password="x")
        self.client.force_authenticate(self.user)
        self.sarah = Client.objects.create(full_name="Sarah Benali", phone="0550 12 34 56", id_card_number="109876543210")
        occ = Occasion.objects.create(name_fr="Dîner", name_ar="عشاء")
        common = dict(client=self.sarah, occasion=occ, start_time=time(19), end_time=time(23), base_price=0)
        Reservation.objects.create(event_date=date(2026, 10, 15), total=170000, paid_amount=25000, status="confirmed", **common)
        Reservation.objects.create(event_date=date(2026, 11, 2), total=100000, paid_amount=0, **common)
        Reservation.objects.create(event_date=date(2026, 10, 20), total=999, status="cancelled", **common)
        BlockedDate.objects.create(date=date(2026, 10, 21), reason="Travaux")

    def search(self, q):
        return self.client.get("/api/search/", {"q": q}).data

    def test_parse_query(self):
        from apps.reservations.search import parse_query

        self.assertEqual(parse_query("15/10/2026"), ("day", date(2026, 10, 15)))
        self.assertEqual(parse_query("2026-10-15"), ("day", date(2026, 10, 15)))
        self.assertEqual(parse_query("15.10.26"), ("day", date(2026, 10, 15)))
        self.assertEqual(parse_query("10/2026"), ("month", (2026, 10)))
        self.assertEqual(parse_query("31/02/2026"), ("text", "31/02/2026"))
        self.assertEqual(parse_query("sarah")[0], "text")

    def test_date_gives_reservation_with_client_details(self):
        data = self.search("15/10/2026")
        self.assertEqual(data["kind"], "day")
        self.assertEqual(len(data["reservations"]), 1)
        client = data["clients"][self.sarah.id]
        self.assertEqual(client["id_card_number"], "109876543210")
        self.assertEqual(data["totals"]["remaining"], 145000)

    def test_blocked_day_and_month(self):
        self.assertEqual(self.search("21/10/2026")["blocked"][0]["reason"], "Travaux")
        month = self.search("10/2026")
        self.assertEqual(len(month["reservations"]), 2)  # cancelled one listed...
        self.assertEqual(month["totals"]["total"], 170000)  # ...but not counted

    def test_client_by_name_phone_or_id_card(self):
        for q in ("sarah", "0550 12", "0550123456", "10987654"):
            data = self.search(q)
            self.assertEqual([c["client"]["full_name"] for c in data["clients"]], ["Sarah Benali"], q)
        result = self.search("benali")["clients"][0]
        self.assertEqual(len(result["reservations"]), 3)
        self.assertEqual((result["totals"]["total"], result["totals"]["paid"], result["totals"]["remaining"]), (270000, 25000, 245000))

    def test_workers_only_for_staff(self):
        from apps.staff.models import Employee

        Employee.objects.create(last_name="Haddad", first_name="Yacine", hire_date=date(2024, 1, 1))
        self.assertEqual(self.search("haddad")["employees"], [])
        self.client.force_authenticate(self.staff)
        self.assertEqual(len(self.search("haddad")["employees"]), 1)
