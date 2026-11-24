import type { Config } from 'tailwindcss';

// Eloura Chic palette (brand brief) + typography.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        mauve: { DEFAULT: '#7D4E57', dark: '#663E46', light: '#9A6B74', soft: '#F3E8E6' },
        cream: { DEFAULT: '#FAF6F2', deep: '#F2E9E2', line: '#E8DDD4' },
        gold: { DEFAULT: '#B09365', soft: '#E9DCC6' },
        espresso: { DEFAULT: '#3E3335', soft: '#52464A' },
        taupe: '#6E6264',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: { card: '20px', hero: '28px' },
      boxShadow: { soft: '0 6px 24px -12px rgba(62,51,53,.25)', card: '0 2px 14px -6px rgba(62,51,53,.18)' },
    },
  },
  plugins: [],
};
export default config;
