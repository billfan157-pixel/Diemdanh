// ============================================================
// Sổ Điểm GL — Storage Adapter
// IndexedDB + localStorage fallback with migration
// ============================================================

import { openDB, IDBPDatabase } from 'idb'
import {
  AppState,
  SyncQueueItem,
  BackupRecord,
  AppDBSchema,
  ScoreColumnDef,
  ColumnWeights,
  ClassData,
  TermScores,
  ScoresByTerm
} from './StorageAdapter.types'
import {
  cloneDefaultCols,
  createEmptyScoresByTerm,
  createEmptyTermScores,
  ensureScoresMatchColumns,
  weightsFromColumns
} from '../../config/columns.ts'
import { generateId } from '../../utils/id.ts'

// ============================================================
// Constants
// ============================================================

const DB_NAME = 'so-diem-gl-db'
const DB_VERSION = 5
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
      if (!db.objectStoreNames.contains('classes')) {
        db.createObjectStore('classes', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('students')) {
        const studentStore = db.createObjectStore('students', { keyPath: 'id' })
        studentStore.createIndex('by-class', 'classId')
      }
      if (!db.objectStoreNames.contains('appMeta')) {
        db.createObjectStore('appMeta')
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
      if (oldVersion < 5) {
        // Version 5: New split stores are already created by the blocks above
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
      const db = await getDB()
      this.useIndexedDB = true
      await this.migrateToSplitSchema(db)
    } catch (e) {
      console.warn('IndexedDB not available, falling back to localStorage:', e)
      this.useIndexedDB = false
    }
    this.initialized = true
  }

  private async migrateToSplitSchema(db: IDBPDatabase<AppDBSchema>): Promise<void> {
    try {
      const oldState = await db.get('appState', 'main')
      if (!oldState) return

      console.info('Migrating database from version 4 to 5 (split schema)...')

      await db.put('appMeta', oldState.activeClassId, 'activeClassId')
      await db.put('appMeta', oldState.yearFilter, 'yearFilter')
      await db.put('appMeta', oldState.archivedYears || [], 'archivedYears')
      await db.put('appMeta', oldState.viewMode || 'cards', 'viewMode')
      await db.put('appMeta', oldState.activeTerm || 'hk1', 'activeTerm')
      await db.put('appMeta', oldState.theme || 'system', 'theme')
      await db.put('appMeta', oldState.parentTokens || [], 'parentTokens')
      await db.put('appMeta', oldState.lastModified || Date.now(), 'lastModified')

      if (Array.isArray(oldState.classes)) {
        for (const cls of oldState.classes) {
          const { students, ...classRecord } = cls
          await db.put('classes', classRecord)

          if (Array.isArray(students)) {
            for (const student of students) {
              await db.put('students', { ...student, classId: cls.id })
            }
          }
        }
      }

      await db.delete('appState', 'main')
      console.info('Database migration to split schema completed successfully.')
    } catch (e) {
      console.error('Database migration failed:', e)
    }
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
    let state: AppState | null = null

    if (this.useIndexedDB) {
      try {
        const db = await getDB()
        const activeClassId = await db.get('appMeta', 'activeClassId') ?? null
        const yearFilter = await db.get('appMeta', 'yearFilter') ?? null
        const archivedYears = await db.get('appMeta', 'archivedYears') ?? []
        const viewMode = await db.get('appMeta', 'viewMode') ?? 'cards'
        const activeTerm = await db.get('appMeta', 'activeTerm') ?? 'hk1'
        const theme = await db.get('appMeta', 'theme') ?? 'system'
        const parentTokens = await db.get('appMeta', 'parentTokens') ?? []
        const lastModified = await db.get('appMeta', 'lastModified') ?? Date.now()

        const classesList = await db.getAll('classes')
        const assembledClasses: ClassData[] = []
        
        for (const cls of classesList) {
          const studentsList = await db.getAllFromIndex('students', 'by-class', cls.id)
          assembledClasses.push({
            ...cls,
            students: studentsList.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
          })
        }

        if (classesList.length > 0 || activeClassId !== null || lastModified !== undefined) {
          state = {
            version: 6,
            activeClassId,
            yearFilter,
            archivedYears,
            viewMode,
            activeTerm: activeTerm as any,
            theme,
            parentTokens,
            lastModified,
            classes: assembledClasses
          }
          state = this.migrateState(state)
        }
      } catch (e) {
        console.warn('IndexedDB read failed, falling back:', e)
      }
    }

    // Fallback to localStorage
    if (!state) {
      try {
        const data = localStorage.getItem('so-diem-gl-state')
        if (data) state = this.migrateState(JSON.parse(data))
      } catch (e) {
        console.warn('localStorage read failed:', e)
      }
    }

    // One-time migration from legacy giao-ly-diem-v3
    // Only runs when the new state has zero classes (fresh start or stale empty state)
    try {
      const legacyRaw = localStorage.getItem('giao-ly-diem-v3')
      if (legacyRaw) {
        const legacy = JSON.parse(legacyRaw)
        if (legacy && Array.isArray(legacy.classes) && legacy.classes.length > 0) {
          if (!state || state.classes.length === 0) {
            console.info('Migrating legacy data from giao-ly-diem-v3')
            const migrated = this.migrateLegacyState(legacy)
            if (state) migrated.theme = state.theme
            await this.setState(migrated)
            this.migrateLegacyAuth()
            return migrated
          }
        }
      }
    } catch (e) {
      console.warn('Legacy migration failed:', e)
    }

    return state ?? this.getDefaultState()
  }

  async setState(state: AppState): Promise<void> {
    const lastModified = Date.now()

    if (this.useIndexedDB) {
      try {
        const db = await getDB()
        
        await db.put('appMeta', state.activeClassId, 'activeClassId')
        await db.put('appMeta', state.yearFilter, 'yearFilter')
        await db.put('appMeta', state.archivedYears, 'archivedYears')
        await db.put('appMeta', state.viewMode, 'viewMode')
        await db.put('appMeta', state.activeTerm, 'activeTerm')
        await db.put('appMeta', state.theme, 'theme')
        await db.put('appMeta', state.parentTokens, 'parentTokens')
        await db.put('appMeta', lastModified, 'lastModified')

        const currentClassIds = new Set(state.classes.map(c => c.id))

        for (const cls of state.classes) {
          const { students, ...classRecord } = cls
          await db.put('classes', classRecord)

          const existingDbStudents = await db.getAllFromIndex('students', 'by-class', cls.id)
          const incomingStudentIds = new Set(students.map(s => s.id))

          for (const student of students) {
            await db.put('students', { ...student, classId: cls.id })
          }

          for (const dbs of existingDbStudents) {
            if (!incomingStudentIds.has(dbs.id)) {
              await db.delete('students', dbs.id)
            }
          }
        }

        const dbClasses = await db.getAll('classes')
        for (const dbc of dbClasses) {
          if (!currentClassIds.has(dbc.id)) {
            await db.delete('classes', dbc.id)
            const dbStudents = await db.getAllFromIndex('students', 'by-class', dbc.id)
            for (const dbs of dbStudents) {
              await db.delete('students', dbs.id)
            }
          }
        }

        return
      } catch (e) {
        console.warn('IndexedDB write failed, falling back:', e)
      }
    }

    try {
      const stateToSave = {
        ...state,
        lastModified
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('so-diem-gl-state', JSON.stringify(stateToSave))
      }
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
        await db.clear('classes')
        await db.clear('students')
        await db.clear('appMeta')
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

  async getPendingSyncCount(): Promise<number> {
    if (!this.useIndexedDB) return 0
    try {
      const db = await getDB()
      const all = await db.getAll('syncQueue')
      return all.filter(item => item.status === 'pending' || item.status === 'failed').length
    } catch {
      return 0
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
        for (const b of toDelete) {
          await tx.store.delete(b.id!)
        }
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
      version: 6,
      activeClassId: null,
      classes: [],
      yearFilter: null,
      archivedYears: [],
      viewMode: 'cards',
      activeTerm: 'hk1',
      theme: 'system',
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
      version: Math.max(Number(state.version) || 1, 6),
      activeClassId: state.activeClassId ?? null,
      classes,
      yearFilter: state.yearFilter ?? null,
      archivedYears: Array.isArray(state.archivedYears)
        ? state.archivedYears.map(String).filter(Boolean)
        : [],
      viewMode: state.viewMode || 'cards',
      activeTerm: state.activeTerm || 'hk1',
      theme: state.theme || 'system',
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

  /** Migrate legacy giao-ly-diem-v3 state to new format. */
  private migrateLegacyState(legacy: any): AppState {
    // Must match the actual legacy GL.COLS so score keys align
    const legacyDefaultCols: ScoreColumnDef[] = [
      { key: 'dauGio', short: 'ĐG', label: 'Đầu giờ', defaultWeight: 1 },
      { key: 'phut15', short: '15\'', label: '15 phút', defaultWeight: 1 },
      { key: 'motTiet', short: '1T', label: '1 tiết', defaultWeight: 2 },
      { key: 'khaoKinh', short: 'KK', label: 'Khảo kinh', defaultWeight: 1 },
      { key: 'daoDuc', short: 'ĐĐ', label: 'Đạo đức', defaultWeight: 1 },
      { key: 'thi', short: 'Thi', label: 'Thi', defaultWeight: 3 }
    ]

    const classes: ClassData[] = (legacy.classes || []).map((oldCls: any) => {
      const clsCols = Array.isArray(oldCls.COLS)
        ? oldCls.COLS.map((c: any, _i: number) => ({
            key: String(c.key || c),
            short: String(c.short || c.key || ''),
            label: String(c.label || c.key || ''),
            defaultWeight: Number(c.defaultWeight || oldCls.weights?.[c.key] || 1)
          }))
        : legacyDefaultCols

      const clsWeights: ColumnWeights = {}
      clsCols.forEach((c: ScoreColumnDef) => {
        clsWeights[c.key] = Number(oldCls.weights?.[c.key] || c.defaultWeight || 1)
      })

      return {
        id: oldCls.id || generateId('cls'),
        name: oldCls.name || 'Lớp',
        year: oldCls.year || '',
        columns: clsCols,
        weights: clsWeights,
        students: (oldCls.students || []).map((oldSt: any, _si: number) => {
          const sid = oldSt.id || generateId('st')
          const scoresByTerm: ScoresByTerm = {
            hk1: this.buildLegacyScores(oldSt, clsCols, 'hk1'),
            hk2: this.buildLegacyScores(oldSt, clsCols, 'hk2')
          }
          return {
            id: sid,
            tenThanh: String(oldSt.tenThanh || oldSt.hoTenThanh || ''),
            hoDem: String(oldSt.hoDem || ''),
            ten: String(oldSt.ten || oldSt.name || ''),
            name: String(oldSt.name || ''),
            maHV: String(oldSt.maHV || oldSt.ma_hv || ''),
            ngaySinh: String(oldSt.ngaySinh || ''),
            gioiTinh: String(oldSt.gioiTinh || ''),
            tenPhuHuynh: String(oldSt.tenPhuHuynh || oldSt.phuHuynh || ''),
            sdPhuHuynh: String(oldSt.sdPhuHuynh || oldSt.sdt || ''),
            diaChi: String(oldSt.diaChi || oldSt.giaoXu || ''),
            email: String(oldSt.email || ''),
            ghiChu: String(oldSt.ghiChu || ''),
            scoresByTerm,
            learningLog: Array.isArray(oldSt.learningLog) ? oldSt.learningLog : [],
            createdAt: oldSt.createdAt || Date.now() - _si * 1000,
            updatedAt: oldSt.updatedAt || Date.now()
          }
        }),
        createdAt: oldCls.createdAt || Date.now(),
        updatedAt: oldCls.updatedAt || Date.now()
      }
    })

    return {
      version: 6,
      activeClassId: legacy.activeClassId || (classes[0]?.id || null),
      classes,
      yearFilter: null,
      archivedYears: [],
      viewMode: 'cards',
      activeTerm: 'hk1',
      theme: 'system',
      parentTokens: [],
      lastModified: Date.now()
    }
  }

  private buildLegacyScores(oldSt: any, cols: ScoreColumnDef[], term: 'hk1' | 'hk2'): TermScores {
    const result: Record<string, number[]> = {}
    for (const col of cols) {
      const raw = oldSt.scoresByTerm?.[term]?.[col.key]
        ?? oldSt.scores?.[term]?.[col.key]
        ?? oldSt[`${col.key}_${term}`]
        ?? oldSt[col.key]
      result[col.key] = Array.isArray(raw) ? raw.filter((n: any) => typeof n === 'number') : []
    }
    return result as TermScores
  }

  private migrateLegacyAuth(): void {
    try {
      const legacyRaw = localStorage.getItem('giao-ly-auth-v1')
      if (!legacyRaw) return

      const existing = localStorage.getItem('so-diem-gl-auth')
      if (existing) return

      const legacy = JSON.parse(legacyRaw)
      if (!legacy || !Array.isArray(legacy.users) || !legacy.users.length) return

      const newUsers = legacy.users.map((u: any) => ({
        id: u.id,
        username: u.username || 'admin',
        displayName: u.displayName || 'Ban Giáo lý',
        pinHash: u.pinHash || '',
        pinSalt: '', // ← empty signals legacy hash; verifyPin will fall back to simpleHash
        role: u.role === 'glv' ? 'glv' as const : 'ban_gl' as const,
        classIds: Array.isArray(u.classIds) ? u.classIds : [],
        active: u.active !== false,
        biometricEnabled: false,
        createdAt: u.createdAt || Date.now(),
        updatedAt: u.updatedAt || Date.now()
      }))

      const newStore = {
        version: 1,
        users: newUsers,
        activeUserId: legacy.activeUserId || null
      }

      localStorage.setItem('so-diem-gl-auth', JSON.stringify(newStore))
    } catch (e) {
      console.warn('Legacy auth migration failed:', e)
    }
  }

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
  // Backup Directory Handle (stored in IndexedDB appState store)
  // ============================================================

  async saveBackupHandle(handle: any): Promise<void> {
    if (!this.useIndexedDB) return
    try {
      const db = await getDB()
      if (handle) {
        await db.put('appState', handle, 'backupFolder')
      } else {
        await db.delete('appState', 'backupFolder')
      }
    } catch (e) {
      console.warn('Failed to save backup handle:', e)
    }
  }

  async getBackupHandle(): Promise<any> {
    if (!this.useIndexedDB) return null
    try {
      const db = await getDB()
      return (await db.get('appState', 'backupFolder')) || null
    } catch (e) {
      console.warn('Failed to get backup handle:', e)
      return null
    }
  }

  async deleteBackupHandle(): Promise<void> {
    if (!this.useIndexedDB) return
    try {
      const db = await getDB()
      await db.delete('appState', 'backupFolder')
    } catch (e) {
      console.warn('Failed to delete backup handle:', e)
    }
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