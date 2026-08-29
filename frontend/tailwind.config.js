/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bgPrimary: '#050709',
        bgSecondary: '#0c1018',
        accentGold: '#fbbf24',
        accentCyan: '#38bdf8',
        accentEmerald: '#10b981',
        accentRose: '#f43f5e',
        accentViolet: '#a78bfa',
      },
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
        glass: '20px',
        glassHeavy: '28px',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.45), 0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        glassHover: '0 12px 40px rgba(0, 0, 0, 0.55), 0 4px 12px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        glassDeep: '0 16px 48px rgba(0, 0, 0, 0.65), 0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
        neonCyan: '0 0 20px rgba(56, 189, 248, 0.35)',
        neonGold: '0 0 20px rgba(251, 191, 36, 0.35)',
        neonEmerald: '0 0 20px rgba(16, 185, 129, 0.35)',
      },
      animation: {
        'glass-shimmer': 'glassShimmer 4s ease-in-out infinite',
        'glass-pulse': 'glassPulse 3s ease-in-out infinite',
        'radar-sweep': 'radarRotate 1.2s linear infinite',
      },
      keyframes: {
        glassShimmer: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        glassPulse: {
          '0%, 100%': { opacity: '0.85', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.03)' },
        },
        radarRotate: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
};
