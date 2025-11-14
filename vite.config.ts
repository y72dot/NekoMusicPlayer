import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'

const srcDir = fileURLToPath(new URL('./src', import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@', replacement: srcDir },
      { find: /^@\/(.*)$/, replacement: `${srcDir}/$1` }
    ]
  },
  optimizeDeps: {
    include: ['buffer']
  },
  server: {
    port: 5173
  }
})
