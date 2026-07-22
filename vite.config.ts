import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'esbuild',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: 'index.html'
      },
      output: {
        manualChunks: {
          vendor: ['immer', 'idb', '@supabase/supabase-js'],
          lit: ['lit'],
          xlsx: ['xlsx']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true,
    cors: true
  },
  resolve: {
    alias: {
      '@': '/src',
      '@/core': '/src/core',
      '@/features': '/src/features',
      '@/services': '/src/services',
      '@/ui': '/src/ui',
      '@/config': '/src/config',
      '@/platform': '/src/platform'
    }
  },
  optimizeDeps: {
    include: ['immer', 'idb', '@supabase/supabase-js']
  },
  plugins: [
    ...(process.env.STORYBOOK
      ? []
      : [VitePWA({
          registerType: 'prompt',
          includeAssets: ['icon.svg'],
          manifest: {
            name: 'Sổ Điểm Giáo Lý',
            short_name: 'Sổ Điểm GL',
            description: 'Quản lý điểm giáo lý offline-first',
            theme_color: '#2563eb',
            background_color: '#2563eb',
            display: 'standalone',
            orientation: 'portrait-primary',
            scope: '/',
            start_url: '/',
            icons: [
              {
                src: 'icon.svg',
                sizes: 'any',
                type: 'image/svg+xml',
                purpose: 'any maskable'
              }
            ]
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,svg,ico,woff2}'],
            runtimeCaching: [
              {
                urlPattern: /^https?:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts',
                  expiration: {
                    maxEntries: 20,
                    maxAgeSeconds: 60 * 60 * 24 * 365
                  }
                }
              },
              {
                urlPattern: /^https?:\/\/cdn\.jsdelivr\.net\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'cdn-resources',
                  expiration: {
                    maxEntries: 20,
                    maxAgeSeconds: 60 * 60 * 24 * 30
                  }
                }
              },
              {
                urlPattern: /^https?:\/\/.*\/rest\/v1\/.*/i,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'supabase-api',
                  expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 60 * 60 * 24 * 7
                  },
                  networkTimeoutSeconds: 5
                }
              }
            ]
          }
        })]
    )
  ]
})