/**
 * Tailwind is wired to the CSS variables defined in src/styles/tokens.css.
 * Change a color there and it updates everywhere, in light AND dark mode.
 * See DESIGN_SYSTEM.md for the meaning of each token.
 */
const token = (name) => `rgb(var(--c-${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    // Type scale: 15px base, ratio ~1.2 (minor third)
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1.1rem' }],      // 12
      sm: ['0.8125rem', { lineHeight: '1.25rem' }],   // 13
      base: ['0.9375rem', { lineHeight: '1.5rem' }],  // 15
      md: ['1.0625rem', { lineHeight: '1.6rem' }],    // 17
      lg: ['1.25rem', { lineHeight: '1.75rem' }],     // 20
      xl: ['1.5rem', { lineHeight: '2rem' }],         // 24
      '2xl': ['1.875rem', { lineHeight: '2.35rem' }], // 30
      '3xl': ['2.375rem', { lineHeight: '2.8rem' }],  // 38
    },
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        sunken: token('sunken'),
        line: token('line'),
        ink: token('ink'),
        muted: token('muted'),
        subtle: token('subtle'),
        brand: { DEFAULT: token('brand'), hover: token('brand-hover'), fg: token('brand-fg'), soft: token('brand-soft') },
        gold: { DEFAULT: token('gold'), ink: token('gold-ink'), soft: token('gold-soft') },
        // Status colors are ONLY for reservation/payment states.
        success: { DEFAULT: token('success'), soft: token('success-soft') },
        info: { DEFAULT: token('info'), soft: token('info-soft') },
        free: { DEFAULT: token('free'), fg: token('free-fg') },
        warning: { DEFAULT: token('warning'), soft: token('warning-soft') },
        danger: { DEFAULT: token('danger'), soft: token('danger-soft') },
        neutral: { DEFAULT: token('neutral'), soft: token('neutral-soft') },
        sidebar: { DEFAULT: token('sidebar'), ink: token('sidebar-ink'), muted: token('sidebar-muted'), active: token('sidebar-active') },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
      },
      borderRadius: {
        // Radius hierarchy: controls < panels < overlays
        control: '8px',
        panel: '14px',
        overlay: '18px',
      },
      boxShadow: {
        panel: '0 1px 0 rgb(var(--c-line) / 0.6), 0 1px 3px rgb(var(--c-shadow) / 0.06)',
        overlay: '0 24px 60px -12px rgb(var(--c-shadow) / 0.35)',
      },
      ringColor: { DEFAULT: token('gold') },
      keyframes: {
        'toast-in': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
        'dialog-in': { from: { opacity: 0, transform: 'scale(.97)' }, to: { opacity: 1, transform: 'none' } },
      },
      animation: {
        'toast-in': 'toast-in .18s ease-out',
        'dialog-in': 'dialog-in .16s ease-out',
      },
    },
  },
  plugins: [],
}
