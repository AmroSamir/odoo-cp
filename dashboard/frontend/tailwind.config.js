/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        page: {
          bg: '#0e0e10',
          surface: '#1c1c21',
          border: '#2a2a30',
        },
        accent: {
          DEFAULT: '#00ff9f',
          hover: '#00e08e',
          secondary: '#00e0ff',
        },
        odoo: {
          purple: '#00ff9f',
          light: '#00e0ff',
        },
      },
    },
  },
  plugins: [],
};
