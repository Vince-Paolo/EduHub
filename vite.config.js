import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendPort = env.PORT || '5000'
  const backendTarget = `http://127.0.0.1:${backendPort}`

  return {
    server: {
      host: '127.0.0.1',
      historyApiFallback: true,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        '/login': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        '/register': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        '/logout': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        '/auth': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        '/mfa/': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
      },
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
              src: '/logo-icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            },
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
  }
})
