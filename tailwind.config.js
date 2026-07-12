/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', 'serif'],
        mono: ['Cascadia Mono', 'IBM Plex Mono', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}

