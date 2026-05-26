/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brandDark: '#0c0c0c',
        brandGray: '#1c1c1c',
        brandGold: '#D4AF37',
        brandRed: '#991B1B',
        brandGreen: '#10B981',
        brandCyan: '#06B6D4'
      },
      letterSpacing: { widest: '0.25em', header: '0.5em' }
    },
  },
  plugins: [],
}
