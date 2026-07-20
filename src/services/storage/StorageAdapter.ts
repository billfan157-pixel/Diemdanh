// ============================================================
// Sổ Điểm GL — Storage Adapter
// IndexedDB + localStorage fallback with migration
// ============================================================

import { openDB, IDBPDatabase } from 'idb'
import {
  AppState,
  SyncQueueItem,
  BackupRecord,
  AppDBSchema
} from './StorageAdapter.types'
import {
  cloneDefaultCols,
  createEmptyScoresByTerm,
  createEmptyTermScores,
  ensureScoresMatchColumns,
  weightsFromColumns
} from '../../config/columns.ts'

// ============================================================
// Constants
// ============================================================

const DB_NAME = 'so-diem-gl-db'
const DB_VERSION = 4
const STORAGE_KEYS = {
  STATE: 'so-diem-gl-state',
  AUTH: 'so-diem-gl-auth',
  SETTINGS: 'so-diem-gl-settings',
  PRINT: 'so-diem-gl-print'
} as const



// ============================================================
// IndexedDB Schema & Instance
// ============================================================

let dbInstance: IDBPDatabase<AppDBSchema> | null = null

async function getDB(): Promise<IDBPDatabase<AppDBSchema>> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB<AppDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Create stores
      if (!db.objectStoreNames.contains('appState')) {
        db.createObjectStore('appState')
      }
      if (!db.objectStoreNames.contains('authStore')) {
        db.createObjectStore('authStore')
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true })
        syncStore.createIndex('by-timestamp', 'timestamp')
        syncStore.createIndex('by-type', 'type')
      }
      if (!db.objectStoreNames.contains('backups')) {
        const backupStore = db.createObjectStore('backups', { keyPath: 'id', autoIncrement: true })
        backupStore.createIndex('by-timestamp', 'timestamp')
      }

      // Migrations
      if (oldVersion < 2) {
        // Version 2: Add syncQueue
      }
      if (oldVersion < 3) {
        // Version 3: Add backups store
      }
      if (oldVersion < 4) {
        // Version 4: Update state version
      }
    }
  })

  return dbInstance
}

// ============================================================
// Storage Adapter Class
// ============================================================

export class StorageAdapter {
  private useIndexedDB = true
  private initialized = false

  async init(): Promise<void> {
    try {
      await getDB()
      this.useIndexedDB = true
    } catch (e) {
      console.warn('IndexedDB not available, falling back to localStorage:', e)
      this.useIndexedDB = false
    }
    this.initialized = true
  }

  isReady(): boolean {
    return this.initialized
  }

  isIndexedDBEnabled(): boolean {
    return this.useIndexedDB
  }

  // ============================================================
  // State Operations
  // ============================================================

  async getState(): Promise<AppState> {
    if (this.useIndexedDB) {
      try {
        const db = await getDB()
        const state = await db.get('appState', 'main')
        if (state) return this.migrateState(state)
      } catch (e) {
        console.warn('IndexedDB read failed, falling back:', e)
      }
    }

    // Fallback to localStorage
    try {
      const data = localStorage.getItem('so-diem-gl-state')
      if (data) return this.migrateState(JSON.parse(data))
    } catch (e) {
      console.warn('localStorage read failed:', e)
    }

    return this.getDefaultState()
  }

  async setState(state: AppState): Promise<void> {
    const stateToSave = {
      ...state,
      lastModified: Date.now()
    }

    if (this.useIndexedDB) {
      try {
        const db = await getDB()
        await db.put('appState', stateToSave, 'main')
        return
      } catch (e) {
        console.warn('IndexedDB write failed, falling back:', e)
      }
    }

    try {
      localStorage.setItem('so-diem-gl-state', JSON.stringify(stateToSave))
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.error('Storage quota exceeded')
        throw new Error('Bộ nhớ đầy, không thể lưu dữ liệu')
      }
      throw e
    }
  }

  async clearState(): Promise<void> {
    if (this.useIndexedDB) {
      try {
        const db = await getDB()
        await db.delete('appState', 'main')
      } catch (e) {
        console.warn('IndexedDB clear failed:', e)
      }
    }
    localStorage.removeItem('so-diem-gl-state')
  }

  // ============================================================
  // Auth Store Operations
  // ============================================================

  async getAuthStore(): Promise<{ version: number; users: any[]; activeUserId: string | null }> {
    if (this.useIndexedDB) {
      try {
        const db = await getDB()
        const store = await db.get('authStore', 'main')
        if (store) return store
      } catch (e) {
        console.warn('IndexedDB auth read failed:', e)
      }
    }

    try {
      const data = localStorage.getItem('so-diem-gl-auth')
      if (data) return JSON.parse(data)
    } catch (e) {
      console.warn('localStorage auth read failed:', e)
    }

    return { version: 1, users: [], activeUserId: null }
  }

  async setAuthStore(store: any): Promise<void> {
    if (this.useIndexedDB) {
      try {
        const db = await getDB()
        await db.put('authStore', store, 'main')
        return
      } catch (e) {
        console.warn('IndexedDB auth write failed:', e)
      }
    }

    try {
      localStorage.setItem('so-diem-gl-auth', JSON.stringify(store))
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        throw new Error('Bộ nhớ đầy, không thể lưu xác thực')
      }
      throw e
    }
  }

  // ============================================================
  // Sync Queue
  // ============================================================

  async enqueueSync(item: Omit<SyncQueueItem, 'id' | 'retries' | 'status'>): Promise<number> {
    if (!this.useIndexedDB) return -1

    try {
      const db = await getDB()
      const id = await db.add('syncQueue', {
        ...item,
        retries: 0,
        status: 'pending'
      })
      return id
    } catch (e) {
      console.warn('Failed to enqueue sync:', e)
      return -1
    }
  }

  async getPendingSyncItems(limit = 10): Promise<SyncQueueItem[]> {
    if (!this.useIndexedDB) return []

    try {
      const db = await getDB()
      const items = await db.getAllFromIndex('syncQueue', 'by-timestamp', undefined, limit)
      return items.filter(item => item.status === 'pending' || item.status === 'failed')
    } catch (e) {
      console.warn('Failed to get sync queue:', e)
      return []
    }
  }

  async markSyncItemCompleted(id: number): Promise<void> {
    if (!this.useIndexedDB) return
    try {
      const db = await getDB()
      await db.delete('syncQueue', id)
    } catch (e) {
      console.warn('Failed to mark sync completed:', e)
    }
  }

  async markSyncItemFailed(id: number): Promise<void> {
    if (!this.useIndexedDB) return
    try {
      const db = await getDB()
      const item = await db.get('syncQueue', id)
      if (item) {
        item.retries++
        item.status = item.retries >= 3 ? 'failed' : 'pending'
        await db.put('syncQueue', item)
      }
    } catch (e) {
      console.warn('Failed to mark sync failed:', e)
    }
  }

  async updateSyncStatus(id: number, status: 'pending' | 'syncing' | 'failed' | 'completed'): Promise<void> {
    if (!this.useIndexedDB) return
    try {
      const db = await getDB()
      const item = await db.get('syncQueue', id)
      if (item) {
        item.status = status
        await db.put('syncQueue', item)
      }
    } catch (e) {
      console.warn('Failed to update sync status:', e)
    }
  }

  // ============================================================
  // Backups
  // ============================================================

  async createBackup(state: any, auth: any): Promise<number> {
    if (!this.useIndexedDB) return -1

    try {
      const db = await getDB()
      const data = JSON.stringify({ state, auth })
      const checksum = await this.generateChecksum(data)

      const id = await db.add('backups', {
        timestamp: Date.now(),
        state,
        auth,
        size: data.length,
        checksum
      })

      // Keep only last 10 backups
      await this.pruneOldBackups(10)
      return id
    } catch (e) {
      console.warn('Failed to create backup:', e)
      return -1
    }
  }

  private async pruneOldBackups(keep: number): Promise<void> {
    try {
      const db = await getDB()
      const backups = await db.getAllFromIndex('backups', 'by-timestamp')
      if (backups.length > keep) {
        const toDelete = backups.slice(0, backups.length - keep)
        const tx = db.transaction('backups', 'readwrite')
        await Promise.all(toDelete.map(b => tx.store.delete(b.id!)))
        await tx.done
      }
    } catch (e) {
      console.warn('Failed to prune backups:', e)
    }
  }

  async getBackups(): Promise<BackupRecord[]> {
    if (!this.useIndexedDB) return []

    try {
      const db = await getDB()
      return await db.getAllFromIndex('backups', 'by-timestamp')
    } catch (e) {
      console.warn('Failed to get backups:', e)
      return []
    }
  }

  async getBackup(id: number): Promise<BackupRecord | undefined> {
    if (!this.useIndexedDB) return undefined
    try {
      const db = await getDB()
      return await db.get('backups', id)
    } catch (e) {
      console.warn('Failed to get backup:', e)
      return undefined
    }
  }

  async deleteBackup(id: number): Promise<void> {
    if (!this.useIndexedDB) return
    try {
      const db = await getDB()
      await db.delete('backups', id)
    } catch (e) {
      console.warn('Failed to delete backup:', e)
    }
  }

  async restoreBackup(id: number): Promise<{ state: any; auth: any } | null> {
    if (!this.useIndexedDB) return null
    try {
      const db = await getDB()
      const backup = await db.get('backups', id)
      if (!backup) return null
      return { state: backup.state, auth: backup.auth }
    } catch (e) {
      console.warn('Failed to restore backup:', e)
      return null
    }
  }

  // ============================================================
  // Utilities
  // ============================================================

  private async generateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  private getDefaultState(): AppState {
    return {
      version: 5,
      activeClassId: null,
      classes: [],
      yearFilter: null,
      archivedYears: [],
      viewMode: 'cards',
      activeTerm: 'hk1',
      parentTokens: [],
      lastModified: Date.now()
    }
  }

  private migrateState(state: any): AppState {
    const classes = (Array.isArray(state.classes) ? state.classes : []).map((c: any) => {
      const columns = Array.isArray(c.columns) && c.columns.length
        ? c.columns.map((col: any) => ({
            key: String(col.key || ''),
            short: String(col.short || col.key || '').slice(0, 4),
            label: String(col.label || col.key || ''),
            defaultWeight: typeof col.defaultWeight === 'number' && col.defaultWeight > 0 ? col.defaultWeight : 1
          })).filter((col: any) => col.key)
        : cloneDefaultCols()

      return {
        id: c.id || `cls_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: c.name || '',
        year: c.year || '',
        columns,
        weights: weightsFromColumns(columns, c.weights),
        students: Array.isArray(c.students)
          ? c.students.map((s: any) => this.migrateStudent(s, columns))
          : [],
        createdAt: c.createdAt || Date.now(),
        updatedAt: c.updatedAt || Date.now(),
        rev: c.rev
      }
    })

    return {
      version: Math.max(Number(state.version) || 1, 5),
      activeClassId: state.activeClassId ?? null,
      classes,
      yearFilter: state.yearFilter ?? null,
      archivedYears: Array.isArray(state.archivedYears)
        ? state.archivedYears.map(String).filter(Boolean)
        : [],
      viewMode: state.viewMode || 'cards',
      activeTerm: state.activeTerm || 'hk1',
      parentTokens: Array.isArray(state.parentTokens) ? state.parentTokens : [],
      lastModified: state.lastModified || Date.now()
    }
  }

  private migrateStudent(s: any, columns = cloneDefaultCols()): any {
    const scoresByTerm = s.scoresByTerm || createEmptyScoresByTerm(columns)
    return {
      id: s.id || `st_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenThanh: s.tenThanh || '',
      hoDem: s.hoDem || '',
      ten: s.ten || '',
      name: s.name || '',
      maHV: s.maHV || '',
      ngaySinh: s.ngaySinh || '',
      gioiTinh: s.gioiTinh || '',
      tenPhuHuynh: s.tenPhuHuynh || '',
      sdPhuHuynh: s.sdPhuHuynh || '',
      diaChi: s.diaChi || '',
      email: s.email || '',
      ghiChu: s.ghiChu || '',
      scoresByTerm: {
        hk1: ensureScoresMatchColumns(scoresByTerm.hk1 || createEmptyTermScores(columns), columns),
        hk2: ensureScoresMatchColumns(scoresByTerm.hk2 || createEmptyTermScores(columns), columns)
      },
      learningLog: Array.isArray(s.learningLog) ? s.learningLog : [],
      createdAt: s.createdAt || Date.now(),
      updatedAt: s.updatedAt || Date.now()
    }
  }

  // ============================================================
  // Export/Import
  // ============================================================

  async exportAll(): Promise<string> {
    const [state, auth] = await Promise.all([
      this.getState(),
      this.getAuthStore()
    ])

    return JSON.stringify({
      version: 2,
      exportedAt: Date.now(),
      state,
      auth,
      checksum: await this.generateChecksum(JSON.stringify({ state, auth }))
    }, null, 2)
  }

  async importAll(json: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const data = JSON.parse(json)

      if (!data.state || !data.auth) {
        return { ok: false, error: 'File backup không hợp lệ' }
      }

      // Verify checksum
      const expectedChecksum = await this.generateChecksum(JSON.stringify({ state: data.state, auth: data.auth }))
      if (data.checksum && data.checksum !== expectedChecksum) {
        return { ok: false, error: 'File backup bị hỏng (checksum không khớp)' }
      }

      await Promise.all([
        this.setState(data.state),
        this.setAuthStore(data.auth)
      ])

      return { ok: true }
    } catch (e: any) {
      return { ok: false, error: e.message || 'Lỗi khi khôi phục backup' }
    }
  }

  // ============================================================
  // Settings
  // ============================================================

  async getSettings(): Promise<Record<string, any>> {
    try {
      const data = localStorage.getItem('so-diem-gl-settings')
      return data ? JSON.parse(data) : {}
    } catch {
      return {}
    }
  }

  async setSettings(settings: Record<string, any>): Promise<void> {
    localStorage.setItem('so-diem-gl-settings', JSON.stringify(settings))
  }

  // ============================================================
  // Clear All
  // ============================================================

  async clearAll(): Promise<void> {
    if (this.useIndexedDB) {
      try {
        const db = await getDB()
        await Promise.all([
          db.clear('appState'),
          db.clear('authStore'),
          db.clear('syncQueue'),
          db.clear('backups')
        ])
      } catch (e) {
        console.warn('IndexedDB clear all failed:', e)
      }
    }

    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
  }
}

// ============================================================
// Export singleton
// ============================================================

export const storage = new StorageAdapter()