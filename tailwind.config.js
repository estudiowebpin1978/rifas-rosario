/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        eco: {
gold: '#FE2C55',
      'dark-gold': '#C12045',
          black: '#111827',
          'dark-black': '#0F172A',
          green: '#39B54A',
          light: '#F5F5F5',
          border: '#EBEBEB',
          text: '#333333',
        }
      }
    },
  },
  plugins: [],
}
