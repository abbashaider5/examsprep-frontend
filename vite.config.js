import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.png',
        'apple-touch-icon.png',
        'og-image.png',
        'robots.txt',
        'sitemap.xml',
        'site.webmanifest',
      ],
      manifest: {
        name: 'LikhitAI',
        short_name: 'LikhitAI',
        description:
          'AI-powered exam generator, classroom platform, and secure assessment SaaS for teachers and schools.',
        theme_color: '#0366AC',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        lang: 'en',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg}'],
        globIgnores: ['demo-ss/**'], // screenshots served dynamically, skip precaching
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB — allow large screenshots
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  server: {
    // /api → Express (default http://localhost:5000). Run the API (`npm run dev:server` from repo root, or `npm run dev` for both) or Vite will log ECONNREFUSED on API calls.
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
});
