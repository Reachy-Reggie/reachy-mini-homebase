/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'reachy': {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        }
      },
      borderRadius: {
        'blob': '1.5rem',
        'pill': '9999px',
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(34, 197, 94, 0.3)',
        'glow': '0 0 20px rgba(34, 197, 94, 0.4)',
        'glow-lg': '0 0 30px rgba(34, 197, 94, 0.5)',
        'dark-lg': '0 10px 40px rgba(0, 0, 0, 0.5)',
        'inner-dark': 'inset 0 2px 10px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'wiggle': 'wiggle 0.5s ease-in-out',
        'bounce-soft': 'bounce-soft 0.5s ease-in-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 10px rgba(34, 197, 94, 0.3)' },
          '50%': { boxShadow: '0 0 25px rgba(34, 197, 94, 0.6)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
