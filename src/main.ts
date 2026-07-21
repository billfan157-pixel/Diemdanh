// ============================================================
// Sổ Điểm GL - Main Entry Point
// ============================================================

import './styles/variables.css'
import './styles/main.css'

import { App } from './ui/App'
import { logger } from './services/Logger'

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
