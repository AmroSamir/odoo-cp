/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#a855f7',
          hover: '#9333ea',
        },
        odoo: {
          purple: '#a855f7',
          light: '#c084fc',
        },
      },
    },
  },
  plugins: [],
};
