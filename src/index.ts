// ============================================================
// Sổ Điểm GL — Main Exports
// ============================================================

// Config
export * from './config/constants.ts'

// Core
export { EventEmitter } from './core/events'
export { StateManager } from './ui/StateManager'
export { AuthManager } from './core/auth/AuthManager'
export { StorageAdapter, storage } from './services/storage/StorageAdapter'
export { SyncManager } from './services/sync/SyncManager'
export { NotificationManager } from './services/NotificationManager'

// Types
export type { AppState, ClassData, StudentData, ColumnWeights, ScoreColumnDef, ParentToken, AuthStore, UserRecord, SyncQueueItem, BackupRecord } from './services/storage/StorageAdapter.types'

// UI
export { App } from './ui/App'
export { LoginView } from './ui/views/LoginView'
export { GlLoginView } from './ui/views/gl-login-view'
export { GlProfileView } from './ui/views/gl-profile-view'
export { GlAppShell } from './ui/views/gl-app-shell'

// Utils
export * from './config/constants.ts'