import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { API_PATHS, UPSTREAM_COOKIE_HEADER, isAllowedBilibiliCdnHost } from './src/config/proxy'

function forwardUpstreamCookie(proxyReq: import('node:http').ClientRequest, req: import('node:http').IncomingMessage) {
  const cookie = req.headers[UPSTREAM_COOKIE_HEADER.toLowerCase()]
  proxyReq.removeHeader(UPSTREAM_COOKIE_HEADER)
  if (typeof cookie === 'string' && cookie.length <= 8192) proxyReq.setHeader('Cookie', cookie)
}

function bilibiliCdnProxy(): Plugin {
  return {
    name: 'bilibili-cdn-proxy',
    configureServer(server) {
      server.middlewares.use(API_PATHS.bilibiliCdn, async (req, res) => {
        try {
          // Path format: /api/bilibili-cdn/<hostname>/<path>
          // e.g. /api/bilibili-cdn/upos-sz-estgoss.bilivideo.com/upgcxcode/...
          const rawPath = (req.url || '/').replace(/^\/api\/bilibili-cdn\//, '')
          const slashIdx = rawPath.indexOf('/')
          if (slashIdx === -1) {
            res.statusCode = 400
            res.end('Missing hostname in CDN proxy path')
            return
          }
          const hostname = rawPath.substring(0, slashIdx)
          const path = rawPath.substring(slashIdx)
          if (!isAllowedBilibiliCdnHost(hostname)) {
            res.statusCode = 403
            res.end('CDN host is not allowed')
            return
          }
          const targetUrl = `https://${hostname}${path}`

          const response = await fetch(targetUrl, {
            headers: {
              Referer: 'https://www.bilibili.com',
            },
          })

          res.statusCode = response.status
          res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream')
          res.setHeader('Content-Length', response.headers.get('content-length') || '')
          res.setHeader('Cache-Control', 'private, max-age=300')
          res.setHeader('X-Content-Type-Options', 'nosniff')

          const buffer = Buffer.from(await response.arrayBuffer())
          res.end(buffer)
        } catch (e) {
          console.error('[bilibili-cdn] Proxy error:', e)
          res.statusCode = 502
          res.end('CDN proxy error')
        }
      })
    },
  }
}

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
    bilibiliCdnProxy(),
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
  server: {
    proxy: {
      [API_PATHS.netease]: {
        target: 'https://music.163.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/netease/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            forwardUpstreamCookie(proxyReq, req)
            proxyReq.setHeader('Referer', 'https://music.163.com')
          })
        },
      },
      [API_PATHS.bilibiliAudio]: {
        target: 'https://www.bilibili.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/bilibili-audio/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            forwardUpstreamCookie(proxyReq, req)
            proxyReq.setHeader('Referer', 'https://www.bilibili.com')
          })
        },
      },
      [API_PATHS.bilibili]: {
        target: 'https://api.bilibili.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/bilibili/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            forwardUpstreamCookie(proxyReq, req)
            proxyReq.setHeader('Referer', 'https://www.bilibili.com')
          })
        },
      },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.spec.ts'],
    exclude: ['e2e/**', 'dist/**', 'playwright-report/**', 'test-results/**'],
  },
})
