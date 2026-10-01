/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Match-level status colors — same in both themes
        matchHigh: '#34A853',
        matchMedium: '#F9AB00',
        matchLow: '#EA4335',

        // Dark mode
        darkBg: '#161920',
        darkPanel: '#222731',
        darkInset: '#1C1F27',
        darkActiveNav: '#2E3543',
        darkText: '#F3F4F6',
        darkTextSecondary: '#9CA3AF',
        darkBorder: '#374151',
        darkBtnPrimary: '#2E3543',

        // Light mode
        lightBg: '#F4F3ED',
        lightPanel: '#FFFFFF',
        lightInset: '#F9FAFB',
        lightActiveNav: '#7B8B82',
        lightText: '#111827',
        lightTextSecondary: '#4B5563',
        lightBorder: '#E5E7EB',
        lightBtnSave: '#5C7061',
        lightBtnCompare: '#556882'
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'Helvetica Neue', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
