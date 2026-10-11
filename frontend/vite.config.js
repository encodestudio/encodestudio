import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forward API calls to the Worker (`npm run dev` at the repo root, port 8000).
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
