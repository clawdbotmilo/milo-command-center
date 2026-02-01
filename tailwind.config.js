/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'milo-green': '#22c55e',
        'milo-dark': '#0f172a',
        'milo-card': '#1e293b',
        'milo-border': '#334155'
      }
    },
  },
  plugins: [],
}
