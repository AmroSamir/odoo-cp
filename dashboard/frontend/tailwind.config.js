/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        page: {
          bg: '#F0F1F5',
          surface: '#FFFFFF',
          border: '#E5E7EB',
          'border-light': '#F3F4F6',
        },
        accent: {
          DEFAULT: '#3366FF',
          hover: '#2952CC',
          light: '#EBF0FF',
          secondary: '#00C2FF',
        },
        txt: {
          primary: '#1A1D26',
          secondary: '#6B7280',
          muted: '#9CA3AF',
          faint: '#D1D5DB',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
        modal: '0 20px 60px -12px rgba(0, 0, 0, 0.15)',
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
};
