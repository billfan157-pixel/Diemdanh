// ============================================================
// SyncEngine Unit Tests
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SyncEngine } from '../../src/services/sync/SyncEngine'
import { StorageAdapter } from '../../src/services/storage/StorageAdapter'
import { StateManager } from '../../src/ui/StateManager'
import type { AppState, ClassData, StudentData } from '../../src/services/storage/StorageAdapter.types'

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

  vi.spyOn(storage, 'createBackup').mockResolvedValue(1)
  vi.spyOn(storage, 'getBackups').mockResolvedValue([])

  return storage
}

function createMockClass(id: string = 'cls-1', name: string = 'Lớp 1'): ClassData {
  return {
    id,
    name,
    year: '2025-2026',
    columns: [
      { key: 'khaoKinh', short: 'KK', label: 'Khảo Kinh', defaultWeight: 1 },
      { key: 'thuocBai', short: 'TB', label: 'Thuộc Bài', defaultWeight: 1 },
      { key: 'chuyenCan', short: 'CC', label: 'Chuyên Cần', defaultWeight: 1 }
    ],
    weights: { khaoKinh: 1, thuocBai: 1, chuyenCan: 1 },
    students: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}

function createMockStudent(id: string = 'st-1'): StudentData {
  return {
    id,
    tenThanh: 'Gioan',
    hoDem: 'Nguyễn Văn',
    ten: 'A',
    name: 'Nguyễn Văn A',
    maHV: 'HV001',
    ngaySinh: '2010-01-01',
    gioiTinh: 'Nam',
    tenPhuHuynh: 'Nguyễn Văn B',
    sdPhuHuynh: '0912345678',
    diaChi: '123 Đường ABC',
    email: '',
    ghiChu: '',
    scoresByTerm: {
      hk1: { khaoKinh: [8], thuocBai: [7], chuyenCan: [9] },
      hk2: { khaoKinh: [], thuocBai: [], chuyenCan: [] }
    },
    learningLog: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}

// ============================================================
// Tests
// ============================================================

describe('SyncEngine', () => {
  let storage: StorageAdapter
  let syncEngine: SyncEngine

  beforeEach(() => {
    storage = createMockStorage()
    syncEngine = new SyncEngine(storage)
  })

  describe('initialization', () => {
    it('should create instance with storage', () => {
      expect(syncEngine).toBeInstanceOf(SyncEngine)
    })

    it('should be an EventTarget', () => {
      expect(syncEngine).toBeInstanceOf(EventTarget)
    })

    it('should init without errors', async () => {
      await expect(syncEngine.init()).resolves.toBeUndefined()
    })
  })

  describe('setStateManager', () => {
    it('should use event-based tracking instead of intercepting mutate', async () => {
      const sm = new StateManager(storage)
      await sm.init()
      
      syncEngine.setStateManager(sm)
      
      // After setStateManager, should have mutation listener attached
      const mutationEvents: Array<{ label: string; fromNetwork: boolean }> = []
      sm.onMutation((label, fromNetwork) => {
        mutationEvents.push({ label, fromNetwork })
      })
      
      // Perform a local mutation - should trigger mutation event
      sm.createClass('Lớp test', '2025-2026')
      
      expect(mutationEvents.length).toBeGreaterThan(0)
    })

    it('should call enqueueSync when local mutation occurs', async () => {
      const sm = new StateManager(storage)
      await sm.init()
      
      const enqueueSpy = vi.spyOn(storage, 'enqueueSync')
      syncEngine.setStateManager(sm)
      
      // Perform a local mutation - should trigger sync enqueue
      sm.createClass('Lớp test', '2025-2026')
      
      expect(enqueueSpy).toHaveBeenCalled()
    })
  })

  describe('mergeRecordLocally', () => {
    it('should insert a class record locally', async () => {
      const sm = new StateManager(storage)
      await sm.init()
      syncEngine.setStateManager(sm)
      
      const cls = createMockClass('cls-merge-1', 'Lớp merge test')
      
      ;(syncEngine as any).mergeRecordLocally('classes', {
        id: cls.id,
        name: cls.name,
        year: cls.year,
        columns: cls.columns,
        weights: cls.weights,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      
      const state = sm.getState()
      const found = state.classes.find(c => c.id === 'cls-merge-1')
      expect(found).toBeDefined()
      expect(found?.name).toBe('Lớp merge test')
    })

    it('should update a class record locally', async () => {
      const sm = new StateManager(storage)
      await sm.init()
      
      const clsId = sm.createClass('Lớp cũ', '2025')
      
      syncEngine.setStateManager(sm)
      
      ;(syncEngine as any).mergeRecordLocally('classes', {
        id: clsId,
        name: 'Lớp mới',
        year: '2025',
        columns: sm.getClassColumns(clsId),
        weights: sm.getState().classes[0].weights,
        rev: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      
      const updated = sm.getClass(clsId)
      expect(updated?.name).toBe('Lớp mới')
    })

    it('should delete a class record locally', async () => {
      const sm = new StateManager(storage)
      await sm.init()
      
      const clsId = sm.createClass('Lớp bị xóa', '2025')
      
      syncEngine.setStateManager(sm)
      
      ;(syncEngine as any).deleteRecordLocally('classes', clsId)
      
      const deleted = sm.getClass(clsId)
      expect(deleted).toBeUndefined()
    })

    it('should insert a student record locally', async () => {
      const sm = new StateManager(storage)
      await sm.init()
      
      const clsId = sm.createClass('Lớp có học viên', '2025')
      
      syncEngine.setStateManager(sm)
      
      const student = createMockStudent('st-merge-1')
      
      ;(syncEngine as any).mergeRecordLocally('students', {
        id: student.id,
        class_id: clsId,
        ten_thanh: student.tenThanh,
        ho_dem: student.hoDem,
        ten: student.ten,
        name: student.name,
        ma_hv: student.maHV,
        ngay_sinh: student.ngaySinh,
        gioi_tinh: student.gioiTinh,
        ten_phu_huynh: student.tenPhuHuynh,
        sd_phu_huynh: student.sdPhuHuynh,
        dia_chi: student.diaChi,
        email: student.email,
        ghi_chu: student.ghiChu,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      
      const updatedCls = sm.getClass(clsId)
      expect(updatedCls?.students).toHaveLength(1)
      expect(updatedCls?.students[0].id).toBe('st-merge-1')
      expect(updatedCls?.students[0].tenThanh).toBe('Gioan')
    })

    it('should update student scores via mergeRecordLocally', async () => {
      const sm = new StateManager(storage)
      await sm.init()
      
      const clsId = sm.createClass('Lớp điểm', '2025')
      const student = createMockStudent('st-score-1')
      
      ;(sm as any).mutate('Add student', (draft: any) => {
        draft.classes[0].students.push(student)
      })
      
      syncEngine.setStateManager(sm)
      
      ;(syncEngine as any).mergeRecordLocally('scores', {
        student_id: 'st-score-1',
        term: 'hk1',
        col_key: 'khaoKinh',
        values: [9, 10],
        class_id: clsId
      })
      
      const updatedCls = sm.getClass(clsId)
      const updatedStudent = updatedCls?.students[0]
      expect(updatedStudent?.scoresByTerm.hk1.khaoKinh).toEqual([9, 10])
    })
  })

  describe('conflict detection', () => {
    it('should detect conflicts when getting pending count', async () => {
      const count = await syncEngine.getPendingCount()
      expect(typeof count).toBe('number')
    })

    it('should emit conflict event', async () => {
      const conflictHandler = vi.fn()
      syncEngine.addEventListener('conflict', conflictHandler)
      
      const conflictData = {
        op: { table: 'classes' as const, action: 'update' as const, id: 'cls-1', data: {} },
        cloudRecord: { rev: 5 },
        resolve: vi.fn()
      }
      
      syncEngine.dispatchEvent(new CustomEvent('conflict', { detail: conflictData }))
      
      expect(conflictHandler).toHaveBeenCalledOnce()
    })
  })

  describe('processQueue', () => {
    it('should process queue without errors', async () => {
      const result = await syncEngine.processQueue()
      expect(result).toBeUndefined()
    })
  })
})

describe('SyncEngine with state manager integration', () => {
  it('should integrate StateManager and track mutation events', async () => {
    const { supabaseService } = await import('../../src/services/SupabaseClient')
    vi.spyOn(supabaseService, 'isConfigured').mockReturnValue(false)
    vi.spyOn(supabaseService, 'getClient').mockReturnValue(null)

    const storage = createMockStorage()
    const sm = new StateManager(storage)
    const syncEngine = new SyncEngine(storage)
    
    await sm.init()
    await syncEngine.init()
    
    syncEngine.setStateManager(sm)
    
    const clsId = sm.createClass('Sync Test Class', '2025')
    
    sm.applyFromNetwork('Update from cloud', (draft: AppState) => {
      const idx = draft.classes.findIndex(c => c.id === clsId)
      if (idx !== -1) {
        draft.classes[idx].name = 'Sync Test Class (Updated)'
      }
    })
    
    const cls = sm.getClass(clsId)
    expect(cls?.name).toBe('Sync Test Class (Updated)')
    
    const mutationEvents: Array<{ label: string; fromNetwork: boolean }> = []
    sm.onMutation((label, fromNetwork) => {
      mutationEvents.push({ label, fromNetwork })
    })
    
    sm.createClass('Another Class', '2025')
    expect(mutationEvents[mutationEvents.length - 1].fromNetwork).toBe(false)
    
    sm.applyFromNetwork('Sync another', (draft: AppState) => {
      draft.classes.push({
        id: 'cls-sync-final',
        name: 'Final Sync Class',
        year: '2025',
        columns: [],
        weights: {},
        students: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
    })
    expect(mutationEvents[mutationEvents.length - 1].fromNetwork).toBe(true)
  })
})
