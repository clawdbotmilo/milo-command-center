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
      },
      keyframes: {
        'scale-bounce': {
          '0%': { transform: 'scale(0)' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' },
        }
      },
      animation: {
        'scale-bounce': 'scale-bounce 0.3s ease-out',
      }
    },
  },
  plugins: [],
}
