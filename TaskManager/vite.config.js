
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // This rule proxies any request that starts with "/api"
      // to your backend server running on localhost:4003
      '/api': {
        target: 'http://localhost:4003',
        changeOrigin: true, // This is recommended to avoid CORS-related issues
      }
    }
  }
})
