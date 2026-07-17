// ============================================================
// Sổ Điểm GL — State Manager
// Immutable state management with Immer + patch-based undo/redo
// ============================================================

import { produce, produceWithPatches, enablePatches, enableES5, Patch } from 'immer'
import { StorageAdapter } from '../services/storage/StorageAdapter'
import { AppState, ClassData, StudentData, ColumnWeights } from '../services/storage/StorageAdapter'
import { COLS, DEFAULT_WEIGHTS, ColumnKey, generateId, createEmptyTermScores, createEmptyScoresByTerm, migrateStudent, migrateClass } from '../config/constants'

// Enable Immer patches for undo/redo
enablePatches()
enableES5()

// ============================================================
// Types
// ============================================================

export interface UndoEntry {
  id: string
  label: string
  timestamp: number
  patches: Patch[]
  inversePatches: Patch[]
}

type StateListener = (state: Readonly<AppState>) => void

// ============================================================
// State Manager
// ============================================================

export class StateManager {
  private state: AppState
  private storage: StorageAdapter
  private listeners: Set<(state: Readonly<AppState>) => void> = new Set()
  private undoStack: UndoEntry[] = []
  private redoStack: UndoEntry[] = []
  private maxUndoSize = 50
  private pendingSave = false
  private saveDebounceMs = 300
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private isApplyingUndoRedo = false
  private initialized = false

  constructor(storage: StorageAdapter) {
    this.storage = storage
  }

  async init(): Promise<void> {
    this.state = await this.storage.getState()
    await this.migrateIfNeeded()
    this.initialized = true
  }

  isReady(): boolean {
    return this.initialized
  }

  // ============================================================
  // Public API - Read
  // ============================================================

  getState(): Readonly<AppState> {
    return this.state
  }

  getMutableState(): AppState {
    return this.state
  }

  subscribe(listener: (state: Readonly<AppState>) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.state)
      } catch (e) {
        console.error('State listener error:', e)
      }
    }
  }

  // ============================================================
  // Core Mutation (Immer-based)
  // ============================================================

  /**
   * Apply a mutation with Immer, generating patches for undo/redo
   */
  private mutate(
    label: string,
    mutator: (draft: AppState) => void,
    options: { skipUndo?: boolean; skipPersist?: boolean } = {}
  ): void {
    if (this.isApplyingUndoRedo) return

    const [newState, patches, inversePatches] = produceWithPatches(
      this.state,
      mutator
    )

    this.state = newState

    if (!options.skipUndo) {
      this.undoStack.push({
        id: crypto.randomUUID(),
        label,
        timestamp: Date.now(),
        patches,
        inversePatches
      })

      // Trim undo stack
      if (this.undoStack.length > this.maxUndoSize) {
        this.undoStack.shift()
      }

      // Clear redo stack on new mutation
      this.redoStack = []
    }

    if (!options.skipPersist) {
      this.schedulePersist()
    }

    this.notify()
  }

  // ============================================================
  // Class Operations
  // ============================================================

  createClass(name: string, year: string, weights?: Partial<ColumnWeights>): string {
    const id = generateId('cls')
    const newClass: ClassData = {
      id,
      name: name.trim(),
      year: year.trim(),
      weights: { ...DEFAULT_WEIGHTS, ...weights },
      students: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    this.mutate(`Tạo lớp "${name}"`, (draft) => {
      draft.classes.push(newClass)
      if (!draft.activeClassId) draft.activeClassId = newClass.id
    })

    return id
  }

  updateClass(id: string, updates: Partial<Pick<ClassData, 'name' | 'year' | 'weights'>>): boolean {
    const idx = this.state.classes.findIndex(c => c.id === id)
    if (idx === -1) return false

    this.mutate(`Cập nhật lớp`, (draft) => {
      Object.assign(draft.classes[idx], updates, { updatedAt: Date.now() })
    })
    return true
  }

  deleteClass(id: string): boolean {
    const idx = this.state.classes.findIndex(c => c.id === id)
    if (idx === -1) return false

    const className = this.state.classes[idx].name

    this.mutate(`Xóa lớp "${className}"`, (draft) => {
      draft.classes.splice(idx, 1)
      if (draft.activeClassId === id) {
        draft.activeClassId = draft.classes[0]?.id || null
      }
    })
    return true
  }

  setActiveClass(id: string | null): void {
    this.mutate('Chuyển lớp', (draft) => {
      draft.activeClassId = id
    }, { skipUndo: true })
  }

  getActiveClass(): ClassData | null {
    if (!this.state.activeClassId) return null
    return this.state.classes.find(c => c.id === this.state.activeClassId) || null
  }

  getClass(id: string): ClassData | undefined {
    return this.state.classes.find(c => c.id === id)
  }

  getAllClasses(): ClassData[] {
    return [...this.state.classes]
  }

  getClassesByYear(year: string): ClassData[] {
    return this.state.classes.filter(c => c.year === year)
  }

  getYears(): string[] {
    return [...new Set(this.state.classes.map(c => c.year).filter(Boolean))]
      .sort((a, b) => b.localeCompare(a))
  }

  // ============================================================
  // Student Operations
  // ============================================================

  addStudent(classId: string, student: Omit<StudentData, 'id' | 'createdAt' | 'updatedAt' | 'scoresByTerm' | 'learningLog'>): string {
    const classIdx = this.state.classes.findIndex(c => c.id === classId)
    if (classIdx === -1) throw new Error('Class not found')

    const id = generateId('st')
    const newStudent: StudentData = {
      ...student,
      id,
      scoresByTerm: createEmptyScoresByTerm(),
      learningLog: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    this.mutate(`Thêm học viên "${student.tenThanh} ${student.hoDem} ${student.ten}"`, (draft) => {
      draft.classes[classIdx].students.push(newStudent)
      draft.classes[classIdx].updatedAt = Date.now()
    })

    return id
  }

  updateStudent(classId: string, studentId: string, updates: Partial<StudentData>): boolean {
    const classIdx = this.state.classes.findIndex(c => c.id === classId)
    if (classIdx === -1) return false

    const studentIdx = this.state.classes[classIdx].students.findIndex(s => s.id === studentId)
    if (studentIdx === -1) return false

    this.mutate('Cập nhật học viên', (draft) => {
      Object.assign(draft.classes[classIdx].students[studentIdx], updates, { updatedAt: Date.now() })
    })
    return true
  }

  deleteStudent(classId: string, studentId: string): boolean {
    const classIdx = this.state.classes.findIndex(c => c.id === classId)
    if (classIdx === -1) return false

    const studentIdx = this.state.classes[classIdx].students.findIndex(s => s.id === studentId)
    if (studentIdx === -1) return false

    const studentName = this.state.classes[classIdx].students[studentIdx].tenThanh

    this.mutate(`Xóa học viên "${studentName}"`, (draft) => {
      draft.classes[classIdx].students.splice(studentIdx, 1)
      draft.classes[classIdx].updatedAt = Date.now()
    })
    return true
  }

  transferStudent(studentId: string, fromClassId: string, toClassId: string): boolean {
    if (fromClassId === toClassId) return false

    const fromIdx = this.state.classes.findIndex(c => c.id === fromClassId)
    const toIdx = this.state.classes.findIndex(c => c.id === toClassId)
    if (fromIdx === -1 || toIdx === -1) return false

    const studentIdx = this.state.classes[fromIdx].students.findIndex(s => s.id === studentId)
    if (studentIdx === -1) return false

    const student = this.state.classes[fromIdx].students[studentIdx]

    this.mutate('Chuyển lớp học viên', (draft) => {
      // Remove from source
      draft.classes[fromIdx].students.splice(studentIdx, 1)
      draft.classes[fromIdx].updatedAt = Date.now()

      // Add to destination (reset scores)
      const transferredStudent = {
        ...student,
        id: generateId('st'),
        scoresByTerm: createEmptyScoresByTerm(),
        learningLog: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      draft.classes[toIdx].students.push(transferredStudent)
      draft.classes[toIdx].updatedAt = Date.now()
    })
    return true
  }

  // ============================================================
  // Score Operations
  // ============================================================

  addScore(
    classId: string,
    studentId: string,
    column: ColumnKey,
    value: number,
    term: 'hk1' | 'hk2' = 'hk1'
  ): boolean {
    const classIdx = this.state.classes.findIndex(c => c.id === classId)
    if (classIdx === -1) return false

    const studentIdx = this.state.classes[classIdx].students.findIndex(s => s.id === studentId)
    if (studentIdx === -1) return false

    this.mutate(`Thêm điểm ${COLS.find(c => c.key === column)?.label || column}`, (draft) => {
      const scores = draft.classes[classIdx].students[studentIdx].scoresByTerm[term][column]
      scores.push(value)
      draft.classes[classIdx].students[studentIdx].updatedAt = Date.now()
    })
    return true
  }

  removeScore(
    classId: string,
    studentId: string,
    column: ColumnKey,
    index: number,
    term: 'hk1' | 'hk2' = 'hk1'
  ): boolean {
    const classIdx = this.state.classes.findIndex(c => c.id === classId)
    if (classIdx === -1) return false

    const studentIdx = this.state.classes[classIdx].students.findIndex(s => s.id === studentId)
    if (studentIdx === -1) return false

    const scores = this.state.classes[classIdx].students[studentIdx].scoresByTerm[term][column]
    if (index < 0 || index >= scores.length) return false

    this.mutate(`Xóa điểm ${COLS.find(c => c.key === column)?.label || column}`, (draft) => {
      draft.classes[classIdx].students[studentIdx].scoresByTerm[term][column].splice(index, 1)
      draft.classes[classIdx].students[studentIdx].updatedAt = Date.now()
    })
    return true
  }

  setScore(
    classId: string,
    studentId: string,
    column: ColumnKey,
    values: number[],
    term: 'hk1' | 'hk2' = 'hk1'
  ): boolean {
    const classIdx = this.state.classes.findIndex(c => c.id === classId)
    if (classIdx === -1) return false

    const studentIdx = this.state.classes[classIdx].students.findIndex(s => s.id === studentId)
    if (studentIdx === -1) return false

    this.mutate(`Cập nhật điểm ${COLS.find(c => c.key === column)?.label || column}`, (draft) => {
      draft.classes[classIdx].students[studentIdx].scoresByTerm[term][column] = values
      draft.classes[classIdx].students[studentIdx].updatedAt = Date.now()
    })
    return true
  }

  // ============================================================
  // Weight Operations
  // ============================================================

  updateWeights(classId: string, weights: Partial<ColumnWeights>): boolean {
    const classIdx = this.state.classes.findIndex(c => c.id === classId)
    if (classIdx === -1) return false

    this.mutate('Cập nhật trọng số', (draft) => {
      draft.classes[classIdx].weights = { ...draft.classes[classIdx].weights, ...weights }
      draft.classes[classIdx].updatedAt = Date.now()
    })
    return true
  }

  // ============================================================
  // Learning Log
  // ============================================================

  addLogEntry(
    classId: string,
    studentId: string,
    entry: {
      type: string
      level: string
      text: string
      byUserId: string
      byName: string
    }
  ): boolean {
    const classIdx = this.state.classes.findIndex(c => c.id === classId)
    if (classIdx === -1) return false

    const studentIdx = this.state.classes[classIdx].students.findIndex(s => s.id === studentId)
    if (studentIdx === -1) return false

    const logEntry = {
      id: generateId('log'),
      date: new Date().toISOString().split('T')[0],
      ...entry,
      at: Date.now()
    }

    this.mutate('Thêm nhật ký học tập', (draft) => {
      draft.classes[classIdx].students[studentIdx].learningLog.unshift(logEntry)
      // Limit to 200 entries per student
      if (draft.classes[classIdx].students[studentIdx].learningLog.length > 200) {
        draft.classes[classIdx].students[studentIdx].learningLog =
          draft.classes[classIdx].students[studentIdx].learningLog.slice(0, 200)
      }
      draft.classes[classIdx].students[studentIdx].updatedAt = Date.now()
    })
    return true
  }

  deleteLogEntry(classId: string, studentId: string, entryId: string): boolean {
    const classIdx = this.state.classes.findIndex(c => c.id === classId)
    if (classIdx === -1) return false

    const studentIdx = this.state.classes[classIdx].students.findIndex(s => s.id === studentId)
    if (studentIdx === -1) return false

    const entryIdx = this.state.classes[classIdx].students[studentIdx].learningLog.findIndex(e => e.id === entryId)
    if (entryIdx === -1) return false

    this.mutate('Xóa nhật ký', (draft) => {
      draft.classes[classIdx].students[studentIdx].learningLog.splice(entryIdx, 1)
      draft.classes[classIdx].students[studentIdx].updatedAt = Date.now()
    })
    return true
  }

  // ============================================================
  // View Settings
  // ============================================================

  setViewMode(mode: 'cards' | 'table' | 'rank' | 'stats' | 'missing' | 'year' | 'print'): void {
    this.mutate('Thay đổi chế độ xem', (draft) => {
      draft.viewMode = mode
    }, { skipUndo: true })
  }

  setActiveTerm(term: 'hk1' | 'hk2'): void {
    this.mutate('Chuyển học kỳ', (draft) => {
      draft.activeTerm = term
    }, { skipUndo: true })
  }

  setYearFilter(year: string | null): void {
    this.mutate('Lọc năm học', (draft) => {
      draft.yearFilter = year
    }, { skipUndo: true })
  }

  // ============================================================
  // Undo / Redo
  // ============================================================

  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  undo(): boolean {
    if (!this.canUndo()) return false

    this.isApplyingUndoRedo = true
    const entry = this.undoStack.pop()!

    // Apply inverse patches
    this.state = produce(this.state, (draft) => {
      for (const patch of entry.inversePatches) {
        applyPatch(draft, patch)
      }
    })

    this.redoStack.push(entry)
    this.notify()
    this.isApplyingUndoRedo = false
    return true
  }

  redo(): boolean {
    if (!this.canRedo()) return false

    this.isApplyingUndoRedo = true
    const entry = this.redoStack.pop()!

    // Apply original patches
    this.state = produce(this.state, (draft) => {
      for (const patch of entry.patches) {
        applyPatch(draft, patch)
      }
    })

    this.undoStack.push(entry)
    this.notify()
    this.isApplyingUndoRedo = false
    return true
  }

  clearUndoRedo(): void {
    this.undoStack = []
    this.redoStack = []
  }

  // ============================================================
  // Persistence
  // ============================================================

  private schedulePersist(): void {
    if (this.pendingSave) return
    this.pendingSave = true

    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => this.persist(), this.saveDebounceMs)
  }

  async persist(): Promise<void> {
    this.pendingSave = false
    this.state.lastModified = Date.now()
    await this.storage.setState(this.state)
  }

  async forcePersist(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
    await this.persist()
  }

  // ============================================================
  // Migration
  // ============================================================

  private async migrateIfNeeded(): Promise<void> {
    // Migration from v1-3 to v4
    if (this.state.version < 4) {
      // Ensure all students have learningLog
      for (const cls of this.state.classes) {
        for (const student of cls.students) {
          if (!student.learningLog) student.learningLog = []
          if (!student.scoresByTerm) student.scoresByTerm = createEmptyScoresByTerm()
        }
      }
      this.state.version = 4
      await this.forcePersist()
    }
  }

  // ============================================================
  // Utilities
  // ============================================================

  getUndoLabel(): string | null {
    return this.undoStack[this.undoStack.length - 1]?.label || null
  }

  getRedoLabel(): string | null {
    return this.redoStack[this.redoStack.length - 1]?.label || null
  }
}

// ============================================================
// Helper: Apply JSON Patch to object
// ============================================================

function applyPatch(obj: any, patch: Patch): void {
  const { op, path, value } = patch
  const keys = path.split('/').filter(Boolean)

  if (keys.length === 0) return

  let target = obj
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    const nextKey = keys[i + 1]

    if (!(key in target)) {
      // Create missing path
      target[key] = isNaN(Number(nextKey)) ? {} : []
    }
    target = target[key]
  }

  const lastKey = keys[keys.length - 1]

  switch (op) {
    case 'add':
      if (Array.isArray(target)) {
        const idx = parseInt(lastKey, 10)
        if (idx >= 0 && idx <= target.length) {
          target.splice(idx, 0, value)
        }
      } else {
        target[lastKey] = value
      }
      break

    case 'remove':
      if (Array.isArray(target)) {
        const idx = parseInt(lastKey, 10)
        if (idx >= 0 && idx < target.length) {
          target.splice(idx, 1)
        }
      } else {
        delete target[lastKey]
      }
      break

    case 'replace':
      target[lastKey] = value
      break
  }
}