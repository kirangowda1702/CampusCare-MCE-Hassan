/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#b9dffe',
          300: '#7cc3fd',
          400: '#36a3f9',
          500: '#0c87eb',
          600: '#0069c7',
          700: '#0154a1',
          800: '#064785',
          900: '#0b3c6f',
          950: '#07264a',
        },
        navy: {
          800: '#0b192c',
          900: '#060d17',
          950: '#03080e',
        },
        tealAccent: {
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
        },
        emergency: {
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
