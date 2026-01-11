/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0a0a0a',
          surface: '#1a1a1a',
          card: '#1f1f1f',
          border: '#2a2a2a',
          hover: '#2a2a2a',
          text: '#e5e5e5',
          'text-muted': '#a0a0a0',
          accent: '#3b82f6',
          'accent-hover': '#2563eb',
        },
      },
    },
  },
  plugins: [],
}

