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
        cardHover: '0 4px 16px rgba(46, 125, 50, 0.15)',
      },
      borderRadius: {
        card: '8px',
        btn: '6px',
        chip: '4px',
      }
    },
  },
  plugins: [],
}
