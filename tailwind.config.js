/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ml: {
          yellow: '#FFE600',
          blue: '#3483FA',
          'dark-blue': '#1A3C6D',
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
