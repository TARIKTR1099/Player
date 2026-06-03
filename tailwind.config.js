/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./Code/index.html",
    "./Code/src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: "#0f6cbd",
      }
    },
  },
  plugins: [],
}
