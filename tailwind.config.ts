import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
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
        arctic: {
          void: '#05080d',
          abyss: '#070b12',
          panel: '#0c121b',
          panel2: '#111927',
          surface: '#121b28',
          surface2: '#1a2433',
          ice: '#7DD3E8',
          iceDeep: '#4BA8C4',
          frost: '#A8D8E8',
          green: '#5FD0A8',
          red: '#C56B6B',
          redBright: '#E08A8A',
          amber: '#E8B45F',
        },
        gold: {
          DEFAULT: '#E8C56A',
          bright: '#F4D88A',
          deep: '#C9A24A',
          pale: '#FFF0C2',
        },
      },
      letterSpacing: {
        widest: '0.25em',
        header: '0.5em',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}

export default config
