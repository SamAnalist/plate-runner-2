/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Consolas', '"Courier New"', 'monospace'],
      },
      colors: {
        surface: {
          DEFAULT: '#0f1117',
          raised: '#161b22',
          overlay: '#1e2530',
        },
      },
    },
  },
  plugins: [],
};
