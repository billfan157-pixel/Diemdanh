import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StorageAdapter } from '../../src/services/storage/StorageAdapter'

describe('StorageAdapter State Migration', () => {
  let storage: StorageAdapter
  let store: Record<string, string> = {}

  beforeEach(() => {
    store = {}
    global.localStorage = {
      getItem: vi.fn((key) => store[key] || null),
      setItem: vi.fn((key, value) => { store[key] = String(value) }),
      removeItem: vi.fn((key) => { delete store[key] }),
      clear: vi.fn(() => { store = {} }),
      length: 0,
      key: vi.fn()
    } as any

    storage = new StorageAdapter()
    ;(storage as any).useIndexedDB = false
    ;(storage as any).initialized = true
  })

  it('should return default state when no state exists', async () => {
    const state = await storage.getState()
    expect(state.version).toBe(6)
    expect(state.classes).toEqual([])
    expect(state.activeClassId).toBeNull()
  })

  it('should migrate legacy giao-ly-diem-v3 state (no COLS, uses GL.COLS defaults)', async () => {
    // Real legacy data: createClass() does NOT set COLS, scores use GL.COLS keys
    const legacyData = {
      version: 3,
      activeClassId: 'cls1',
      classes: [{
        id: 'cls1',
        name: 'Lớp 1A',
        year: '2025-2026',
        // NO COLS property — matches real GL.createClass() output
        weights: { dauGio: 1, phut15: 1, motTiet: 2, khaoKinh: 1, daoDuc: 1, thi: 3 },
        students: [{
          id: 'st1',
          tenThanh: 'Anna',
          hoDem: 'Nguyễn Văn',
          ten: 'An',
          phuHuynh: 'Nguyễn Văn Bình',  // legacy field → tenPhuHuynh
          sdt: '09xx xxx xxx',           // legacy field → sdPhuHuynh
          giaoXu: 'GX Trảng Bom',        // legacy field → diaChi
          scoresByTerm: {
            hk1: { dauGio: [8, 9], phut15: [7], motTiet: [8.5], khaoKinh: [8], daoDuc: [9], thi: [7] },
            hk2: { dauGio: [9], phut15: [8], khaoKinh: [9], daoDuc: [8.5] }
          },
          ghiChu: 'Chăm chỉ'
        }, {
          id: 'st2',
          tenThanh: 'Phêrô',
          hoDem: 'Trần',
          ten: 'Bình',
          scoresByTerm: {
            hk1: { dauGio: [6, 7], phut15: [6.5], motTiet: [7], khaoKinh: [6], daoDuc: [7], thi: [8] }
          }
        }]
      }]
    }

    localStorage.setItem('giao-ly-diem-v3', JSON.stringify(legacyData))

    const migratedState = await storage.getState()
    expect(migratedState.version).toBe(6)
    expect(migratedState.classes.length).toBe(1)

    const cls = migratedState.classes[0]
    expect(cls.id).toBe('cls1')
    expect(cls.name).toBe('Lớp 1A')
    // Must have all 6 legacy GL.COLS (not the new defaults)
    expect(cls.columns.length).toBe(6)
    expect(cls.columns[0].key).toBe('dauGio')
    expect(cls.columns[1].key).toBe('phut15')
    expect(cls.columns[2].key).toBe('motTiet')
    expect(cls.columns[3].key).toBe('khaoKinh')
    expect(cls.columns[4].key).toBe('daoDuc')
    expect(cls.columns[5].key).toBe('thi')
    expect(cls.weights.dauGio).toBe(1)
    expect(cls.weights.motTiet).toBe(2)
    expect(cls.weights.khaoKinh).toBe(1)

    expect(cls.students.length).toBe(2)

    // Student 1: legacy fields mapped + scores preserved
    const st1 = cls.students[0]
    expect(st1.tenThanh).toBe('Anna')
    expect(st1.hoDem).toBe('Nguyễn Văn')
    expect(st1.ghiChu).toBe('Chăm chỉ')
    expect(st1.tenPhuHuynh).toBe('Nguyễn Văn Bình')   // mapped from phuHuynh
    expect(st1.sdPhuHuynh).toBe('09xx xxx xxx')         // mapped from sdt
    expect(st1.diaChi).toBe('GX Trảng Bom')             // mapped from giaoXu
    expect(st1.scoresByTerm.hk1.dauGio).toEqual([8, 9])
    expect(st1.scoresByTerm.hk1.phut15).toEqual([7])
    expect(st1.scoresByTerm.hk1.motTiet).toEqual([8.5])
    expect(st1.scoresByTerm.hk1.khaoKinh).toEqual([8])
    expect(st1.scoresByTerm.hk1.daoDuc).toEqual([9])
    expect(st1.scoresByTerm.hk1.thi).toEqual([7])
    expect(st1.scoresByTerm.hk2.khaoKinh).toEqual([9])
    expect(st1.scoresByTerm.hk2.daoDuc).toEqual([8.5])

    // Student 2: only HK1, no HK2 — all columns get empty arrays
    const st2 = cls.students[1]
    expect(st2.tenThanh).toBe('Phêrô')
    expect(st2.scoresByTerm.hk2.dauGio).toEqual([])
    expect(st2.scoresByTerm.hk2.khaoKinh).toEqual([])
  })

  it('should migrate old state formats and ensure necessary fields exist', async () => {
    const oldRawState = {
      version: 2,
      classes: [
        {
          name: 'Lớp 1A',
          year: '2025-2026',
          students: [
            {
              hoDem: 'Nguyễn Văn',
              ten: 'A'
            }
          ]
        }
      ]
    }

    localStorage.setItem('so-diem-gl-state', JSON.stringify(oldRawState))

    const migratedState = await storage.getState()
    expect(migratedState.version).toBe(6)
    expect(migratedState.classes.length).toBe(1)
    
    const cls = migratedState.classes[0]
    expect(cls.id).toBeDefined()
    expect(cls.name).toBe('Lớp 1A')
    expect(cls.weights).toBeDefined() // default weights filled
    expect(cls.weights.khaoKinh).toBe(1)

    const student = cls.students[0]
    expect(student.id).toBeDefined()
    expect(student.name).toBeDefined()
    expect(student.scoresByTerm).toBeDefined()
    expect(student.scoresByTerm.hk1).toBeDefined()
    expect(student.scoresByTerm.hk2).toBeDefined()
  })

  it('should split and migrate state from version 4 to 5', async () => {
    storage = new StorageAdapter()
    const mockDb = {
      get: vi.fn().mockResolvedValue({
        activeClassId: 'cls1',
        yearFilter: '2024-2025',
        archivedYears: ['2023-2024'],
        viewMode: 'table',
        activeTerm: 'hk2',
        theme: 'dark',
        parentTokens: [],
        lastModified: 1000,
        classes: [{
          id: 'cls1',
          name: 'Lớp 1A',
          year: '2024-2025',
          columns: [],
          weights: {},
          createdAt: 200,
          updatedAt: 300,
          students: [{
            id: 'st1',
            tenThanh: 'Giuse',
            hoDem: 'Nguyễn',
            ten: 'An',
            createdAt: 210,
            updatedAt: 310
          }]
        }]
      }),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined)
    } as any

    await (storage as any).migrateToSplitSchema(mockDb)

    expect(mockDb.put).toHaveBeenCalledWith('appMeta', 'cls1', 'activeClassId')
    expect(mockDb.put).toHaveBeenCalledWith('appMeta', '2024-2025', 'yearFilter')
    expect(mockDb.put).toHaveBeenCalledWith('appMeta', 'dark', 'theme')

    expect(mockDb.put).toHaveBeenCalledWith('classes', {
      id: 'cls1',
      name: 'Lớp 1A',
      year: '2024-2025',
      columns: [],
      weights: {},
      createdAt: 200,
      updatedAt: 300
    })
    expect(mockDb.put).toHaveBeenCalledWith('students', {
      id: 'st1',
      tenThanh: 'Giuse',
      hoDem: 'Nguyễn',
      ten: 'An',
      createdAt: 210,
      updatedAt: 310,
      classId: 'cls1'
    })

    expect(mockDb.delete).toHaveBeenCalledWith('appState', 'main')
  })
})
