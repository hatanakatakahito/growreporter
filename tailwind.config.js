/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // TailGrids用のダークモード設定
  theme: {
    extend: {
      colors: {
        primary: '#0c7ae8',
        secondary: '#13C296',
        dark: '#111928',
        'dark-2': '#1F2A37',
        'dark-3': '#374151',
        'dark-6': '#9CA3AF',
        'body-color': '#637381',
        stroke: '#E5E7EB',
        'gray-2': '#F9FAFB',
      },
      boxShadow: {
        '1': '0px 1px 3px rgba(0, 0, 0, 0.08)',
        'box-dark': '0px 1px 3px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
}



