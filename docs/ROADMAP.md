# Roadmap

| Phase | Content | State |
|---|---|---|
| 1 | Docker, Django + DRF + JWT, Celery/Redis, React + Router + Query, i18n FR/AR + RTL, light/dark, design system, layout, settings | ✅ done |
| 2 | Clients, occasions (FR/AR names, default price), extra services (price, soft delete) | ✅ done |
| 3 | Reservation form, server-side price calculation, discount (fixed / %), payments in instalments, status from minimum payment | ✅ done |
| 4 | Monthly calendar with status colors, overlap detection (including after midnight), blocked dates | ✅ done |
| 5 | Search and filters, client history (dashboard removed at the owner's request) | ✅ done |
| 6 | Payment receipt (Documents page, PDF + Word, Arabic RTL) ✅ · email confirmations, backup export/restore, final polish | next |

## Phase 1 verification

- [x] 11 backend tests pass (`python manage.py test`)
- [x] Frontend builds (`npm run build`)
- [x] Login, wrong password, logout, session refresh
- [x] French LTR / Arabic RTL, desktop and mobile
- [x] Light / dark / system theme
- [x] Settings saved by staff, read-only for others, negative minimum refused by the backend
- [x] `docker compose up -d --build` (via `Ouvrir Réservations.bat`): 4 containers healthy, queue on Redis
- [x] Restart backend/worker, data and uploaded files persist (spec scenario 6)
- [x] `Sauvegarde.bat`: database copy passes integrity check, files archive matches it

## Phases 2-5 verification

- [x] 38 backend tests pass: price calculation, discount limits, overlaps
      (after midnight, touching ranges, one-event-per-day setting), blocked
      dates, payments -> status, overpayment refused, cancel/restore
- [x] Frontend builds (`npm run build`), every translation key exists in fr and ar
- [x] Browser walkthrough: create a reservation from the form, conflict shown
      with a link to the other booking, payments, calendar (desktop + phone,
      French LTR + Arabic RTL, light + dark), client history
- [ ] Same checks on the target laptop with `docker compose up -d --build`
