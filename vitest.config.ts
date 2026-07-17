import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['src/ui/**', 'src/vendors/**', 'tests/**', '*.config.*', '*.d.ts']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/core': path.resolve(__dirname, 'src/core'),
      '@/features': path.resolve(__dirname, 'src/features'),
      '@/services': path.resolve(__dirname, 'src/services'),
      '@/ui': path.resolve(__dirname, 'src/ui'),
      '@/config': path.resolve(__dirname, 'src/config'),
      '@/platform': path.resolve(__dirname, 'src/platform')
    }
  }
})