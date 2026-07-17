import { defineConfig } from 'vite'

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
          xlsx: ['xlsx'],
          jszip: ['jszip']
        }
      }
    },
    commonjsOptions: {
      include: [/xlsx/, /jszip/]
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
    include: ['immer', 'idb', '@supabase/supabase-js'],
    exclude: ['xlsx', 'jszip']
  }
})