import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/warframe-optimizer/' : '/',
  build: {
    target: 'esnext',
  },
  plugins: [
    react(),
    tailwindcss(),
    wasm(),
    topLevelAwait(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['item_index.json', 'node_levels.json', 'data_version.txt', 'warframe_prapa_wasm_bg.wasm'],
      manifest: {
        name: 'PRAPA Warframe Yield Optimizer',
        short_name: 'PRAPA',
        description: 'Predictive yield simulator for Warframe farming routes',
        theme_color: '#0a0e14',
        background_color: '#0a0e14',
        display: 'standalone',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}'],
        navigateFallbackDenylist: [/\.wasm$/, /\/assets\//],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/warframe-optimizer\/item_index\.json(\?.*)?$|^\/item_index\.json(\?.*)?$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'item-index-v2',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            urlPattern: /\/warframe-optimizer\/node_levels\.json(\?.*)?$|^\/node_levels\.json(\?.*)?$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'node-levels-v2',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['warframe-prapa-wasm'],
  },
})
