import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // "@/components/ui" instead of "../../components/ui"
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    port: 5173,
    // In development, forward API calls to Django (same as nginx in Docker).
    proxy: {
      '/api': 'http://localhost:8000',
      '/django-admin': 'http://localhost:8000',
      '/static': 'http://localhost:8000',
    },
  },
})
