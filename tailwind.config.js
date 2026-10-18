/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: v('bg'), surface: v('surface'), sunken: v('sunken'),
        ink: v('ink'), muted: v('muted'), faint: v('faint'), line: v('line'),
        accent: { DEFAULT: v('accent'), soft: v('accent-soft'), ink: v('accent-ink'), 2: v('accent-2') },
        amber: { DEFAULT: v('amber'), soft: v('amber-soft'), ink: v('amber-ink') },
        red: { DEFAULT: v('red'), soft: v('red-soft') },
        green: { DEFAULT: v('green'), soft: v('green-soft') },
        stage: { DEFAULT: v('stage'), ink: v('stage-ink'), line: v('stage-line') },
      },
      fontFamily: {
        sans: ['"Instrument Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: { '2xs': ['0.6875rem', '1rem'] },
      boxShadow: {
        card: '0 1px 2px rgb(var(--ink) / 0.04), 0 6px 20px -10px rgb(var(--ink) / 0.12)',
        lift: '0 2px 4px rgb(var(--ink) / 0.05), 0 18px 40px -16px rgb(var(--ink) / 0.25)',
        glow: '0 10px 30px -10px rgb(var(--accent) / 0.55)',
        pop: '0 12px 32px -12px rgb(var(--ink) / 0.35), 0 2px 6px rgb(var(--ink) / 0.08)',
        phone: '0 30px 60px -30px rgb(var(--ink) / 0.45)',
      },
      keyframes: {
        flash: { '0%': { boxShadow: '0 0 0 0 rgb(var(--accent) / 0.55)' }, '100%': { boxShadow: '0 0 0 10px rgb(var(--accent) / 0)' } },
        rise: { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'none' } },
        'pop-center': { from: { opacity: 0, transform: 'translate(-50%, -46%) scale(0.94)' }, to: { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' } },
        'pop-top': { from: { opacity: 0, transform: 'translate(-50%, 10px) scale(0.95)' }, to: { opacity: 1, transform: 'translate(-50%, 0) scale(1)' } },
        'pop-in': { from: { opacity: 0, transform: 'translateY(-4px) scale(0.95)' }, to: { opacity: 1, transform: 'none' } },
        'slide-in': { from: { transform: 'translateX(100%)' }, to: { transform: 'none' } },
        fade: { from: { opacity: 0 }, to: { opacity: 1 } },
      },
      animation: {
        flash: 'flash 1.2s ease-out 2',
        rise: 'rise .25s ease-out both',
        'pop-center': 'pop-center .38s cubic-bezier(.2,1.35,.4,1) both',
        'pop-top': 'pop-top .38s cubic-bezier(.2,1.35,.4,1) both',
        'pop-in': 'pop-in .26s cubic-bezier(.2,1.35,.4,1) both',
        'slide-in': 'slide-in .42s cubic-bezier(.16,1.12,.3,1) both',
        fade: 'fade .2s ease-out both',
      },
    },
  },
  plugins: [],
}
