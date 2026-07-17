// ============================================================
// Sổ Điểm GL — Main Exports
// ============================================================

// Config
export * from './config/constants'

// Core
export { EventEmitter } from './core/events'
export { StateManager } from './ui/StateManager'
export { AuthManager } from './core/auth/AuthManager'
export { StorageAdapter, storage } from './services/storage/StorageAdapter'
export { SyncManager } from './services/sync/SyncManager'
export { NotificationManager } from './services/NotificationManager'

// Types
export type { AppState, ClassData, StudentData, ColumnWeights, AuthStore, UserRecord, SyncQueueItem, BackupRecord } from './services/storage/StorageAdapter.types'

// UI
export { App } from './ui/App'
export { LoginView } from './ui/views/LoginView'
export { AppView } from './ui/views/AppView'

// Utils
export * from './config/constants'