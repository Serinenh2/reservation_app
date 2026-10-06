# Design system

Reference for the colors, type and components used in the app.
(switch language and theme to see every state).

## Direction

A working tool for an events venue. The palette comes from Algerian
wedding dress: **karakou velvet** (deep indigo) and **fetla gold**
embroidery. No decorative pattern: the sidebar and the login panel are
plain, so reservation statuses are what catches the eye.

## Color tokens

Defined once in `frontend/src/styles/tokens.css`, mapped to Tailwind in
`tailwind.config.js`. Use the Tailwind name, never a raw hex.

| Token | Light | Dark | Use |
|---|---|---|---|
| `brand` (Velvet) | #2A2350 | #7666D6 | primary buttons, active states |
| `gold` (Fetla) | #A87C28 | #D6AE5E | focus ring, active nav thread, total box, chart line |
| `bg` | #F6F5F9 | #0F0D1C | page background |
| `surface` | #FFFFFF | #18152A | panels |
| `sunken` | #F0EEF5 | #131122 | table headers, inputs disabled |
| `line` | #E2DFEA | #2E2A48 | borders |
| `ink` / `muted` / `subtle` | text: main / secondary / hints |
| `sidebar` | #1F1A3D | #0C0A18 | navigation |

### Status colors (reserved)

| Status | Token | Meaning |
|---|---|---|
| Confirmée / مؤكدة | `info` (blue) | payment reached the confirmation minimum |
| En attente / قيد الانتظار | `warning` (orange) | not enough paid yet |
| Date bloquée / تاريخ مغلق | `danger` (red) | blocked date, destructive actions |
| Annulée / ملغاة | `neutral` (grey) | kept in history |

In the calendar, free days (no reservation, not blocked, today or later)
are filled with `free` (light green, dark green day number).
`success` (green) stays for money that has been paid.

They are **never** used for decoration. The mapping status → color lives in
one place: `STATUS_TONES` in `components/ui/Badge.jsx`.

## Typography

- French: **Manrope** (variable). Arabic: **IBM Plex Sans Arabic** (400–700).
- Both are bundled with the app (no internet needed).
- The active language puts its font first (`html[lang='ar']`), Arabic gets
  a taller line height (1.7) for readability.
- Amounts and times use tabular figures (`.tabular`) so columns align.

| Name | Size | Use |
|---|---|---|
| `3xl` | 38 | the "Total à payer" figure |
| `2xl` | 30 | page titles |
| `xl` | 24 | money figures |
| `lg` | 20 | dialog titles |
| `md` | 17 | panel titles |
| `base` | 15 | body text, inputs |
| `sm` | 13 | labels, hints, badges |

## Shape and depth

- Radius by hierarchy: controls 8px, panels 14px, dialogs 18px, badges round.
- Panels are separated by borders, with a barely visible shadow. Only
  dialogs and toasts float (`shadow-overlay`).

## Components (`@/components/ui`)

| Component | Notes |
|---|---|
| `Button` | `primary`, `secondary`, `ghost`, `danger`, `gold`; `loading`, `icon` |
| `Card`, `Card.Header`, `Card.Body` | standard panel |
| `Field` | label + control + hint + error, wires `aria-describedby` |
| `Input`, `Select`, `Textarea` | `invalid`, `suffix="DA"`; numbers/phones stay LTR |
| `Switch` | `role="switch"` |
| `Badge`, `StatusBadge` | `StatusBadge status="confirmed"` |
| `Modal`, `ConfirmDialog` | native `<dialog>`: focus trap, Escape, backdrop |
| `useToast()` | `toast.success()`, `toast.error()`, announced to screen readers |
| `StatCard`, `TotalBox` | money figures, the big total |
| `Table` | scrolls horizontally inside its box |
| `EmptyState`, `PageHeader`, `Spinner` | |

## Writing rules

- Sentence case, no all-caps labels.
- Buttons say what happens: "Annuler la réservation", not "OK".
- A toast repeats the button's verb: "Enregistrer" → "Paramètres enregistrés."
- Errors say what to do: "Corrigez les champs en rouge."

## Accessibility checklist

Visible gold focus ring on every control · skip link · labels on every
field · `aria-live` toasts · `prefers-reduced-motion` respected · status
never shown by color alone (badges always carry text).
