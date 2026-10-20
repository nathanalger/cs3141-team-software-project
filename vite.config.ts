import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Forward /api requests to the Deno backend
  server: { proxy: { '/api': 'http://localhost:8000' } },
})
