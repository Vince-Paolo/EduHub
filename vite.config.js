import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      },
      '/login': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      },
      '/register': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      },
      '/logout': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      },
      '/auth/me': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'EduHub',
        short_name: 'EduHub',
        description: 'Offline Learning Platform',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})