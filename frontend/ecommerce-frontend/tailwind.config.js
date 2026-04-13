/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // NEW: This is the magic key that enables the toggle!
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}