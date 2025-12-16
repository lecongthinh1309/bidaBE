import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      }
      ,
      // Forward requests under /admin to the admin frontend dev server (3000).
      // This lets the user-frontend call /admin/api/... which the admin dev server
      // will proxy to the backend (useful for testing through admin server).
      '/admin': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/admin/, '')
      }
    }
  }
})
