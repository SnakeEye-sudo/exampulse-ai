import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-ui)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-read)', 'Georgia', 'serif'],
      },
      colors: {
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        faint: 'rgb(var(--faint) / <alpha-value>)',
        paper: 'rgb(var(--paper) / <alpha-value>)',
        raised: 'rgb(var(--raised) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        brand: 'rgb(var(--brand) / <alpha-value>)',
        brandsoft: 'rgb(var(--brandsoft) / <alpha-value>)',
        hot: 'rgb(var(--hot) / <alpha-value>)',
        warm: 'rgb(var(--warm) / <alpha-value>)',
        good: 'rgb(var(--good) / <alpha-value>)',
      },
      maxWidth: { content: '72rem' },
    },
  },
  plugins: [],
} satisfies Config;
