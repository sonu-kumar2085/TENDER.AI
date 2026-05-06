/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        government: {
          bg: '#F0F7F0',
          surface: '#FFFFFF',
          surfaceHover: '#E8F5E9',
          primary: '#2E7D32',
          primaryLight: '#4CAF50',
          primaryPale: '#C8E6C9',
          primaryDark: '#1B5E20',
          accentBlue: '#1565C0',
          border: '#A5D6A7',
          textPrimary: '#1A2E1A',
          textSecondary: '#4A6741',
          textMuted: '#7A9E7A',
          eligibleGreen: '#2E7D32',
          eligibleBg: '#E8F5E9',
          rejectedRed: '#C62828',
          rejectedBg: '#FFEBEE',
          reviewAmber: '#E65100',
          reviewBg: '#FFF3E0',
          monospace: '#1B5E20',
          footerBg: '#1B5E20',
          footerText: '#C8E6C9',
          navbarBg: '#FFFFFF',
          navbarBorder: '#A5D6A7',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        serif: ['Lora', 'serif'],
      },
      boxShadow: {
        card: '0 2px 8px rgba(46, 125, 50, 0.08)',
        cardHover: '0 8px 24px rgba(46, 125, 50, 0.18)',
      },
      borderRadius: {
        card: '8px',
        btn: '6px',
        chip: '4px',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.25s ease-out both',
        slideUp: 'slideUp 0.3s ease-out both',
        scaleIn: 'scaleIn 0.25s ease-out both',
        slideDown: 'slideDown 0.2s ease-out both',
      },
    },
  },
  plugins: [],
}
