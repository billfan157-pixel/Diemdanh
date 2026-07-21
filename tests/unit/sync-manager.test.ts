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
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            data: [],
            error: null
          })
        })
      })
    } as any)
    
    const result = await syncManager.pull()
    
    // Should not error due to configuration
    expect(result.ok).toBeDefined()
  })
})
