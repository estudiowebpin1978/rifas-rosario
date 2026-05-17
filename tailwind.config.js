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
          gold: '#F59E0B',
          'dark-gold': '#B45309',
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
