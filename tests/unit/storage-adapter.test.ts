import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StorageAdapter } from '../../src/services/storage/StorageAdapter'

describe('StorageAdapter localStorage fallback', () => {
  let storage: StorageAdapter
  let store: Record<string, string> = {}

  beforeEach(() => {
    store = {}
    global.localStorage = {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { store[key] = String(value) }),
      removeItem: vi.fn((key: string) => { delete store[key] }),
      clear: vi.fn(() => { store = {} }),
      length: 0,
      key: vi.fn()
    } as any
    storage = new StorageAdapter()
    ;(storage as any).useIndexedDB = false
    ;(storage as any).initialized = true
  })

  it('should return default state when localStorage is empty', async () => {
    const state = await storage.getState()
    expect(state.version).toBe(6)
    expect(state.classes).toEqual([])
    expect(state.activeClassId).toBeNull()
  })

  it('should save and load state via setState/getState', async () => {
    await storage.setState({
      version: 6, activeClassId: 'cls-1', classes: [{
        id: 'cls-1', name: 'Lớp 1', year: '2025',
        columns: [{ key: 'khaoKinh', short: 'KK', label: 'KK', defaultWeight: 1 }],
        weights: { khaoKinh: 1 }, students: [],
        createdAt: 100, updatedAt: 100
      }],
      yearFilter: null, archivedYears: [], viewMode: 'cards',
      activeTerm: 'hk1', theme: 'system', parentTokens: [], lastModified: 100
    })
    expect(store['so-diem-gl-state']).toBeTruthy()
    const state = await storage.getState()
    expect(state.classes).toHaveLength(1)
    expect(state.classes[0].name).toBe('Lớp 1')
    expect(state.activeClassId).toBe('cls-1')
  })

  it('should clear state via clearState', async () => {
    store['so-diem-gl-state'] = JSON.stringify({ version: 6, classes: [], activeClassId: 'x' })
    await storage.clearState()
    expect(store['so-diem-gl-state']).toBeUndefined()
  })

  it('should return default state when stored data is corrupt', async () => {
    store['so-diem-gl-state'] = 'not-json'
    const state = await storage.getState()
    expect(state.version).toBe(6)
    expect(state.classes).toEqual([])
  })

  it('should migrate v3 state on getState', async () => {
    store['giao-ly-diem-v3'] = JSON.stringify({
      version: 3, activeClassId: 'cls-old', classes: [{
        id: 'cls-old', name: 'Legacy', year: '2024',
        weights: { dauGio: 1, phut15: 1, motTiet: 2, khaoKinh: 1, daoDuc: 1, thi: 3 },
        students: [{
          id: 'st-old', tenThanh: 'Anna', hoDem: 'Nguyen', ten: 'An',
          scoresByTerm: { hk1: { dauGio: [8] }, hk2: {} }
        }]
      }]
    })
    const state = await storage.getState()
    expect(state.classes).toHaveLength(1)
    expect(state.classes[0].name).toBe('Legacy')
    expect(state.classes[0].students).toHaveLength(1)
    expect(state.classes[0].students[0].scoresByTerm.hk1.dauGio).toEqual([8])
  })

  it('should handle legacy v3 migration with empty state', async () => {
    store['giao-ly-diem-v3'] = JSON.stringify({ classes: [], activeClassId: null })
    // Should not migrate since classes is empty
    const state = await storage.getState()
    expect(state.classes).toEqual([])
  })

  it('should export all data', async () => {
    store['so-diem-gl-auth'] = JSON.stringify({ version: 1, users: [], activeUserId: null })
    store['so-diem-gl-state'] = JSON.stringify({
      version: 6, classes: [], activeClassId: null,
      yearFilter: null, archivedYears: [], viewMode: 'cards',
      activeTerm: 'hk1', theme: 'system', parentTokens: [], lastModified: 100
    })
    const json = await storage.exportAll()
    const data = JSON.parse(json)
    expect(data.version).toBe(2)
    expect(data.state).toBeDefined()
    expect(data.auth).toBeDefined()
    expect(data.state.version).toBe(6)
    expect(data.checksum).toBeTruthy()
  })

  it('should import all data with valid checksum', async () => {
    const testState = { version: 6, classes: [{ id: 'c1', name: 'Imported' }], activeClassId: 'c1' }
    const testAuth = { version: 1, users: [], activeUserId: null }
    const payload = JSON.stringify({ state: testState, auth: testAuth })
    const checksum = await (storage as any).generateChecksum(JSON.stringify({ state: testState, auth: testAuth }))
    const json = JSON.stringify({ version: 2, state: testState, auth: testAuth, checksum })

    const result = await storage.importAll(json)
    expect(result.ok).toBe(true)
    expect(store['so-diem-gl-state']).toBeTruthy()
  })

  it('should reject import with checksum mismatch', async () => {
    const result = await storage.importAll(JSON.stringify({
      version: 2, state: {}, auth: {}, checksum: 'bad'
    }))
    expect(result.ok).toBe(false)
    expect(result.error).toContain('checksum')
  })

  it('should reject import with missing auth', async () => {
    const result = await storage.importAll(JSON.stringify({ state: {} }))
    expect(result.ok).toBe(false)
  })

  it('should handle import parse error', async () => {
    const result = await storage.importAll('not-json')
    expect(result.ok).toBe(false)
  })

  it('should save and load auth store', async () => {
    const auth = { version: 1, users: [{ id: 'u1', username: 'admin' }], activeUserId: 'u1' }
    await storage.setAuthStore(auth)
    const loaded = await storage.getAuthStore()
    expect(loaded.users).toHaveLength(1)
    expect(loaded.users[0].username).toBe('admin')
  })

  it('should return default auth store when empty', async () => {
    const auth = await storage.getAuthStore()
    expect(auth.version).toBe(1)
    expect(auth.users).toEqual([])
    expect(auth.activeUserId).toBeNull()
  })

  it('should save and load settings', async () => {
    await storage.setSettings({ autoSync: true, theme: 'dark' })
    const settings = await storage.getSettings()
    expect(settings.autoSync).toBe(true)
    expect(settings.theme).toBe('dark')
  })

  it('should return empty object when no settings saved', async () => {
    const settings = await storage.getSettings()
    expect(settings).toEqual({})
  })

  it('should clear all data', async () => {
    store['so-diem-gl-state'] = 'test'
    store['so-diem-gl-auth'] = 'test'
    store['so-diem-gl-settings'] = 'test'
    await storage.clearAll()
    expect(store['so-diem-gl-state']).toBeUndefined()
    expect(store['so-diem-gl-auth']).toBeUndefined()
    expect(store['so-diem-gl-settings']).toBeUndefined()
  })

  it('should handle IndexedDB disabled for backup handle ops', async () => {
    const result = await storage.getBackupHandle()
    expect(result).toBeNull()
    await storage.saveBackupHandle({ name: 'test' })
    await storage.deleteBackupHandle()
    // Should not throw
  })

  it('should handle IndexedDB disabled for sync operations', async () => {
    const id = await storage.enqueueSync({ type: 'sync_op', data: {}, timestamp: 1 })
    expect(id).toBe(-1)
    const items = await storage.getPendingSyncItems()
    expect(items).toEqual([])
    const count = await storage.getPendingSyncCount()
    expect(count).toBe(0)
    await storage.markSyncItemCompleted(1)
    await storage.markSyncItemFailed(1)
    await storage.updateSyncStatus(1, 'failed')
    // Should not throw
  })

  it('should handle IndexedDB disabled for backup operations', async () => {
    const id = await storage.createBackup({}, {})
    expect(id).toBe(-1)
    const backups = await storage.getBackups()
    expect(backups).toEqual([])
    const backup = await storage.getBackup(1)
    expect(backup).toBeUndefined()
    await storage.deleteBackup(1)
    const restored = await storage.restoreBackup(1)
    expect(restored).toBeNull()
  })
})
