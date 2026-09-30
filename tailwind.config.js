/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        mars: '#b5442e',
        moon: '#555555',
        base: '#10233f'
      }
    }
  },
  plugins: []
}
