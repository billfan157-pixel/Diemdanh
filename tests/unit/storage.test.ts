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
    expect(state.version).toBe(5)
    expect(state.classes).toEqual([])
    expect(state.activeClassId).toBeNull()
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
    expect(migratedState.version).toBe(5)
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
})
