import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/action': 'http://localhost:8000',
      '/start': 'http://localhost:8000',
      '/levels': 'http://localhost:8000'
    }
  }
})
