/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        library: {
          dark: '#0B0F19',
          card: 'rgba(15, 23, 42, 0.45)', // glass
          accent: '#3b82f6',
          neon: '#60a5fa',
          glow: 'rgba(96, 165, 250, 0.5)',
        }
      },
      backdropBlur: {
        xs: '2px',
        glass: '12px'
      }
    },
  },
  plugins: [],
}
