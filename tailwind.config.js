/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        base: '#0a0d0c',
        surface: '#121614',
        surface2: '#1a1f1c',
        border: '#242b27',
        accent: '#34d399',
        accent2: '#10b981',
        muted: '#8b948f',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        fadeSlideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        popIn: {
          '0%': { transform: 'scale(0.85)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(52,211,153,0.35)' },
          '50%': { boxShadow: '0 0 0 8px rgba(52,211,153,0)' },
        },
      },
      animation: {
        'fade-slide-up': 'fadeSlideUp 0.35s ease both',
        'pop-in': 'popIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
