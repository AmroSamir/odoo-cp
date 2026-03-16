/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        deep: {
          bg: '#001e3c',
          surface: '#0a2744',
          border: '#133a5c',
        },
        accent: {
          DEFAULT: '#4fc3f7',
          hover: '#29b6f6',
          secondary: '#ffa726',
        },
        odoo: {
          purple: '#4fc3f7',
          light: '#29b6f6',
        },
      },
    },
  },
  plugins: [],
};
