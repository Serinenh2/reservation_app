import { CalendarDays, ClipboardList, Users, IdCard, FileText, Heart, PartyPopper, Sparkles, Ban, Settings } from 'lucide-react'

/**
 * The sidebar menu. To add a page: add a line here + a route in App.jsx.
 * `phase: N` marks a page not built yet (shown with a small "PN" tag).
 * `staffOnly` hides the entry from non-administrator accounts.
 */
export const NAV_SECTIONS = [
  {
    items: [
      { to: '/calendar', label: 'nav.calendar', icon: CalendarDays },
      { to: '/reservations', label: 'nav.reservations', icon: ClipboardList },
      { to: '/clients', label: 'nav.clients', icon: Users },
      { to: '/employees', label: 'nav.employees', icon: IdCard, staffOnly: true },
      { to: '/documents', label: 'nav.documents', icon: FileText },
    ],
  },
  {
    title: 'nav.admin',
    items: [
      { to: '/admin/event-types', label: 'nav.eventTypes', icon: Heart },
      { to: '/admin/occasions', label: 'nav.occasions', icon: PartyPopper },
      { to: '/admin/services', label: 'nav.services', icon: Sparkles },
      { to: '/admin/blocked-dates', label: 'nav.blockedDates', icon: Ban },
      { to: '/settings', label: 'nav.settings', icon: Settings },
    ],
  },
]
