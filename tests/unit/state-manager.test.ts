import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StateManager } from '../../src/ui/StateManager'
import { StorageAdapter } from '../../src/services/storage/StorageAdapter'
import { AppState, ClassData, StudentData } from '../../src/services/storage/StorageAdapter.types'
import { cloneDefaultCols, weightsFromColumns, DEFAULT_WEIGHTS } from '../../src/config/constants.ts'

function makeDefaultState(overrides: Partial<AppState> = {}): AppState {
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
    lastModified: 0,
    ...overrides
  }
}

function makeClass(overrides: Partial<ClassData> = {}): ClassData {
  const cols = cloneDefaultCols()
  return {
    id: 'cls-1',
    name: 'Lớp 1A',
    year: '2025-2026',
    columns: cols,
    weights: weightsFromColumns(cols, { ...DEFAULT_WEIGHTS }),
    students: [],
    createdAt: 100,
    updatedAt: 100,
    rev: 1,
    ...overrides
  }
}

function makeStudent(overrides: Partial<StudentData> = {}): StudentData {
  const cols = cloneDefaultCols()
  return {
    id: 'st-1',
    tenThanh: 'Anna',
    hoDem: 'Nguyễn Văn',
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
    scoresByTerm: { hk1: {}, hk2: {} } as any,
    learningLog: [],
    createdAt: 200,
    updatedAt: 200,
    ...overrides
  }
}

describe('StateManager', () => {
  let sm: StateManager
  let mockStorage: any
  let currentState: AppState

  beforeEach(async () => {
    currentState = makeDefaultState()

    mockStorage = {
      getState: vi.fn().mockImplementation(() => Promise.resolve(currentState)),
      setState: vi.fn().mockImplementation((s: AppState) => {
        currentState = s
        return Promise.resolve()
      })
    }

    sm = new StateManager(mockStorage as any)
    // Set initial state directly (bypass init to avoid storage side effects)
    ;(sm as any).state = currentState
    ;(sm as any).initialized = true
  })

  // ================================================================
  // init & ready
  // ================================================================
  describe('init', () => {
    it('should load state from storage and set initialized', async () => {
      const sm2 = new StateManager(mockStorage as any)
      expect(sm2.isReady()).toBe(false)
      await sm2.init()
      expect(sm2.isReady()).toBe(true)
      expect(mockStorage.getState).toHaveBeenCalledOnce()
    })
  })

  // ================================================================
  // Class CRUD
  // ================================================================
  describe('createClass', () => {
    it('should create a class and set it as active if none active', () => {
      const id = sm.createClass('Lớp 1A', '2025-2026')
      expect(id).toMatch(/^cls_/)
      const state = sm.getState()
      expect(state.classes.length).toBe(1)
      expect(state.classes[0].name).toBe('Lớp 1A')
      expect(state.classes[0].year).toBe('2025-2026')
      expect(state.activeClassId).toBe(id)
      expect(state.classes[0].rev).toBe(1)
    })

    it('should create a class without changing activeClassId if already set', () => {
      sm.createClass('Lớp 1A', '2025-2026')
      const id = sm.createClass('Lớp 1B', '2025-2026')
      const state = sm.getState()
      expect(state.classes.length).toBe(2)
      expect(state.activeClassId).not.toBe(id)
    })

    it('should trim class name and year', () => {
      const id = sm.createClass('  Lớp 1A  ', '  2025  ')
      const cls = sm.getClass(id)!
      expect(cls.name).toBe('Lớp 1A')
      expect(cls.year).toBe('2025')
    })

    it('should support custom columns and weights', () => {
      const cols = [{ key: 'a', short: 'A', label: 'Col A', defaultWeight: 2 }]
      const id = sm.createClass('Lớp C', '2025', { a: 3 }, cols)
      const cls = sm.getClass(id)!
      expect(cls.columns.length).toBe(1)
      expect(cls.columns[0].key).toBe('a')
      expect(cls.weights.a).toBe(3)
    })
  })

  describe('createClassesWithStudents', () => {
    it('should create multiple classes with students in one mutation', () => {
      sm.createClassesWithStudents([
        {
          name: 'Lớp 1A',
          year: '2025',
          students: [
            { tenThanh: 'Anna', hoDem: 'Nguyễn', ten: 'An' },
            { tenThanh: 'Phêrô', hoDem: 'Trần', ten: 'Bình' }
          ]
        },
        {
          name: 'Lớp 1B',
          year: '2025',
          students: [
            { tenThanh: 'Maria', hoDem: 'Lê', ten: 'Hoa' }
          ]
        }
      ])

      const state = sm.getState()
      expect(state.classes.length).toBe(2)
      expect(state.classes[0].students.length).toBe(2)
      expect(state.classes[1].students.length).toBe(1)
      expect(state.classes[0].students[0].scoresByTerm).toBeDefined()
    })
  })

  describe('setClassStudents', () => {
    it('should replace students array', () => {
      sm.createClass('Lớp 1', '2025')
      const cls = sm.getState().classes[0]

      const newStudents = [makeStudent({ id: 'st-new', ten: 'Mới' })]
      const ok = sm.setClassStudents(cls.id, newStudents)
      expect(ok).toBe(true)
      expect(sm.getClass(cls.id)!.students.length).toBe(1)
      expect(sm.getClass(cls.id)!.students[0].ten).toBe('Mới')
    })

    it('should return false for non-existent class', () => {
      expect(sm.setClassStudents('nonexistent', [])).toBe(false)
    })
  })

  describe('updateClass', () => {
    it('should update class name, year, weights', () => {
      const id = sm.createClass('Lớp 1', '2025')
      sm.updateClass(id, { name: 'Lớp 1C' })
      expect(sm.getClass(id)!.name).toBe('Lớp 1C')
    })

    it('should return false for missing class', () => {
      expect(sm.updateClass('bad', { name: 'x' })).toBe(false)
    })
  })

  describe('deleteClass', () => {
    it('should delete class and clear activeClassId if it was active', () => {
      const id = sm.createClass('Lớp 1', '2025')
      expect(sm.deleteClass(id)).toBe(true)
      expect(sm.getState().classes.length).toBe(0)
      expect(sm.getState().activeClassId).toBeNull()
    })

    it('should fallback to another class if deleted class was active', () => {
      sm.createClass('Lớp 1', '2025')
      const id2 = sm.createClass('Lớp 2', '2025')
      expect(sm.deleteClass(id2)).toBe(true)
      expect(sm.getState().activeClassId).toBe(sm.getState().classes[0].id)
    })

    it('should return false for missing class', () => {
      expect(sm.deleteClass('bad')).toBe(false)
    })
  })

  describe('setActiveClass', () => {
    it('should set active class id', () => {
      sm.createClass('Lớp 1', '2025')
      const cls = sm.getState().classes[0]
      sm.setActiveClass(cls.id)
      expect(sm.getState().activeClassId).toBe(cls.id)
    })

    it('should set to null', () => {
      sm.setActiveClass(null)
      expect(sm.getState().activeClassId).toBeNull()
    })
  })

  // ================================================================
  // Getters
  // ================================================================
  describe('getActiveClass / getClass / getAllClasses / getYears', () => {
    beforeEach(() => {
      sm.createClass('Lớp A', '2025')
      sm.createClass('Lớp B', '2025')
      sm.createClass('Lớp C', '2024')
    })

    it('getActiveClass returns the active class or null', () => {
      expect(sm.getActiveClass()).toBeTruthy()
      sm.setActiveClass(null)
      expect(sm.getActiveClass()).toBeNull()
    })

    it('getClass returns class by id', () => {
      const cls = sm.getState().classes[0]
      expect(sm.getClass(cls.id)?.name).toBe('Lớp A')
    })

    it('getAllClasses returns all classes', () => {
      expect(sm.getAllClasses().length).toBe(3)
    })

    it('getClassesByYear filters by year', () => {
      expect(sm.getClassesByYear('2025').length).toBe(2)
      expect(sm.getClassesByYear('2024').length).toBe(1)
    })

    it('getYears returns unique years sorted desc', () => {
      expect(sm.getYears()).toEqual(['2025', '2024'])
    })

    it('getVisibleClasses respects yearFilter', () => {
      expect(sm.getVisibleClasses().length).toBe(3)
      sm.setYearFilter('2025')
      expect(sm.getVisibleClasses().length).toBe(2)
    })
  })

  // ================================================================
  // Archive
  // ================================================================
  describe('archive / unarchive', () => {
    it('archiveYear adds year to archived list', () => {
      sm.createClass('Lớp A', '2025')
      expect(sm.archiveYear('2025')).toBe(true)
      expect(sm.isYearArchived('2025')).toBe(true)
      expect(sm.isClassArchived(sm.getState().classes[0].id)).toBe(true)
    })

    it('archiveYear handles empty/whitespace', () => {
      expect(sm.archiveYear('')).toBe(false)
      expect(sm.archiveYear('   ')).toBe(false)
    })

    it('archiveYear is idempotent', () => {
      sm.archiveYear('2025')
      expect(sm.archiveYear('2025')).toBe(true)
      expect(sm.getState().archivedYears.length).toBe(1)
    })

    it('unarchiveYear removes year from list', () => {
      sm.archiveYear('2025')
      expect(sm.unarchiveYear('2025')).toBe(true)
      expect(sm.isYearArchived('2025')).toBe(false)
    })

    it('unarchiveYear returns false if not archived', () => {
      expect(sm.unarchiveYear('2025')).toBe(false)
    })
  })

  // ================================================================
  // Student CRUD
  // ================================================================
  describe('student operations', () => {
    let classId: string

    beforeEach(() => {
      classId = sm.createClass('Lớp 1', '2025')
    })

    it('addStudent adds a student with empty scores', () => {
      const stId = sm.addStudent(classId, makeStudent())
      const cls = sm.getClass(classId)!
      expect(cls.students.length).toBe(1)
      expect(cls.students[0].id).toBe(stId)
      expect(cls.students[0].scoresByTerm.hk1).toBeDefined()
    })

    it('addStudent throws for missing class', () => {
      expect(() => sm.addStudent('bad', makeStudent())).toThrow('Class not found')
    })

    it('updateStudent updates fields', () => {
      const stId = sm.addStudent(classId, makeStudent())
      expect(sm.updateStudent(classId, stId, { ten: 'Bình' })).toBe(true)
      expect(sm.getClass(classId)!.students[0].ten).toBe('Bình')
    })

    it('updateStudent returns false for bad class/student', () => {
      expect(sm.updateStudent('bad', 'x', { ten: 'x' })).toBe(false)
      const stId = sm.addStudent(classId, makeStudent())
      expect(sm.updateStudent(classId, 'bad-st', { ten: 'x' })).toBe(false)
    })

    it('deleteStudent removes student', () => {
      const stId = sm.addStudent(classId, makeStudent())
      expect(sm.deleteStudent(classId, stId)).toBe(true)
      expect(sm.getClass(classId)!.students.length).toBe(0)
    })

    it('deleteStudent returns false for missing', () => {
      expect(sm.deleteStudent(classId, 'bad')).toBe(false)
      expect(sm.deleteStudent('bad', 'x')).toBe(false)
    })

    it('transferStudent moves student with new scores', () => {
      const cls2Id = sm.createClass('Lớp 2', '2025')
      const stId = sm.addStudent(classId, makeStudent({ tenThanh: 'Maria' }))
      expect(sm.transferStudent(stId, classId, cls2Id)).toBe(true)
      const cls1 = sm.getClass(classId)!
      const cls2 = sm.getClass(cls2Id)!
      expect(cls1.students.length).toBe(0)
      expect(cls2.students.length).toBe(1)
      expect(cls2.students[0].id).not.toBe(stId)
    })

    it('transferStudent returns false for same class / missing', () => {
      expect(sm.transferStudent('x', classId, classId)).toBe(false)
      expect(sm.transferStudent('x', 'bad', classId)).toBe(false)
      expect(sm.transferStudent('x', classId, 'bad')).toBe(false)
    })
  })

  // ================================================================
  // Scores
  // ================================================================
  describe('score operations', () => {
    let classId: string, studentId: string

    beforeEach(() => {
      classId = sm.createClass('Lớp 1', '2025')
      studentId = sm.addStudent(classId, makeStudent())
    })

    it('addScore adds a score to the array', () => {
      expect(sm.addScore(classId, studentId, 'thuocBai', 8)).toBe(true)
      const st = sm.getClass(classId)!.students[0]
      expect(st.scoresByTerm.hk1.thuocBai).toEqual([8])
    })

    it('addScore returns false for archived class', () => {
      sm.archiveYear('2025')
      expect(sm.addScore(classId, studentId, 'thuocBai', 8)).toBe(false)
    })

    it('addScore returns false for bad inputs', () => {
      expect(sm.addScore('bad', studentId, 'thuocBai', 8)).toBe(false)
      expect(sm.addScore(classId, 'bad', 'thuocBai', 8)).toBe(false)
    })

    it('removeScore removes at index', () => {
      sm.addScore(classId, studentId, 'thuocBai', 8)
      sm.addScore(classId, studentId, 'thuocBai', 9)
      expect(sm.removeScore(classId, studentId, 'thuocBai', 0)).toBe(true)
      const st = sm.getClass(classId)!.students[0]
      expect(st.scoresByTerm.hk1.thuocBai).toEqual([9])
    })

    it('removeScore returns false for bad index', () => {
      expect(sm.removeScore(classId, studentId, 'thuocBai', 0)).toBe(false)
      expect(sm.removeScore('bad', studentId, 'thuocBai', 0)).toBe(false)
      expect(sm.removeScore(classId, 'bad', 'thuocBai', 0)).toBe(false)
    })

    it('setScore replaces values', () => {
      sm.addScore(classId, studentId, 'thuocBai', 8)
      expect(sm.setScore(classId, studentId, 'thuocBai', [10, 9])).toBe(true)
      const st = sm.getClass(classId)!.students[0]
      expect(st.scoresByTerm.hk1.thuocBai).toEqual([10, 9])
    })

    it('setScore returns false for archived class', () => {
      sm.archiveYear('2025')
      expect(sm.setScore(classId, studentId, 'thuocBai', [10])).toBe(false)
    })
  })

  // ================================================================
  // Weights & Columns
  // ================================================================
  describe('column / weight operations', () => {
    let classId: string

    beforeEach(() => {
      classId = sm.createClass('Lớp 1', '2025')
    })

    it('updateWeights updates weights', () => {
      expect(sm.updateWeights(classId, { thuocBai: 3 })).toBe(true)
      expect(sm.getClass(classId)!.weights.thuocBai).toBe(3)
    })

    it('updateWeights returns false for archived class', () => {
      sm.archiveYear('2025')
      expect(sm.updateWeights(classId, { thuocBai: 3 })).toBe(false)
    })

    it('setClassColumns replaces columns and migrates scores', () => {
      const newCols = [
        { key: 'a', short: 'A', label: 'Col A', defaultWeight: 1 },
        { key: 'b', short: 'B', label: 'Col B', defaultWeight: 2 }
      ]
      expect(sm.setClassColumns(classId, newCols)).toBe(true)
      const cls = sm.getClass(classId)!
      expect(cls.columns.length).toBe(2)
      expect(cls.weights.a).toBe(1)
      expect(cls.weights.b).toBe(2)
    })

    it('setClassColumns returns false for empty columns', () => {
      expect(sm.setClassColumns(classId, [])).toBe(false)
    })

    it('addClassColumn adds a column', () => {
      const def = sm.addClassColumn(classId, { label: 'New Col', defaultWeight: 2 })
      expect(def).not.toBeNull()
      expect(sm.getClass(classId)!.columns.length).toBe(7)
    })

    it('addClassColumn returns null for missing class / archived', () => {
      expect(sm.addClassColumn('bad', { label: 'X' })).toBeNull()
      sm.archiveYear('2025')
      expect(sm.addClassColumn(classId, { label: 'X' })).toBeNull()
    })

    it('removeClassColumn removes a column (minimum 1)', () => {
      expect(sm.removeClassColumn(classId, 'khaoKinh')).toBe(true)
      expect(sm.getClass(classId)!.columns.length).toBe(5)
    })

    it('removeClassColumn cannot remove last column', () => {
      const cols = sm.getClassColumns(classId)
      for (const c of cols.slice(0, -1)) {
        sm.removeClassColumn(classId, c.key as any)
      }
      expect(sm.removeClassColumn(classId, sm.getClassColumns(classId)[0].key as any)).toBe(false)
    })
  })

  // ================================================================
  // Theme
  // ================================================================
  describe('theme', () => {
    it('default theme is system', () => {
      expect(sm.getTheme()).toBe('system')
    })

    it('setTheme updates theme and toggles class on html', () => {
      sm.setTheme('dark')
      expect(sm.getTheme()).toBe('dark')
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    it('setTheme light removes dark class', () => {
      sm.setTheme('dark')
      sm.setTheme('light')
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })
  })

  // ================================================================
  // Parent Tokens
  // ================================================================
  describe('parent tokens', () => {
    let classId: string, studentId: string

    beforeEach(() => {
      classId = sm.createClass('Lớp 1', '2025')
      studentId = sm.addStudent(classId, makeStudent())
    })

    it('createParentToken creates a token', () => {
      const token = sm.createParentToken(classId, studentId, { createdBy: 'admin' })
      expect(token).not.toBeNull()
      expect(token!.studentId).toBe(studentId)
      expect(token!.classId).toBe(classId)
      expect(token!.revoked).toBe(false)
      expect(token!.expiresAt).toBeGreaterThan(Date.now())
    })

    it('createParentToken returns null for bad inputs', () => {
      expect(sm.createParentToken('bad', studentId, { createdBy: 'a' })).toBeNull()
      expect(sm.createParentToken(classId, 'bad', { createdBy: 'a' })).toBeNull()
    })

    it('revokeParentToken revokes a token', () => {
      const token = sm.createParentToken(classId, studentId, { createdBy: 'a' })!
      expect(sm.revokeParentToken(token.id)).toBe(true)
      expect(sm.getParentToken(token.token)!.revoked).toBe(true)
    })

    it('resolveParentTokenView validates token lifecycle', () => {
      const token = sm.createParentToken(classId, studentId, { createdBy: 'a' })!
      const valid = sm.resolveParentTokenView(token.token)
      expect(valid.ok).toBe(true)
      expect(valid.student?.id).toBe(studentId)

      // Revoked
      sm.revokeParentToken(token.id)
      const revoked = sm.resolveParentTokenView(token.token)
      expect(revoked.ok).toBe(false)
      expect(revoked.error).toContain('thu hồi')
    })

    it('resolveParentTokenView handles invalid token', () => {
      const r = sm.resolveParentTokenView('badtoken')
      expect(r.ok).toBe(false)
      expect(r.error).toContain('không hợp lệ')
    })
  })

  // ================================================================
  // Learning Log
  // ================================================================
  describe('learning log', () => {
    let classId: string, studentId: string

    beforeEach(() => {
      classId = sm.createClass('Lớp 1', '2025')
      studentId = sm.addStudent(classId, makeStudent())
    })

    it('addLogEntry adds an entry', () => {
      const ok = sm.addLogEntry(classId, studentId, {
        type: 'point', level: 'good', text: 'Chăm chỉ', byUserId: 'u1', byName: 'Admin'
      })
      expect(ok).toBe(true)
      const st = sm.getClass(classId)!.students[0]
      expect(st.learningLog.length).toBe(1)
      expect(st.learningLog[0].text).toBe('Chăm chỉ')
      expect(st.learningLog[0].id).toBeDefined()
    })

    it('addLogEntry returns false for bad inputs', () => {
      expect(sm.addLogEntry('bad', 'x', {} as any)).toBe(false)
      expect(sm.addLogEntry(classId, 'bad', {} as any)).toBe(false)
    })

    it('deleteLogEntry removes entry', () => {
      sm.addLogEntry(classId, studentId, { type: 'a', level: 'b', text: 'c', byUserId: 'u1', byName: 'Admin' })
      const entryId = sm.getClass(classId)!.students[0].learningLog[0].id
      expect(sm.deleteLogEntry(classId, studentId, entryId)).toBe(true)
      expect(sm.getClass(classId)!.students[0].learningLog.length).toBe(0)
    })

    it('deleteLogEntry returns false for bad inputs', () => {
      expect(sm.deleteLogEntry('bad', 'x', 'e1')).toBe(false)
      expect(sm.deleteLogEntry(classId, 'bad', 'e1')).toBe(false)
    })
  })

  // ================================================================
  // View Settings
  // ================================================================
  describe('view settings', () => {
    it('setViewMode updates viewMode', () => {
      sm.setViewMode('table')
      expect(sm.getState().viewMode).toBe('table')
    })

    it('setActiveTerm updates term', () => {
      sm.setActiveTerm('hk2')
      expect(sm.getState().activeTerm).toBe('hk2')
    })

    it('setYearFilter updates filter', () => {
      sm.setYearFilter('2025')
      expect(sm.getState().yearFilter).toBe('2025')
      sm.setYearFilter(null)
      expect(sm.getState().yearFilter).toBeNull()
    })
  })

  // ================================================================
  // Undo / Redo
  // ================================================================
  describe('undo / redo', () => {
    it('starts with no undo/redo', () => {
      expect(sm.canUndo()).toBe(false)
      expect(sm.canRedo()).toBe(false)
    })

    it('undo reverses createClass', () => {
      sm.createClass('Lớp 1', '2025')
      expect(sm.getState().classes.length).toBe(1)
      expect(sm.canUndo()).toBe(true)
      expect(sm.undo()).toBe(true)
      expect(sm.getState().classes.length).toBe(0)
      expect(sm.canRedo()).toBe(true)
    })

    it('redo reapplies undone action', () => {
      sm.createClass('Lớp 1', '2025')
      sm.undo()
      expect(sm.redo()).toBe(true)
      expect(sm.getState().classes.length).toBe(1)
    })

    it('undo returns false when nothing to undo', () => {
      expect(sm.undo()).toBe(false)
    })

    it('redo returns false when nothing to redo', () => {
      expect(sm.redo()).toBe(false)
    })

    it('new mutation clears redo stack', () => {
      sm.createClass('Lớp 1', '2025')
      sm.undo()
      expect(sm.canRedo()).toBe(true)
      sm.createClass('Lớp 2', '2025')
      expect(sm.canRedo()).toBe(false)
    })

    it('clearUndoRedo resets stacks', () => {
      sm.createClass('Lớp 1', '2025')
      expect(sm.canUndo()).toBe(true)
      sm.clearUndoRedo()
      expect(sm.canUndo()).toBe(false)
    })

    it('getUndoLabel / getRedoLabel returns labels', () => {
      expect(sm.getUndoLabel()).toBeNull()
      expect(sm.getRedoLabel()).toBeNull()
      sm.createClass('Lớp 1', '2025')
      expect(sm.getUndoLabel()).toContain('Tạo lớp')
      sm.undo()
      expect(sm.getRedoLabel()).toContain('Tạo lớp')
    })

    it('undo/redo are blocked during undo/redo (no re-entrancy)', () => {
      sm.createClass('Lớp 1', '2025')
      ;(sm as any).isApplyingUndoRedo = true
      expect(sm.canUndo()).toBe(true)
      // mutate() should be no-op during undo/redo
      sm.createClass('Lớp 2', '2025')
      expect(sm.getState().classes.length).toBe(1)
    })
  })

  // ================================================================
  // Subscribe / Mutation listeners
  // ================================================================
  describe('listeners', () => {
    it('subscribe notifies on state changes', () => {
      const cb = vi.fn()
      sm.subscribe(cb)
      sm.createClass('Lớp 1', '2025')
      expect(cb).toHaveBeenCalledOnce()
    })

    it('subscribe returns unsub function', () => {
      const cb = vi.fn()
      const unsub = sm.subscribe(cb)
      unsub()
      sm.createClass('Lớp 1', '2025')
      expect(cb).not.toHaveBeenCalled()
    })

    it('onMutation notifies on mutations with label and fromNetwork flag', () => {
      const cb = vi.fn()
      sm.onMutation(cb)
      sm.createClass('Lớp 1', '2025')
      expect(cb).toHaveBeenCalledWith(expect.stringContaining('Tạo lớp'), false)
    })

    it('applyFromNetwork triggers mutation listener with fromNetwork=true', () => {
      const cb = vi.fn()
      sm.onMutation(cb)
      sm.applyFromNetwork('test', (draft) => { draft.version = 99 })
      expect(cb).toHaveBeenCalledWith('test', true)
    })
  })

  // ================================================================
  // Persistence
  // ================================================================
  describe('persistence', () => {
    it('forcePersist calls storage.setState', async () => {
      sm.createClass('Lớp 1', '2025')
      await sm.forcePersist()
      expect(mockStorage.setState).toHaveBeenCalled()
      const saved = mockStorage.setState.mock.calls[0][0] as AppState
      expect(saved.classes.length).toBe(1)
    })

    it('persist is called after debounce', async () => {
      vi.useFakeTimers()
      sm.createClass('Lớp 1', '2025')
      vi.advanceTimersByTime(350)
      expect(mockStorage.setState).toHaveBeenCalled()
      vi.useRealTimers()
    })
  })
})
