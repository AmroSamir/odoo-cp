/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        page: {
          bg: '#fcfcfc',
          surface: '#ffffff',
          border: '#e2e8f0',
        },
        accent: {
          DEFAULT: '#1d4ed8',
          hover: '#1e40af',
          secondary: '#dc2626',
        },
        odoo: {
          purple: '#1d4ed8',
          light: '#2563eb',
        },
      },
    },
  },
  plugins: [],
};
