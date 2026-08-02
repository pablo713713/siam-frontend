import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'SIAM - Sistema Integral de Administración y Mercadería',
        short_name: 'SIAM',
        description: 'Sistema de gestión de ventas, inventario y reportes',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Cachea los assets estáticos del build
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Rutas que NUNCA se cachean — siempre van al servidor
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            // La API nunca se cachea — datos financieros siempre en tiempo real
            urlPattern: /^http:\/\/localhost:3000\/api\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        // Habilita el SW en desarrollo para poder probarlo
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});