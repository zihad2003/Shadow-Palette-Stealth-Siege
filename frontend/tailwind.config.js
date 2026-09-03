/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        clay: {
          bg: '#0D1B1E',
          surface: '#152428',
          raised: '#1C3238',
          deep: '#0A1417',
          accent: '#F4A261',
          success: '#2A9D8F',
          danger: '#E63946',
          text: '#F1FAEE',
          muted: '#8AA3A0',
          white: '#F1FAEE',
          yellow: '#F4C245',
          green: '#2A9D8F',
          red: '#E63946',
          blue: '#264653',
        },
        bgPrimary: '#0D1B1E',
        bgSecondary: '#152428',
        accentGold: '#F4A261',
        accentCyan: '#2A9D8F',
        accentEmerald: '#2A9D8F',
        accentRose: '#E63946',
        accentViolet: '#a78bfa',
      },
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        clay: '28px',
        'clay-sm': '16px',
      },
      boxShadow: {
        clay: '10px 14px 28px rgba(0,0,0,0.55), -4px -5px 12px rgba(255,255,255,0.045), inset 3px 3px 7px rgba(255,255,255,0.08), inset -4px -6px 12px rgba(0,0,0,0.45)',
        clayDeep: '12px 18px 36px rgba(0,0,0,0.62), inset 3px 3px 6px rgba(255,255,255,0.07), inset -5px -8px 14px rgba(0,0,0,0.5)',
        clayInset: 'inset 5px 6px 12px rgba(0,0,0,0.55), inset -2px -3px 6px rgba(255,255,255,0.04)',
        clayBtn: '0 6px 0 #8A4314, 0 10px 18px rgba(0,0,0,0.4), inset 0 2px 0 rgba(255,255,255,0.42)',
        glass: '10px 14px 28px rgba(0,0,0,0.55), inset 3px 3px 7px rgba(255,255,255,0.08)',
        glassHover: '12px 16px 32px rgba(0,0,0,0.58), inset 3px 3px 7px rgba(255,255,255,0.1)',
        glassDeep: '12px 18px 36px rgba(0,0,0,0.62), inset 3px 3px 6px rgba(255,255,255,0.07)',
        neonCyan: '0 0 18px rgba(42, 157, 143, 0.35)',
        neonGold: '0 0 18px rgba(244, 162, 97, 0.4)',
        neonEmerald: '0 0 18px rgba(42, 157, 143, 0.35)',
      },
      animation: {
        'radar-sweep': 'radarRotate 1.2s linear infinite',
      },
      keyframes: {
        radarRotate: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
};
