import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StateManager } from '../../src/ui/StateManager'
import { StorageAdapter } from '../../src/services/storage/StorageAdapter'
import {
  columnKeyFromLabel,
  makeColumnDef,
  resolveClassColumns,
  weightsFromColumns,
  ensureScoresMatchColumns
} from '../../src/config/columns.ts'
import { studentTB, studentYearTB } from '../../src/core/calc.ts'

function addTestStudent(sm: StateManager, classId: string, ho: string, t: string): string {
  return sm.addStudent(classId, {
    tenThanh: '',
    hoDem: ho,
    ten: t,
    name: `${ho} ${t}`.trim(),
    maHV: '',
    ngaySinh: '',
    gioiTinh: '',
    tenPhuHuynh: '',
    sdPhuHuynh: '',
    diaChi: '',
    email: '',
    ghiChu: ''
  })
}


describe('Phase 3.1: Dynamic Columns & Calculation Configuration', () => {
  describe('columnKeyFromLabel', () => {
    it('should convert accents and remove special characters', () => {
      expect(columnKeyFromLabel('Khảo Kinh')).toBe('khao_kinh')
      expect(columnKeyFromLabel('Bài Tập #1')).toBe('bai_tap_1')
      expect(columnKeyFromLabel('Thiết kế đồ họa')).toBe('thiet_ke_do_hoa')
    })

    it('should generate uniquely by appending a suffix if already taken', () => {
      const existing = ['khao_kinh', 'bai_tap']
      expect(columnKeyFromLabel('Khảo Kinh', existing)).toBe('khao_kinh_2')
      expect(columnKeyFromLabel('Khảo Kinh', ['khao_kinh', 'khao_kinh_2'])).toBe('khao_kinh_3')
    })
  })

  describe('makeColumnDef', () => {
    it('should construct a ScoreColumnDef', () => {
      const col = makeColumnDef('Khảo kinh', 'KK', [], 2)
      expect(col).toEqual({
        key: 'khao_kinh',
        short: 'KK',
        label: 'Khảo kinh',
        defaultWeight: 2
      })
    })

    it('should fallback to first letters if short code is empty', () => {
      const col = makeColumnDef('Chuyên cần', '')
      expect(col.short).toBe('CH')
    })
  })

  describe('resolveClassColumns', () => {
    it('should return custom columns if present', () => {
      const customCols = [{ key: 'col1', short: 'C1', label: 'Cột 1', defaultWeight: 1.5 }]
      const cls = { columns: customCols } as any
      expect(resolveClassColumns(cls)).toEqual(customCols)
    })

    it('should return default columns if none are configured on class', () => {
      const cls = {} as any
      const cols = resolveClassColumns(cls)
      expect(cols.length).toBe(6)
      expect(cols[0].key).toBe('khaoKinh')
    })
  })

  describe('weightsFromColumns', () => {
    it('should merge existing weights with new columns', () => {
      const cols = [
        { key: 'col1', short: 'C1', label: 'Cột 1', defaultWeight: 1 },
        { key: 'col2', short: 'C2', label: 'Cột 2', defaultWeight: 2 }
      ]
      const existing = { col1: 1.5, col3: 4 }
      const weights = weightsFromColumns(cols, existing)
      expect(weights.col1).toBe(1.5) // preserved
      expect(weights.col2).toBe(2)   // defaulted
      expect(weights.col3).toBeUndefined() // dropped because it is not in the column set
    })
  })

  describe('ensureScoresMatchColumns', () => {
    it('should match and pad terms scores according to the columns list', () => {
      const cols = [
        { key: 'col1', short: 'C1', label: 'Cột 1', defaultWeight: 1 },
        { key: 'col2', short: 'C2', label: 'Cột 2', defaultWeight: 2 }
      ]
      const scores = { col1: [8, 9], oldCol: [7] } as any
      const aligned = ensureScoresMatchColumns(scores, cols)
      expect(aligned.col1).toEqual([8, 9])
      expect(aligned.col2).toEqual([])
      expect((aligned as any).oldCol).toBeUndefined()
    })
  })

  describe('Calculation engine with dynamic columns', () => {
    it('should compute weighted averages using custom column definitions', () => {
      const cols = [
        { key: 'khao_kinh', short: 'KK', label: 'Khảo kinh', defaultWeight: 1 },
        { key: 'kiem_tra', short: 'KT', label: 'Kiểm tra', defaultWeight: 3 }
      ]
      const student = {
        id: 'st-1',
        scoresByTerm: {
          hk1: { khao_kinh: [10], kiem_tra: [6] },
          hk2: { khao_kinh: [8], kiem_tra: [8] }
        }
      } as any

      const weights = { khao_kinh: 1, kiem_tra: 3 }
      // HK1: (10*1 + 6*3)/4 = 28/4 = 7
      expect(studentTB(student, weights, 'hk1', cols)).toBe(7)

      // HK2: (8*1 + 8*3)/4 = 32/4 = 8
      expect(studentTB(student, weights, 'hk2', cols)).toBe(8)

      // Year: (7*1 + 8*2)/3 = 23/3 = 7.6666...
      const year = studentYearTB(student, weights, cols)
      expect(year).toBeCloseTo(7.67, 2)
    })
  })
})

describe('Phase 3.2 & 3.4: StateManager, Year Archiving, and Parent Tokens', () => {
  let stateManager: StateManager
  let mockStore: Record<string, string>

  beforeEach(async () => {
    mockStore = {}
    global.localStorage = {
      getItem: vi.fn((key) => mockStore[key] || null),
      setItem: vi.fn((key, value) => { mockStore[key] = String(value) }),
      removeItem: vi.fn((key) => { delete mockStore[key] }),
      clear: vi.fn(() => { mockStore = {} }),
      length: 0,
      key: vi.fn()
    } as any

    const storage = new StorageAdapter()
    ;(storage as any).useIndexedDB = false
    ;(storage as any).initialized = true

    stateManager = new StateManager(storage)
    await stateManager.init()
    stateManager.createClass('Năm học 2025', '2025-2026')
  })

  describe('Year Archiving', () => {
    it('should allow archiving and unarchiving years', () => {
      expect(stateManager.isYearArchived('2025-2026')).toBe(false)

      stateManager.archiveYear('2025-2026')
      expect(stateManager.isYearArchived('2025-2026')).toBe(true)

      const activeClass = stateManager.getState().classes[0]
      expect(stateManager.isClassArchived(activeClass.id)).toBe(true)

      stateManager.unarchiveYear('2025-2026')
      expect(stateManager.isYearArchived('2025-2026')).toBe(false)
      expect(stateManager.isClassArchived(activeClass.id)).toBe(false)
    })

    it('should prevent writing score updates to archived classes', () => {
      const activeClass = stateManager.getState().classes[0]
      addTestStudent(stateManager, activeClass.id, 'Nguyễn', 'An')
      const student = stateManager.getState().classes[0].students[0]

      // Archive it
      stateManager.archiveYear('2025-2026')

      // Try editing student score, it should be rejected or not mutate
      const cols = resolveClassColumns(activeClass)
      const colKey = cols[0].key
      const ok = stateManager.setScore(activeClass.id, student.id, colKey, [9], 'hk1')
      expect(ok).toBe(false)

      // Unarchive and check it passes
      stateManager.unarchiveYear('2025-2026')
      const ok2 = stateManager.setScore(activeClass.id, student.id, colKey, [9], 'hk1')
      expect(ok2).toBe(true)
    })
  })

  describe('Parent Tokens (PH read-only)', () => {
    it('should generate a parent token for a student and validate it', () => {
      const activeClass = stateManager.getState().classes[0]
      addTestStudent(stateManager, activeClass.id, 'Nguyễn', 'An')
      const student = stateManager.getState().classes[0].students[0]

      const token = stateManager.createParentToken(activeClass.id, student.id, {
        expiresInDays: 7,
        createdBy: 'user-admin',
        label: 'PH An'
      })

      expect(token).toBeDefined()
      expect(token!.token.length).toBeGreaterThan(10)
      expect(token!.studentId).toBe(student.id)

      // Resolve token view
      const view = stateManager.resolveParentTokenView(token!.token)
      expect(view.ok).toBe(true)
      expect(view.student!.id).toBe(student.id)
      expect(view.classData!.id).toBe(activeClass.id)

      // Test active token lists
      const activeTokens = stateManager.getParentTokensForStudent(activeClass.id, student.id)
      expect(activeTokens.length).toBe(1)
      expect(activeTokens[0].id).toBe(token!.id)
    })

    it('should block resolution of revoked tokens', () => {
      const activeClass = stateManager.getState().classes[0]
      addTestStudent(stateManager, activeClass.id, 'Nguyễn', 'An')
      const student = stateManager.getState().classes[0].students[0]

      const token = stateManager.createParentToken(activeClass.id, student.id, {
        expiresInDays: 7,
        createdBy: 'user-admin'
      })

      stateManager.revokeParentToken(token!.id)

      const view = stateManager.resolveParentTokenView(token!.token)
      expect(view.ok).toBe(false)
      expect(view.error).toBe('Link đã bị thu hồi')
    })

    it('should block resolution of expired tokens', () => {
      const activeClass = stateManager.getState().classes[0]
      addTestStudent(stateManager, activeClass.id, 'Nguyễn', 'An')
      const student = stateManager.getState().classes[0].students[0]

      const token = stateManager.createParentToken(activeClass.id, student.id, {
        expiresInDays: -1, // Expired in the past
        createdBy: 'user-admin'
      })

      const view = stateManager.resolveParentTokenView(token!.token)
      expect(view.ok).toBe(false)
      expect(view.error).toBe('Link đã hết hạn')
    })
  })
})
