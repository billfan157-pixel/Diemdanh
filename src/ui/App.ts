// ============================================================
// Sổ Điểm GL — App Component
// ============================================================

import { EventEmitter } from '../core/events'
import { StorageAdapter } from '../services/storage/StorageAdapter'
import { StateManager } from './StateManager'
import { AuthManager } from '../core/auth/AuthManager'
import { SyncManager } from '../services/sync/SyncManager'
import { NotificationManager } from '../services/NotificationManager'
import { BackupService } from '../services/BackupService'
import { BeforeInstallPromptEvent, setInstallPrompt } from '../services/PWAInstall'

export class App extends EventEmitter {
  private mountPoint!: HTMLElement
  private storage!: StorageAdapter
  private stateManager!: StateManager
  private authManager!: AuthManager
  private syncManager!: SyncManager
  private notificationManager!: NotificationManager
  private backupService!: BackupService

  async mount(mountPoint: HTMLElement): Promise<void> {
    this.mountPoint = mountPoint

    // Initialize core services
    this.storage = new StorageAdapter()
    await this.storage.init()

    this.notificationManager = new NotificationManager()

    // Initialize state manager with storage
    this.stateManager = new StateManager(this.storage)
    await this.stateManager.init()

    this.backupService = new BackupService(this.storage, this.notificationManager)
    this.backupService.setStateManager(this.stateManager)

    this.authManager = new AuthManager(this.storage)
    this.authManager.setStateManager(this.stateManager)
    await this.authManager.init()

    this.syncManager = new SyncManager(this.storage)
    this.syncManager.setStateManager(this.stateManager)
    this.syncManager.setAuthManager(this.authManager)

    // Setup global error handlers
    this.setupGlobalHandlers()

    // Parent read-only report card via #/ph/{token} (no login)
    const { parseParentTokenFromHash } = await import('../features/parentReport.ts')
    const parentToken = parseParentTokenFromHash()
    if (parentToken) {
      await this.showParentReport(parentToken)
      this.emit('ready')
      return
    }

    window.addEventListener('hashchange', () => {
      const token = parseParentTokenFromHash()
      if (token) {
        this.showParentReport(token)
      }
    })

    // Listen for login/logout events to switch views
    window.addEventListener('gl:login', () => {
      this.showApp()
    })

    window.addEventListener('gl:logout', () => {
      this.showLogin()
    })

    // Check if user is logged in
    if (this.authManager.isLoggedIn()) {
      await this.showApp()
    } else {
      this.showLogin()
    }

    this.emit('ready')
  }

  private async showParentReport(token: string): Promise<void> {
    const { ParentReportView } = await import('./views/ParentReportView')
    const view = new ParentReportView(this.stateManager, token)
    this.mountPoint.innerHTML = ''
    this.mountPoint.appendChild(view.render())
  }

  private setupGlobalHandlers(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error)
      this.notificationManager.show('Đã xảy ra lỗi không mong muốn', 'error')
    })

    // Unhandled promise rejection
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled rejection:', event.reason)
      event.preventDefault()
    })

    // Online/offline detection
    window.addEventListener('online', () => {
      this.notificationManager.show('Đã kết nối lại mạng', 'success')
      this.syncManager.sync()
    })

    window.addEventListener('offline', () => {
      this.notificationManager.show('Mất kết nối mạng - chế độ offline', 'warning')
    })

    // PWA install prompt
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    })

    window.addEventListener('appinstalled', () => {
      setInstallPrompt(null)
      this.notificationManager.show('Đã cài đặt ứng dụng thành công!', 'success')
    })
  }

  private showLogin(): void {
    import('./views/gl-login-view').then(() => {
      const el = document.createElement('gl-login-view') as any
      el.authManager = this.authManager
      el.notificationManager = this.notificationManager
      this.mountPoint.innerHTML = ''
      this.mountPoint.appendChild(el)
    }).catch(e => {
      console.error('Failed to load view:', e)
      this.mountPoint.innerHTML = '<p class="text-center mt-4">Không thể tải giao diện. Vui lòng thử lại.</p>'
    })
  }

  async showApp(): Promise<void> {
    import('./views/gl-app-shell').then(() => {
      const el = document.createElement('gl-app-shell') as any
      el.stateManager = this.stateManager
      el.authManager = this.authManager
      el.syncManager = this.syncManager
      el.notificationManager = this.notificationManager
      el.backupService = this.backupService
      this.mountPoint.innerHTML = ''
      this.mountPoint.appendChild(el)
    }).catch(e => {
      console.error('Failed to load view:', e)
      this.mountPoint.innerHTML = '<p class="text-center mt-4">Không thể tải giao diện. Vui lòng thử lại.</p>'
    })
  }

  // Public API for other modules
  getStorage(): StorageAdapter { return this.storage }
  getStateManager(): StateManager { return this.stateManager }
  getAuthManager(): AuthManager { return this.authManager }
  getSyncManager(): SyncManager { return this.syncManager }
  getNotificationManager(): NotificationManager { return this.notificationManager }
  getBackupService(): BackupService { return this.backupService }
}