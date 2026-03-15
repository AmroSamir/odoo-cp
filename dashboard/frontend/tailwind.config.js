/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        odoo: {
          purple: '#714B67',
          light: '#875A7B',
        },
      },
    },
  },
  plugins: [],
};
