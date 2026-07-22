// ============================================================
// SyncManager Unit Tests
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SyncManager } from '../../src/services/sync/SyncManager'
import { StorageAdapter } from '../../src/services/storage/StorageAdapter'
import { StateManager } from '../../src/ui/StateManager'
import { AuthManager } from '../../src/core/auth/AuthManager'
import type { AppState } from '../../src/services/storage/StorageAdapter.types'

// ============================================================
// Helpers
// ============================================================

function createMockStorage(): StorageAdapter {
  const storage = new StorageAdapter()
  
  const defaultState: AppState = {
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

  vi.spyOn(storage, 'init').mockResolvedValue(undefined)
  vi.spyOn(storage, 'isReady').mockReturnValue(true)
  vi.spyOn(storage, 'isIndexedDBEnabled').mockReturnValue(true)
  vi.spyOn(storage, 'getState').mockResolvedValue({ ...defaultState })
  vi.spyOn(storage, 'setState').mockResolvedValue(undefined)
  
  vi.spyOn(storage, 'getPendingSyncCount').mockResolvedValue(0)
  vi.spyOn(storage, 'enqueueSync').mockResolvedValue(1)
  vi.spyOn(storage, 'getPendingSyncItems').mockResolvedValue([])
  vi.spyOn(storage, 'markSyncItemCompleted').mockResolvedValue(undefined)
  vi.spyOn(storage, 'markSyncItemFailed').mockResolvedValue(undefined)
  vi.spyOn(storage, 'updateSyncStatus').mockResolvedValue(undefined)

  vi.spyOn(storage, 'getAuthStore').mockResolvedValue({ version: 1, users: [], activeUserId: null })
  vi.spyOn(storage, 'setAuthStore').mockResolvedValue(undefined)

  return storage
}

// ============================================================
// Tests
// ============================================================

describe('SyncManager', () => {
  let storage: StorageAdapter
  let stateManager: StateManager
  let syncManager: SyncManager

  beforeEach(async () => {
    storage = createMockStorage()
    stateManager = new StateManager(storage)
    syncManager = new SyncManager(storage)
    
    await stateManager.init()
    syncManager.setStateManager(stateManager)
  })

  describe('initialization', () => {
    it('should create instance with dependencies', () => {
      expect(syncManager).toBeInstanceOf(SyncManager)
    })

    it('should be an EventTarget', () => {
      expect(syncManager).toBeInstanceOf(EventTarget)
    })

    it('should have initial idle status', () => {
      const status = syncManager.getStatus()
      expect(status.status).toBe('idle')
      expect(status.lastSync).toBeNull()
      expect(status.pendingCount).toBe(0)
    })
  })

  describe('manual sync', () => {
    it('should handle sync when Supabase not configured', async () => {
      const result = await syncManager.sync()
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Chưa cấu hình Supabase')
    })

    it('should return sync result object', async () => {
      const result = await syncManager.sync()
      expect(result).toHaveProperty('ok')
      expect(result).toHaveProperty('error')
    })
  })

  describe('pull operation', () => {
    it('should return error when Supabase not configured', async () => {
      const result = await syncManager.pull()
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Chưa cấu hình Supabase')
    })
  })

  describe('push operation', () => {
    it('should return error when Supabase not configured', async () => {
      const result = await syncManager.push()
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Chưa cấu hình Supabase')
    })
  })

  describe('status tracking', () => {
    it('should return current status', () => {
      const status = syncManager.getStatus()
      expect(status).toHaveProperty('status')
      expect(status).toHaveProperty('lastSync')
      expect(status).toHaveProperty('pendingCount')
    })

    it('should have idle status initially', () => {
      const status = syncManager.getStatus()
      expect(status.status).toBe('idle')
    })
  })

  describe('conflict handling', () => {
    it('should propagate conflict events from SyncEngine', async () => {
      const conflictHandler = vi.fn()
      syncManager.addEventListener('conflict', conflictHandler)
      
      // Simulate conflict event
      const conflictData = {
        op: { table: 'classes' as const, action: 'update' as const, id: 'cls-1', data: {} },
        cloudRecord: { rev: 5 },
        resolve: vi.fn()
      }
      
      syncManager.dispatchEvent(new CustomEvent('conflict', { detail: conflictData }))
      
      expect(conflictHandler).toHaveBeenCalledOnce()
    })
  })
})

describe('SyncManager with Supabase mock', () => {
  it('should handle successful pull with mock Supabase', async () => {
    const storage = createMockStorage()
    const stateManager = new StateManager(storage)
    const syncManager = new SyncManager(storage)
    
    await stateManager.init()
    syncManager.setStateManager(stateManager)
    
    // Mock Supabase to be configured
    const { supabaseService } = await import('../../src/services/SupabaseClient')
    vi.spyOn(supabaseService, 'isConfigured').mockReturnValue(true)
    vi.spyOn(supabaseService, 'getClient').mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null })
      })
    } as any)
    
    const result = await syncManager.pull()
    
    // Should not error due to configuration
    expect(result.ok).toBe(true)
  })

  it('should pull and merge real data into state', async () => {
    const storage = createMockStorage()
    const stateManager = new StateManager(storage)
    const syncManager = new SyncManager(storage)
    
    await stateManager.init()
    syncManager.setStateManager(stateManager)

    const { supabaseService } = await import('../../src/services/SupabaseClient')
    vi.spyOn(supabaseService, 'isConfigured').mockReturnValue(true)
    const mockFrom = vi.fn().mockImplementation((table: string) => ({
      select: vi.fn().mockResolvedValue(
        table === 'classes'
          ? { data: [{ id: 'c1', name: 'Lớp Cloud', year: '2025', columns: [{ key: 'khaoKinh', short: 'KK', label: 'KK', defaultWeight: 1 }], weights: { khaoKinh: 1 }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }], error: null }
          : table === 'students'
          ? { data: [{ id: 's1', class_id: 'c1', ten_thanh: 'Phêrô', ho_dem: 'Trần', ten: 'An', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }], error: null }
          : table === 'scores'
          ? { data: [{ student_id: 's1', term: 'hk1', col_key: 'khaoKinh', values: [9] }], error: null }
          : { data: [], error: null }
      )
    }))
    vi.spyOn(supabaseService, 'getClient').mockReturnValue({ from: mockFrom } as any)

    const result = await syncManager.pull()
    expect(result.ok).toBe(true)

    const state = stateManager.getState()
    expect(state.classes).toHaveLength(1)
    expect(state.classes[0].name).toBe('Lớp Cloud')
    expect(state.classes[0].students).toHaveLength(1)
    expect(state.classes[0].students[0].ten).toBe('An')
    expect(state.classes[0].students[0].scoresByTerm.hk1.khaoKinh).toEqual([9])
  })

  it('should handle pull fetch error gracefully', async () => {
    const storage = createMockStorage()
    const syncManager = new SyncManager(storage)

    const { supabaseService } = await import('../../src/services/SupabaseClient')
    vi.spyOn(supabaseService, 'isConfigured').mockReturnValue(true)
    vi.spyOn(supabaseService, 'getClient').mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') })
      })
    } as any)

    const result = await syncManager.pull()
    expect(result.ok).toBe(false)
  })

  it('should configure Supabase and persist settings', async () => {
    const storage = createMockStorage()
    const syncManager = new SyncManager(storage)

    const { supabaseService } = await import('../../src/services/SupabaseClient')
    const configureSpy = vi.spyOn(supabaseService, 'configure')

    const setItemSpy = vi.spyOn(localStorage, 'setItem')
    syncManager.configureSupabase('https://test.supabase.co', 'test-key')
    expect(configureSpy).toHaveBeenCalledWith('https://test.supabase.co', 'test-key')
    expect(setItemSpy).toHaveBeenCalledWith('so-diem-gl-supabase', expect.any(String))
  })
})

describe('SyncManager auto-sync', () => {
  let storage: StorageAdapter
  let syncManager: SyncManager

  beforeEach(() => {
    storage = createMockStorage()
    syncManager = new SyncManager(storage)
  })

  it('should start and stop auto-sync', () => {
    const syncSpy = vi.spyOn(syncManager, 'sync').mockResolvedValue({ ok: true })
    syncManager.startAutoSync(500)
    expect(syncManager['syncInterval']).not.toBeNull()
    syncManager.stopAutoSync()
    expect(syncManager['syncInterval']).toBeNull()
  })

  it('should not start duplicate auto-sync intervals', () => {
    syncManager.startAutoSync(500)
    const firstInterval = syncManager['syncInterval']
    syncManager.startAutoSync(500)
    expect(syncManager['syncInterval']).toBe(firstInterval)
    syncManager.stopAutoSync()
  })

  it('should get Supabase URL', async () => {
    const { supabaseService } = await import('../../src/services/SupabaseClient')
    vi.spyOn(supabaseService, 'getUrl').mockReturnValue('https://test.supabase.co')
    expect(syncManager.getSupabaseUrl()).toBe('https://test.supabase.co')
  })

  it('should return configured status', async () => {
    const { supabaseService } = await import('../../src/services/SupabaseClient')
    vi.spyOn(supabaseService, 'isConfigured').mockReturnValue(true)
    expect(syncManager.isConfigured()).toBe(true)
  })

  it('should refresh pending count', async () => {
    const { supabaseService } = await import('../../src/services/SupabaseClient')
    vi.spyOn(supabaseService, 'isConfigured').mockReturnValue(false)
    await syncManager.refreshPendingCount()
    const status = syncManager.getStatus()
    expect(status).toHaveProperty('pendingCount')
  })

  it('should handle sync when supabase is configured', async () => {
    const { supabaseService } = await import('../../src/services/SupabaseClient')
    vi.spyOn(supabaseService, 'isConfigured').mockReturnValue(true)
    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null })
      })
    }
    vi.spyOn(supabaseService, 'getClient').mockReturnValue(mockClient as any)

    const result = await syncManager.sync()
    expect(result.ok).toBe(true)
  })

  it('should set auth manager (backward compat)', () => {
    const am = { getCurrentUser: vi.fn() } as any
    syncManager.setAuthManager(am)
    // Should not throw
  })
})
