# Architecture

## The big picture

```
 Browser (http://localhost:3000)
        │
   ┌────▼─────────────┐
   │ frontend (nginx) │  serves the built React app
   │                  │  forwards /api, /django-admin, /static ┐
   └──────────────────┘                                   │
                                                 ┌────────▼────────┐
                                                 │ backend (Django)│──► SQLite (volume db_data)
                                                 │ gunicorn :8000  │
                                                 └────────┬────────┘
                                          queues tasks    │
                                                 ┌────────▼────────┐      ┌──────────────────┐
                                                 │ redis           │◄─────│ worker (Celery)  │
                                                 └─────────────────┘      │ emails, PDF, ... │
                                                                          └──────────────────┘
```

Everything is one address (`localhost:3000`) thanks to nginx, so there is
no CORS configuration and no second port to remember.

## Key decisions (and why)

| Decision | Why |
|---|---|
| **SQLite in WAL mode** | One laptop, one user at a time: no database server to install or maintain. WAL lets the web server and the worker write without "database is locked" errors. The file is easy to back up. |
| **JWT (SimpleJWT)** | Required by the stack. Access token 60 min, refresh 7 days. Tokens live in `localStorage`: acceptable on a single office machine, cleared on logout. |
| **Celery + Redis** | Required by the stack, for slow or failing work (emails, PDF generation, backups). **Fallback:** if `CELERY_BROKER_URL` is empty, tasks run immediately in Django ("eager mode"), so local development needs no Redis. |
| **Emails default to the console backend** | The app must work offline. Emails are printed in `docker compose logs worker`. Switch to SMTP in `.env` when internet is available; failed sends retry automatically. |
| **Frontend owns all translations** | Every visible text lives in `frontend/src/i18n/locales/{fr,ar}.json`. The backend returns data and field names; the frontend decides the words. One place to translate, no mixing. |
| **Money as `Decimal` in Django** | Never floats for amounts. All totals are **recalculated on the server** (`reservations/services.py`); the frontend calculation is only a preview. |
| **One Django app per business area** | Small, focused folders a beginner can navigate. |
| **React Query for server data** | Loading, caching, refreshing and errors handled the same way everywhere. No hand-written `useEffect` + `fetch`. |

## Backend layout

```
backend/
  config/            settings, URLs, Celery app
  apps/
    accounts/        login (JWT), /me, ensure_admin command
    core/            AppSettings (single row), health check, email task
    clients/         Client (search by name or phone, totals per client)
    catalog/         Occasion, ExtraService (never deleted: archived)
    reservations/    Reservation, ReservationService, Payment, BlockedDate,
                     services.py (prices, overlaps, status), calendar
    staff/           Employee (photo, ID document, salary), Absence. Admins only.
    -- planned --
    backups/         Phase 6
```

Inside each app: `models.py` (tables) → `serializers.py` (validation +
JSON) → `views.py` (endpoints) → `urls.py` → `tests.py`. Business rules
that involve several models (price calculation, conflict detection,
status from payments) will live in a `services.py` file, so they can be
tested without HTTP.

### API

| Method | URL | Who |
|---|---|---|
| POST | `/api/auth/token/` | anyone (login) |
| POST | `/api/auth/token/refresh/` | anyone with a refresh token |
| GET | `/api/auth/me/` | logged in |
| GET | `/api/health/` | anyone |
| GET / PATCH | `/api/settings/` | read: logged in, write: staff |
| POST | `/api/system/test-email/` | staff |
| GET / POST | `/api/clients/` (`?search=`) | logged in |
| GET / PATCH / DELETE | `/api/clients/<id>/` (delete refused if reservations, 409) | logged in |
| GET / POST / PATCH | `/api/catalog/occasions/`, `/api/catalog/services/` (`?active=1`) | read: logged in, write: staff |
| GET / POST | `/api/reservations/` (`?search= &status= &client= &date_from= &date_to= &ordering=date`) | logged in |
| GET / PATCH | `/api/reservations/<id>/` (no DELETE: cancel instead) | logged in |
| POST | `/api/reservations/<id>/cancel/`, `/restore/` | logged in |
| POST | `/api/reservations/<id>/payments/` | logged in |
| DELETE | `/api/reservations/<id>/payments/<payment_id>/` | staff |
| GET / POST / DELETE | `/api/blocked-dates/` (`?upcoming=1`) | read: logged in, write: staff |
| GET | `/api/calendar/?start=&end=` (max 62 days) | logged in |
| GET | `/api/search/?q=` a day (15/10/2026), a month (10/2026), or text (name, phone, email, ID card; workers for staff) | logged in |
| GET / POST | `/api/employees/` (`?status=current\|former &month=YYYY-MM`), multipart | staff |
| GET / PATCH / DELETE | `/api/employees/<id>/` | staff |
| GET / DELETE | `/api/employees/<id>/photo/`, `/id-document/` (the private file) | staff |
| GET / POST | `/api/employees/<id>/absences/` (`?month=YYYY-MM`) | staff |
| DELETE | `/api/employees/<id>/absences/<absence_id>/` | staff |

Validation errors are short codes (`{"event_date": ["time_conflict"]}`);
the frontend translates them from `errors.codes.*` in the locale files.

### Business rules (`apps/reservations/services.py`)

- **Total** = occasion price + Σ(service price × quantity) − discount.
  A fixed discount can't exceed the subtotal, a percentage can't exceed 100.
  Service prices are copied onto the reservation when booked.
- **Overlap**: an end time earlier than the start time means the next day
  (19:00 → 01:00). Neighbouring days are checked too. Touching ranges are
  allowed. If "several events per day" is off, any booking that day conflicts.
  Cancelled reservations never block anything.
- **Status**: `confirmed` once payments reach the minimum in Settings,
  otherwise `pending`; `cancelled` is only set by the cancel action.
  A payment can't exceed what is left to pay.

## Frontend layout

```
frontend/src/
  app/providers.jsx      React Query, theme, toasts, auth
  App.jsx                all routes
  i18n/                  i18next setup + fr.json / ar.json
  theme/                 light / dark / system
  lib/                   api (Axios + JWT refresh), formatters
  components/ui/         the component library (Button, Field, Modal…)
  components/layout/     shell, sidebar, top bar, switchers
  features/auth/         login page, auth context, route guard
  pages/                 one file per page
  features/clients/      list, detail + history, form modal, client picker
  features/catalog/      occasions + services (one page, two kinds)
  features/reservations/ list, form, detail + payments, pricing preview
  features/calendar/     month view, blocked dates
  features/employees/    list, detail (absences by month), form with uploads
  features/search/       one-box search: day, month, client (with money totals), worker
  features/documents/    receipt (A5) + commitment "تعهد و إلتزام" (A4): preview, PDF (browser rendering), Word (docx)
```

A feature folder will contain its API hooks (`api.js`), its components,
and its pages, so a feature can be read top to bottom in one place.

## RTL rules

- `<html dir>` switches automatically with the language.
- Use **logical** Tailwind classes: `ms-/me-` (margin start/end),
  `ps-/pe-`, `start-/end-`, `text-start/text-end`. Never `ml-`, `left-`.
- Directional icons (arrows, chevrons, send, logout) get
  `rtl:-scale-x-100`.
- Phone numbers, times, amounts and emails stay `dir="ltr"` inside Arabic text.
- Charts keep `dir="ltr"` on their container and reverse the time axis in Arabic.

## Uploaded files (employee photos and ID documents)

- Stored in `DATA_DIR/media/employees/<id>/` (the same Docker volume as the
  database), under random names.
- **No public URL**: Django never serves `MEDIA_ROOT`. Files are only sent by
  `/api/employees/<id>/photo/` and `/id-document/`, which require an
  administrator token. The frontend downloads them with the token and shows
  them from a temporary local URL (`useAuthedFile`).
- Checked on upload: extension **and** the file's first bytes (JPG, PNG,
  WebP, PDF), photo ≤ 5 MB, ID document ≤ 10 MB.
