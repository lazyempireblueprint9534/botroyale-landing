import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cyan: {
          400: '#00f5ff',
          500: '#00d4e0',
        },
        magenta: {
          400: '#ff00ff',
          500: '#cc00cc',
        },
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'cursive'],
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'battle': 'battle 2s ease-in-out infinite',
        'battle-reverse': 'battle-reverse 2s ease-in-out infinite',
        'shoot': 'shoot 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
export default config
