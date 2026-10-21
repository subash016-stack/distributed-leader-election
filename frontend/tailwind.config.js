/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0e0e11',
        card: '#141418',
        surface: '#141418',
        raised: '#1c1c22',
        border: '#24242c',
        rule: '#1c1c22',
        control: '#2b2b34',
        accent: '#4a8ad6',
        positive: '#44a282',
        negative: '#e5566f',
        warning: '#d9a441',
        muted: '#8a8c95',
      },
    },
  },
  plugins: [],
}
