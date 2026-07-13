// Extracted verbatim from layer1_india.html's tailwind.config block.
// Required for the brandGold / brandCyan / brandGreen / font-display
// classes used throughout ResidencySolverStep.jsx to resolve correctly.
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
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
        brandCyan: '#06B6D4',
      },
      letterSpacing: { widest: '0.25em', header: '0.5em' },
    },
  },
};
