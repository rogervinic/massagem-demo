/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        linen: { 50: '#FBF8F3', 100: '#F5EFE6', 200: '#EBE1D2', 300: '#DCCDB7' },
        sage: { 100: '#E6EBE0', 200: '#CBD5C0', 300: '#AEBDA0', 400: '#8FA27F', 500: '#728764', 600: '#5B6E50', 700: '#46553E' },
        clay: { 300: '#D2B79A', 400: '#BF9A76', 500: '#A47D5A', 600: '#86644A' },
        bark: { 500: '#6E5443', 700: '#4A382D', 900: '#2E231C' },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Figtree', 'system-ui', 'sans-serif'],
      },
      boxShadow: { soft: '0 1px 2px rgba(74,56,45,.06), 0 8px 24px -12px rgba(74,56,45,.18)' },
    },
  },
  plugins: [],
}
