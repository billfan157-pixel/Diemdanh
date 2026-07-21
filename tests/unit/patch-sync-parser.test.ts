import { describe, it, expect } from 'vitest'
import { parsePatchesToOps, SyncOp } from '../../src/services/sync/PatchSyncParser'
import { Patch } from 'immer'
import { AppState, ClassData, StudentData } from '../../src/services/storage/StorageAdapter.types'
import { cloneDefaultCols, weightsFromColumns, DEFAULT_WEIGHTS } from '../../src/config/constants.ts'

function makeState(classes: ClassData[] = []): AppState {
  return {
    version: 6,
    activeClassId: null,
    classes,
    yearFilter: null,
    archivedYears: [],
    viewMode: 'cards',
    activeTerm: 'hk1',
    theme: 'system',
    parentTokens: [],
    lastModified: 0
  }
}

function makeCols() {
  return cloneDefaultCols()
}

function makeWeights() {
  return weightsFromColumns(makeCols(), { ...DEFAULT_WEIGHTS })
}

function makeClass(overrides: Partial<ClassData> = {}): ClassData {
  return {
    id: 'cls-1',
    name: 'Lớp 1',
    year: '2025',
    columns: makeCols(),
    weights: makeWeights(),
    students: [],
    createdAt: 100,
    updatedAt: 100,
    rev: 1,
    ...overrides
  }
}

function makeStudent(overrides: Partial<StudentData> = {}): StudentData {
  return {
    id: 'st-1',
    tenThanh: 'Anna',
    hoDem: 'Nguyễn',
    ten: 'An',
    name: '',
    maHV: '',
    ngaySinh: '',
    gioiTinh: '',
    tenPhuHuynh: '',
    sdPhuHuynh: '',
    diaChi: '',
    email: '',
    ghiChu: '',
    scoresByTerm: {
      hk1: { khaoKinh: [8], thuocBai: [7] } as any,
      hk2: {}
    },
    learningLog: [],
    createdAt: 200,
    updatedAt: 200,
    rev: 1,
    ...overrides
  }
}

describe('PatchSyncParser', () => {
  // ================================================================
  // Class ops
  // ================================================================
  describe('class operations', () => {
    it('should emit insert op when class is added', () => {
      const oldState = makeState()
      const cls = makeClass()
      const newState = makeState([cls])

      // Simulate the "add" patch Immer generates when pushing to classes[]
      const patches: Patch[] = [
        { op: 'add', path: ['classes', 0], value: cls }
      ]

      const ops = parsePatchesToOps(oldState, newState, patches)
      expect(ops.length).toBeGreaterThanOrEqual(1)
      const classOp = ops.find(o => o.table === 'classes' && o.action === 'insert')
      expect(classOp).toBeDefined()
      expect(classOp!.id).toBe('cls-1')
      expect(classOp!.data.name).toBe('Lớp 1')
    })

    it('should emit insert ops for students when class is added with students', () => {
      const oldState = makeState()
      const cls = makeClass({ students: [makeStudent()] })
      const newState = makeState([cls])

      const patches: Patch[] = [
        { op: 'add', path: ['classes', 0], value: cls }
      ]

      const ops = parsePatchesToOps(oldState, newState, patches)
      const studentOps = ops.filter(o => o.table === 'students' && o.action === 'insert')
      expect(studentOps.length).toBe(1)
      expect(studentOps[0].id).toBe('st-1')
    })

    it('should emit insert ops for scores when class is added with students having scores', () => {
      const oldState = makeState()
      const cls = makeClass({ students: [makeStudent()] })
      const newState = makeState([cls])

      const patches: Patch[] = [
        { op: 'add', path: ['classes', 0], value: cls }
      ]

      const ops = parsePatchesToOps(oldState, newState, patches)
      const scoreOps = ops.filter(o => o.table === 'scores')
      expect(scoreOps.length).toBeGreaterThanOrEqual(1)
      expect(scoreOps[0].data.student_id).toBe('st-1')
    })

    it('should emit delete op when class is removed', () => {
      const cls = makeClass()
      const oldState = makeState([cls])
      const newState = makeState()

      const patches: Patch[] = [
        { op: 'remove', path: ['classes', 0] }
      ]

      const ops = parsePatchesToOps(oldState, newState, patches)
      expect(ops).toContainEqual(
        expect.objectContaining({ table: 'classes', action: 'delete', id: 'cls-1' })
      )
    })

    it('should emit update op for class name/year/weights field changes', () => {
      const oldCls = makeClass()
      const newCls = makeClass({ name: 'Lớp 1 (Updated)' })
      const oldState = makeState([oldCls])
      const newState = makeState([newCls])

      const patches: Patch[] = [
        { op: 'replace', path: ['classes', 0, 'name'], value: 'Lớp 1 (Updated)' }
      ]

      const ops = parsePatchesToOps(oldState, newState, patches)
      expect(ops).toContainEqual(
        expect.objectContaining({
          table: 'classes',
          action: 'update',
          id: 'cls-1',
          data: expect.objectContaining({ name: 'Lớp 1 (Updated)' })
        })
      )
    })

    it('should skip patches for non-class paths', () => {
      const patches: Patch[] = [
        { op: 'replace', path: ['activeClassId'], value: 'x' }
      ]
      const ops = parsePatchesToOps(makeState(), makeState(), patches)
      expect(ops.length).toBe(0)
    })
  })

  // ================================================================
  // Student ops
  // ================================================================
  describe('student operations', () => {
    it('should emit insert op when student is added to existing class', () => {
      const cls = makeClass()
      const oldState = makeState([cls])
      const newStudent = makeStudent()
      const newState = makeState([makeClass({ students: [newStudent] })])

      const patches: Patch[] = [
        { op: 'add', path: ['classes', 0, 'students', 0], value: newStudent }
      ]

      const ops = parsePatchesToOps(oldState, newState, patches)
      expect(ops).toContainEqual(
        expect.objectContaining({ table: 'students', action: 'insert', id: 'st-1' })
      )
    })

    it('should emit delete op when student is removed', () => {
      const cls = makeClass({ students: [makeStudent()] })
      const oldState = makeState([cls])
      const newState = makeState([makeClass({ students: [] })])

      const patches: Patch[] = [
        { op: 'remove', path: ['classes', 0, 'students', 0] }
      ]

      const ops = parsePatchesToOps(oldState, newState, patches)
      expect(ops).toContainEqual(
        expect.objectContaining({ table: 'students', action: 'delete', id: 'st-1' })
      )
    })

    it('should emit update op for student field changes', () => {
      const oldStudent = makeStudent()
      const newStudent = makeStudent({ ten: 'Bình' })
      const oldState = makeState([makeClass({ students: [oldStudent] })])
      const newState = makeState([makeClass({ students: [newStudent] })])

      const patches: Patch[] = [
        { op: 'replace', path: ['classes', 0, 'students', 0, 'ten'], value: 'Bình' }
      ]

      const ops = parsePatchesToOps(oldState, newState, patches)
      expect(ops).toContainEqual(
        expect.objectContaining({
          table: 'students',
          action: 'update',
          data: expect.objectContaining({ ten: 'Bình' })
        })
      )
    })
  })

  // ================================================================
  // Score ops
  // ================================================================
  describe('score operations', () => {
    it('should emit update op when score array changes', () => {
      const oldStudent = makeStudent()
      const newStudent = makeStudent()
      newStudent.scoresByTerm = {
        hk1: { khaoKinh: [8, 9], thuocBai: [7] } as any,
        hk2: {}
      }
      const oldState = makeState([makeClass({ students: [oldStudent] })])
      const newState = makeState([makeClass({ students: [newStudent] })])

      const patches: Patch[] = [
        { op: 'add', path: ['classes', 0, 'students', 0, 'scoresByTerm', 'hk1', 'khaoKinh', 1], value: 9 }
      ]

      const ops = parsePatchesToOps(oldState, newState, patches)
      expect(ops).toContainEqual(
        expect.objectContaining({
          table: 'scores',
          action: 'update',
          id: `${oldStudent.id}_hk1_khaoKinh`,
          data: expect.objectContaining({
            student_id: oldStudent.id,
            term: 'hk1',
            col_key: 'khaoKinh'
          })
        })
      )
    })
  })

  // ================================================================
  // Learning log ops
  // ================================================================
  describe('learning log operations', () => {
    it('should emit insert op when log entry is added', () => {
      const entry = {
        id: 'log-1',
        date: '2025-01-01',
        type: 'point',
        level: 'good',
        text: 'Chăm chỉ',
        byUserId: 'u1',
        byName: 'Admin',
        at: Date.now()
      }
      const oldStudent = makeStudent()
      const newStudent = makeStudent({ learningLog: [entry] })
      const oldState = makeState([makeClass({ students: [oldStudent] })])
      const newState = makeState([makeClass({ students: [newStudent] })])

      const patches: Patch[] = [
        { op: 'add', path: ['classes', 0, 'students', 0, 'learningLog', 0], value: entry }
      ]

      const ops = parsePatchesToOps(oldState, newState, patches)
      expect(ops).toContainEqual(
        expect.objectContaining({
          table: 'learning_logs',
          action: 'insert',
          id: 'log-1',
          data: expect.objectContaining({
            student_id: oldStudent.id,
            type: 'point',
            text: 'Chăm chỉ'
          })
        })
      )
    })

    it('should emit delete op when log entry is removed', () => {
      const entry = { id: 'log-1', date: '2025-01-01', type: 'a', level: 'b', text: 'c', byUserId: 'u1', byName: 'Admin', at: 100 }
      const oldState = makeState([makeClass({ students: [makeStudent({ learningLog: [entry] })] })])
      const newState = makeState([makeClass({ students: [makeStudent({ learningLog: [] })] })])

      const patches: Patch[] = [
        { op: 'remove', path: ['classes', 0, 'students', 0, 'learningLog', 0] }
      ]

      const ops = parsePatchesToOps(oldState, newState, patches)
      expect(ops).toContainEqual(
        expect.objectContaining({ table: 'learning_logs', action: 'delete', id: 'log-1' })
      )
    })
  })

  // ================================================================
  // Edge cases
  // ================================================================
  describe('edge cases', () => {
    it('should handle empty patches array', () => {
      const ops = parsePatchesToOps(makeState(), makeState(), [])
      expect(ops.length).toBe(0)
    })

    it('should skip patches with non-numeric class indices', () => {
      const patches: Patch[] = [
        { op: 'add', path: ['classes', 'all'], value: {} }
      ]
      const ops = parsePatchesToOps(makeState(), makeState(), patches)
      expect(ops.length).toBe(0)
    })

    it('should emit score ops when entire students array is replaced (same IDs, different scores)', () => {
      const oldStudent = makeStudent()
      const newStudent = makeStudent({ // same ID, changed scores
        scoresByTerm: { hk1: { khaoKinh: [10] } as any, hk2: {} }
      })
      const oldState = makeState([makeClass({ students: [oldStudent] })])
      const newState = makeState([makeClass({ students: [newStudent] })])

      const patches: Patch[] = [
        { op: 'replace', path: ['classes', 0, 'students'], value: [newStudent] }
      ]

      const ops = parsePatchesToOps(oldState, newState, patches)
      expect(ops.length).toBeGreaterThanOrEqual(1)
      expect(ops.every(o => o.table === 'scores')).toBe(true)
    })

    it('should not emit ops for replace patch when students have different IDs', () => {
      const oldStudent = makeStudent()
      const newStudent = makeStudent({ id: 'st-2', ten: 'Bình', scoresByTerm: { hk1: { khaoKinh: [10] } as any, hk2: {} } })
      const oldState = makeState([makeClass({ students: [oldStudent] })])
      const newState = makeState([makeClass({ students: [newStudent] })])

      const patches: Patch[] = [
        { op: 'replace', path: ['classes', 0, 'students'], value: [newStudent] }
      ]

      // No old student with same ID found → no score sync ops
      const ops = parsePatchesToOps(oldState, newState, patches)
      expect(ops.length).toBe(0)
    })
  })
})
