import { CalendarDays, ClipboardList, Users, Heart, PartyPopper, Sparkles, Ban, Settings, Palette } from 'lucide-react'

/**
 * The sidebar menu. To add a page: add a line here + a route in App.jsx.
 * `phase: N` marks a page not built yet (shown with a small "PN" tag).
 */
export const NAV_SECTIONS = [
  {
    items: [
      { to: '/calendar', label: 'nav.calendar', icon: CalendarDays },
      { to: '/reservations', label: 'nav.reservations', icon: ClipboardList },
      { to: '/clients', label: 'nav.clients', icon: Users },
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
      { to: '/design-system', label: 'nav.designSystem', icon: Palette },
    ],
  },
]
