/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        arctic: {
          bg: '#f0f9ff',
          surface: '#f8fafc',
          border: '#d0e4f0',
        },
        accent: {
          DEFAULT: '#0284c7',
          hover: '#0369a1',
          secondary: '#f43f5e',
        },
        odoo: {
          purple: '#0284c7',
          light: '#0ea5e9',
        },
      },
    },
  },
  plugins: [],
};
