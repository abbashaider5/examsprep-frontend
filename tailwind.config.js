/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          50: '#e6f0f9',
          100: '#cce1f3',
          500: '#0366AC',
          600: '#024f87',
          700: '#023c66',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          500: '#E3BE2C',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"SF Pro Display"',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        display: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
        'hero-in': 'heroIn 0.8s cubic-bezier(0.22, 1, 0.36, 1) both',
        'hero-in-delay': 'heroIn 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.12s both',
        'hero-in-delay-2': 'heroIn 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.24s both',
        'orb-drift': 'orbDrift 14s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { transform: 'translateY(16px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        heroIn: {
          from: { opacity: '0', transform: 'translateY(18px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        orbDrift: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(12px, -18px) scale(1.05)' },
        },
      },
    },
  },
  plugins: [],
};
