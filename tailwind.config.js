// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "Noto Sans", "sans-serif", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"],
      },
      colors: {
        'royal-blue': {
          50: '#f0f4fe',
          100: '#dde6fc',
          200: '#c3d4fa',
          300: '#9ab9f6',
          400: '#6a94f0',
          500: '#4a6fea',
          600: '#304fdf',
          700: '#273dcd',
          800: '#2532a6',
          900: '#233083',
        },
        'honey-yellow': {
          50: '#fff9eb',
          100: '#ffedc6',
          200: '#ffd888',
          300: '#ffbe45',
          400: '#ffa420',
          500: '#f98107',
          600: '#dd5b02',
          700: '#b73c06',
          800: '#942e0c',
          900: '#7a270d',
        },
        'sea-blue': {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-out'
      }
    }
  },
  plugins: [],
};
