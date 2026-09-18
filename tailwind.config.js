/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html","./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        mw: {
          bg: '#060608',
          card: '#101012',
          border: '#222222',
          orange: '#FF7A18',
          orangeLight: '#FF9A3C',
          silver: '#E8E8EA'
        }
      },
      fontFamily: {
        sans: ['Inter','ui-sans-serif','system-ui'],
        mono: ['JetBrains Mono','ui-monospace','monospace']
      }
    }
  },
  plugins: []
}