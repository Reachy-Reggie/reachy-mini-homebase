import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Allow external connections
    proxy: {
      // Proxy memory API to local server (avoids browser CORS/security issues)
      '/api/memory': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Proxy robot routes to local server
      '/robot': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Proxy other API requests to robot
      '/api': {
        target: 'http://192.168.0.11:8000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
