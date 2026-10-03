import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { FullPageSpinner } from '@/components/ui'
import AppShell from '@/components/layout/AppShell'
import RequireAuth from '@/features/auth/RequireAuth'
import LoginPage from '@/features/auth/LoginPage'
import SettingsPage from '@/pages/SettingsPage'
import NotFoundPage from '@/pages/NotFoundPage'
import ClientsPage from '@/features/clients/ClientsPage'
import ClientDetailPage from '@/features/clients/ClientDetailPage'
import CatalogPage from '@/features/catalog/CatalogPage'
import ReservationsPage from '@/features/reservations/ReservationsPage'
import ReservationFormPage from '@/features/reservations/ReservationFormPage'
import ReservationDetailPage from '@/features/reservations/ReservationDetailPage'
import CalendarPage from '@/features/calendar/CalendarPage'
import BlockedDatesPage from '@/features/calendar/BlockedDatesPage'

// Loaded only when opened (contains the charts library).
const DesignSystemPage = lazy(() => import('@/pages/DesignSystemPage'))

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            {/* The app opens on the calendar */}
            <Route index element={<Navigate to="/calendar" replace />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="reservations" element={<ReservationsPage />} />
            <Route path="reservations/new" element={<ReservationFormPage />} />
            <Route path="reservations/:id" element={<ReservationDetailPage />} />
            <Route path="reservations/:id/edit" element={<ReservationFormPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="clients/:id" element={<ClientDetailPage />} />
            <Route path="admin/event-types" element={<CatalogPage key="event-types" kind="event-types" />} />
            <Route path="admin/occasions" element={<CatalogPage key="occasions" kind="occasions" />} />
            <Route path="admin/services" element={<CatalogPage key="services" kind="services" />} />
            <Route path="admin/blocked-dates" element={<BlockedDatesPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route
              path="design-system"
              element={
                <Suspense fallback={<FullPageSpinner />}>
                  <DesignSystemPage />
                </Suspense>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
