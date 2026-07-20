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
  }

  private showLogin(): void {
    // Dynamic import to avoid circular deps
    import('./views/LoginView').then(({ LoginView }) => {
      const view = new LoginView(this.authManager, this.notificationManager)
      this.mountPoint.innerHTML = ''
      this.mountPoint.appendChild(view.render())
      view.bindEvents()
    })
  }

  async showApp(): Promise<void> {
    import('./views/AppView').then(({ AppView }) => {
      const view = new AppView(
        this.stateManager,
        this.authManager,
        this.syncManager,
        this.notificationManager,
        this.backupService
      )
      this.mountPoint.innerHTML = ''
      this.mountPoint.appendChild(view.render())
      view.bindEvents()
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