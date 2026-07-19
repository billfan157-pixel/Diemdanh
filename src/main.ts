// ============================================================
// Sổ Điểm GL - Main Entry Point
// ============================================================

import '../assets/css/main.css'
import '../assets/css/mobile.css'

import { App } from './ui/App'

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const mountPoint = document.getElementById('appMount')
  if (!mountPoint) {
    console.error('Missing #appMount element')
    return
  }

  const app = new App()
  app.mount(mountPoint)
})

// Handle unhandled errors gracefully
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
  event.preventDefault()
})

window.addEventListener('error', (event) => {
  console.error('Global error:', event.error)
})

// Service Worker registration for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed - app still works offline via Cache API
    })
  })
}