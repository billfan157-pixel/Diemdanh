// ============================================================
// Sổ Điểm GL - Main Entry Point
// ============================================================

import './styles/variables.css'
import './styles/main.css'

import { App } from './ui/App'
import { logger } from './services/Logger'
import { registerSW } from 'virtual:pwa-register'

// Register service worker with update prompt
const updateSW = registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('gl:pwa-update', {
      detail: {
        update: () => updateSW(true)
      }
    }))
  },
  onOfflineReady() {
    logger.info('App is ready to run offline.')
  }
})

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const mountPoint = document.getElementById('appMount')
  if (!mountPoint) {
    logger.error('Missing #appMount element')
    return
  }

  const app = new App()
  app.mount(mountPoint)
})

// Handle unhandled errors gracefully
window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection:', event.reason)
  event.preventDefault()
})

window.addEventListener('error', (event) => {
  logger.error('Global error:', event.error)
})
