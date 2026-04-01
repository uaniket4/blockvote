/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#ecfeff',
          100: '#cffafe',
          500: '#0ea5a4',
          600: '#0d9488',
          700: '#0f766e',
          900: '#134e4a',
        },
        slate: {
          950: '#0a1221',
        },
      },
      boxShadow: {
        panel: '0 16px 45px -18px rgba(15, 23, 42, 0.45)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 rgba(14, 165, 164, 0.15)' },
          '50%': { boxShadow: '0 0 25px rgba(14, 165, 164, 0.35)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.45s ease-out both',
        pulseGlow: 'pulseGlow 2s ease-in-out infinite',
      },
      backgroundImage: {
        grid: 'radial-gradient(circle at 1px 1px, rgba(15, 23, 42, 0.08) 1px, transparent 0)',
      },
    },
  },
  plugins: [],
}

