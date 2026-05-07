import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: ['tender-ai-2-ln34.onrender.com'],
  },
  preview: {
    host: true,
    allowedHosts: ['tender-ai-2-ln34.onrender.com'],
  },
})
