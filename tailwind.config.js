/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Archivo'", 'system-ui', 'sans-serif'],
        sans: ["'Noto Sans'", "'Twemoji Country Flags'", 'system-ui', 'sans-serif'],
      },
      colors: {
        // Paleta inspirada en el calendario (azules del Mundial)
        pitch: {
          50: '#eef6ff',
          100: '#d9ecff',
          500: '#2f6df0',
          600: '#1f53d6',
          700: '#1a44ad',
          900: '#0f2a6b',
        },
      },
    },
  },
  plugins: [],
}
