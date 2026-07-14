import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Neko Music Player',
        short_name: 'NekoMusic',
        description: 'A modern web music player',
        theme_color: '#1890ff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\.(mp3|wav|ogg|flac|aac|m4a)$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'audio-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    target: 'es2020',
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router'],
          'vendor-pinia': ['pinia', 'pinia-plugin-persistedstate'],
          'vendor-metadata': ['music-metadata'],
          'vendor-i18n': ['vue-i18n'],
        },
      },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
  },
})