/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: { 50: '#FDFBF7', 100: '#FAF7F0', 200: '#F2ECDF' },
        navy: { 900: '#0F1330', 800: '#1A1F45', 700: '#2B3163', 500: '#5B6190', 400: '#7B80A8', 300: '#A6AACA' },
        brand: { 50: '#F1EEFF', 100: '#E4DEFF', 200: '#CBBFFF', 400: '#8B74F5', 500: '#6D54E8', 600: '#5B3FD9', 700: '#4A32B8' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,19,48,.04), 0 8px 24px -8px rgba(15,19,48,.08)',
        glow: '0 10px 30px -8px rgba(91,63,217,.45)',
      },
      keyframes: {
        pulseRing: { '0%': { transform: 'scale(1)', opacity: '.55' }, '100%': { transform: 'scale(1.9)', opacity: '0' } },
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        bar: { '0%,100%': { transform: 'scaleY(.35)' }, '50%': { transform: 'scaleY(1)' } },
      },
      animation: {
        pulseRing: 'pulseRing 1.6s ease-out infinite',
        fadeUp: 'fadeUp .3s ease-out both',
        bar: 'bar 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
