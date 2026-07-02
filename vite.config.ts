import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'vLatam · Administración de Precios',
        short_name: 'Precios',
        description: 'Cambio rápido de precios de artículos',
        theme_color: '#1565c0',
        background_color: '#1565c0',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // config.js se edita por cliente tras el build: nunca precachearlo.
        globIgnores: ['**/config.js'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/config\.js$/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('/config.js'),
            handler: 'NetworkFirst',
            options: { cacheName: 'app-config' },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
        },
      },
    },
  },
});
