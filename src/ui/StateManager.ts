// ============================================================
// Sổ Điểm GL — State Manager
// Immutable state management with Immer + patch-based undo/redo
// ============================================================

import { produce, produceWithPatches, enablePatches, Patch } from 'immer'
import { StorageAdapter } from '../services/storage/StorageAdapter'
import {
  AppState,
  ClassData,
  StudentData,
  ColumnWeights,
  ScoreColumnDef,
  ParentToken
} from '../services/storage/StorageAdapter.types'
import {
  DEFAULT_WEIGHTS,
  ColumnKey,
  generateId,
  createEmptyScoresByTerm,
  cloneDefaultCols,
  weightsFromColumns,
  ensureScoresMatchColumns,
  makeColumnDef,
  resolveClassColumns,
  colLabel
} from '../config/constants.ts'
import { logger } from '../services/Logger'

// Enable Immer patches for undo/redo
enablePatches()

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

/** Callback invoked after each mutation, with the mutation label and whether it's from network sync. */
type MutationListener = (label: string, fromNetwork: boolean) => void

// ============================================================
// State Manager
// ============================================================

export class StateManager {
  private state!: AppState
  private storage: StorageAdapter
  private listeners: Set<StateListener> = new Set()
  private mutationListeners: Set<MutationListener> = new Set()
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
    this.applyTheme()

    // Listen for system color scheme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.getTheme() === 'system') {
        this.applyTheme()
      }
    })
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

  /**
   * @deprecated Returns raw state, bypassing Immer immutability.
   * Do NOT mutate the returned object directly — use getState() for read-only access.
   * This method exists only for legacy compatibility and should not be used in new code.
   */
  getMutableState(): AppState {
    console.warn('[StateManager] getMutableState() bypasses Immer — use getState() for read-only access.')
    return this.state
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Subscribe to mutation events (label + fromNetwork flag).
   * Useful for sync engine to track changes without intercepting private methods.
   */
  onMutation(listener: MutationListener): () => void {
    this.mutationListeners.add(listener)
    return () => this.mutationListeners.delete(listener)
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.state)
      } catch (e) {
        logger.error('State listener error:', e)
      }
    }
  }

  private notifyMutation(label: string, fromNetwork: boolean): void {
    for (const listener of this.mutationListeners) {
      try {
        listener(label, fromNetwork)
      } catch (e) {
        logger.error('Mutation listener error:', e)
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
    options: { skipUndo?: boolean; skipPersist?: boolean; fromNetwork?: boolean } = {}
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
    this.notifyMutation(label, !!options.fromNetwork)
  }

  /**
   * PUBLIC API: Apply a mutation that originated from network/cloud sync.
   * This sets `fromNetwork = true` to prevent sync loop-back.
   * Sync engine should use this instead of intercepting private `mutate()`.
   */
  applyFromNetwork(label: string, mutator: (draft: AppState) => void): void {
    this.mutate(label, mutator, { fromNetwork: true, skipUndo: true })
  }

  /**
   * Get the current undo stack (read-only, for sync engine patch parsing).
   */
  getUndoStack(): ReadonlyArray<UndoEntry> {
    return this.undoStack
  }

  // ============================================================
  // Class Operations
  // ============================================================

  createClass(name: string, year: string, weights?: Partial<ColumnWeights>, columns?: ScoreColumnDef[]): string {
    const id = generateId('cls')
    const cols = columns?.length ? columns.map(c => ({ ...c })) : cloneDefaultCols()
    const newClass: ClassData = {
      id,
      name: name.trim(),
      year: year.trim(),
      columns: cols,
      weights: weightsFromColumns(cols, { ...DEFAULT_WEIGHTS, ...weights }),
      students: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      rev: 1
    }

    this.mutate(`Tạo lớp "${name}"`, (draft) => {
      draft.classes.push(newClass)
      if (!draft.activeClassId) draft.activeClassId = newClass.id
    })

    return id
  }

  createClassesWithStudents(classesToCreate: Array<{
    name: string;
    year: string;
    students: Array<Omit<StudentData, 'id' | 'createdAt' | 'updatedAt' | 'scoresByTerm' | 'learningLog'>>;
  }>): void {
    this.mutate('Tạo lớp và nhập học viên hàng loạt', (draft) => {
      for (const item of classesToCreate) {
        const classId = generateId('cls')
        const cols = cloneDefaultCols()
        const newClass: ClassData = {
          id: classId,
          name: item.name.trim(),
          year: item.year.trim(),
          columns: cols,
          weights: weightsFromColumns(cols, { ...DEFAULT_WEIGHTS }),
          students: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          rev: 1
        }

        for (const st of item.students) {
          const studentId = generateId('st')
          newClass.students.push({
            ...st,
            id: studentId,
            scoresByTerm: createEmptyScoresByTerm(cols),
            learningLog: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            rev: 1
          })
        }

        draft.classes.push(newClass)
        if (!draft.activeClassId) draft.activeClassId = newClass.id
      }
    })
  }

  setClassStudents(classId: string, students: StudentData[]): boolean {
    const classIdx = this.state.classes.findIndex(c => c.id === classId)
    if (classIdx === -1) return false
    this.mutate('Import điểm từ Excel', (draft) => {
      draft.classes[classIdx].students = students
      draft.classes[classIdx].updatedAt = Date.now()
    })
    return true
  }

  updateClass(id: string, updates: Partial<Pick<ClassData, 'name' | 'year' | 'weights' | 'columns'>>): boolean {
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
      .sort((a, b) => b.localeCompare(a)) as string[]
  }

  getVisibleClasses(): ClassData[] {
    const year = this.state.yearFilter
    if (!year) return this.getAllClasses()
    return this.getClassesByYear(year)
  }

  isYearArchived(year: string): boolean {
    return (this.state.archivedYears || []).includes(year)
  }

  isClassArchived(classId: string): boolean {
    const cls = this.getClass(classId)
    if (!cls?.year) return false
    return this.isYearArchived(cls.year)
  }

  archiveYear(year: string): boolean {
    const y = year.trim()
    if (!y) return false
    if (this.isYearArchived(y)) return true
    this.mutate(`Lưu trữ năm học ${y}`, (draft) => {
      if (!draft.archivedYears) draft.archivedYears = []
      draft.archivedYears.push(y)
    })
    return true
  }

  unarchiveYear(year: string): boolean {
    const y = year.trim()
    if (!y || !this.isYearArchived(y)) return false
    this.mutate(`Mở lại năm học ${y}`, (draft) => {
      draft.archivedYears = (draft.archivedYears || []).filter(x => x !== y)
    })
    return true
  }

  getClassColumns(classId: string): ScoreColumnDef[] {
    return resolveClassColumns(this.getClass(classId))
  }

  // ============================================================
  // Student Operations
  // ============================================================

  addStudent(classId: string, student: Omit<StudentData, 'id' | 'createdAt' | 'updatedAt' | 'scoresByTerm' | 'learningLog'>): string {
    const classIdx = this.state.classes.findIndex(c => c.id === classId)
    if (classIdx === -1) throw new Error('Class not found')

    const cols = resolveClassColumns(this.state.classes[classIdx])
    const id = generateId('st')
    const newStudent: StudentData = {
      ...student,
      id,
      scoresByTerm: createEmptyScoresByTerm(cols),
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

  reorderStudent(classId: string, studentId: string, targetStudentId: string): void {
    const cls = this.getClass(classId)
    if (!cls) return
    const students = cls.students
    const fromIdx = students.findIndex(s => s.id === studentId)
    const toIdx = students.findIndex(s => s.id === targetStudentId)
    if (fromIdx === -1 || toIdx === -1) return

    this.mutate('Sắp xếp lại học viên', (draft) => {
      const clsIdx = draft.classes.findIndex((c: any) => c.id === classId)
      if (clsIdx === -1) return
      const sts = draft.classes[clsIdx].students
      const [moved] = sts.splice(fromIdx, 1)
      sts.splice(toIdx, 0, moved)
      draft.classes[clsIdx].updatedAt = Date.now()
    })
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
      const destCols = resolveClassColumns(draft.classes[toIdx])
      const transferredStudent = {
        ...student,
        id: generateId('st'),
        scoresByTerm: createEmptyScoresByTerm(destCols),
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
  // Theme Operations
  // ============================================================

  setTheme(theme: 'light' | 'dark' | 'system'): void {
    this.mutate('Thay đổi giao diện', (draft) => {
      draft.theme = theme
    }, { skipUndo: true })
    this.applyTheme()
  }

  getTheme(): 'light' | 'dark' | 'system' {
    return this.state.theme || 'system'
  }

  applyTheme(): void {
    const theme = this.getTheme()
    let isDark = false
    if (theme === 'dark') {
      isDark = true
    } else if (theme === 'system') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    document.documentElement.classList.toggle('dark', isDark)
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
    if (this.isClassArchived(classId)) return false
    const classIdx = this.state.classes.findIndex(c => c.id === classId)
    if (classIdx === -1) return false

    const studentIdx = this.state.classes[classIdx].students.findIndex(s => s.id === studentId)
    if (studentIdx === -1) return false

    const cols = resolveClassColumns(this.state.classes[classIdx])
    this.mutate(`Thêm điểm ${colLabel(cols, column)}`, (draft) => {
      const termScores = draft.classes[classIdx].students[studentIdx].scoresByTerm[term]
      if (!Array.isArray(termScores[column])) termScores[column] = []
      termScores[column].push(value)
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
    if (this.isClassArchived(classId)) return false
    const classIdx = this.state.classes.findIndex(c => c.id === classId)
    if (classIdx === -1) return false

    const studentIdx = this.state.classes[classIdx].students.findIndex(s => s.id === studentId)
    if (studentIdx === -1) return false

    const scores = this.state.classes[classIdx].students[studentIdx].scoresByTerm[term][column]
    if (!scores || index < 0 || index >= scores.length) return false

    const cols = resolveClassColumns(this.state.classes[classIdx])
    this.mutate(`Xóa điểm ${colLabel(cols, column)}`, (draft) => {
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
    if (this.isClassArchived(classId)) return false
    const classIdx = this.state.classes.findIndex(c => c.id === classId)
    if (classIdx === -1) return false

    const studentIdx = this.state.classes[classIdx].students.findIndex(s => s.id === studentId)
    if (studentIdx === -1) return false

    const cols = resolveClassColumns(this.state.classes[classIdx])
    this.mutate(`Cập nhật điểm ${colLabel(cols, column)}`, (draft) => {
      draft.classes[classIdx].students[studentIdx].scoresByTerm[term][column] = values
      draft.classes[classIdx].students[studentIdx].updatedAt = Date.now()
    })
    return true
  }

  // ============================================================
  // Weight & Column Operations
  // ============================================================

  updateWeights(classId: string, weights: Partial<ColumnWeights>): boolean {
    if (this.isClassArchived(classId)) return false
    const classIdx = this.state.classes.findIndex(c => c.id === classId)
    if (classIdx === -1) return false

    this.mutate('Cập nhật trọng số', (draft) => {
      const cols = resolveClassColumns(draft.classes[classIdx])
      draft.classes[classIdx].weights = weightsFromColumns(cols, {
        ...draft.classes[classIdx].weights,
        ...weights
      })
      draft.classes[classIdx].updatedAt = Date.now()
    })
    return true
  }

  /**
   * Replace the full column set for a class. Migrates student scores and weights.
   */
  setClassColumns(classId: string, columns: ScoreColumnDef[]): boolean {
    if (this.isClassArchived(classId)) return false
    const classIdx = this.state.classes.findIndex(c => c.id === classId)
    if (classIdx === -1) return false
    if (!columns.length) return false

    const cleaned = columns
      .map(c => ({
        key: String(c.key).trim(),
        short: String(c.short || c.key).trim().slice(0, 4),
        label: String(c.label || c.key).trim(),
        defaultWeight: typeof c.defaultWeight === 'number' && c.defaultWeight > 0 ? c.defaultWeight : 1
      }))
      .filter(c => c.key && c.label)

    if (!cleaned.length) return false

    this.mutate('Cấu hình cột điểm', (draft) => {
      const cls = draft.classes[classIdx]
      cls.columns = cleaned
      cls.weights = weightsFromColumns(cleaned, cls.weights)
      for (const st of cls.students) {
        st.scoresByTerm = {
          hk1: ensureScoresMatchColumns(st.scoresByTerm?.hk1, cleaned),
          hk2: ensureScoresMatchColumns(st.scoresByTerm?.hk2, cleaned)
        }
        st.updatedAt = Date.now()
      }
      cls.updatedAt = Date.now()
    })
    return true
  }

  addClassColumn(
    classId: string,
    input: { label: string; short?: string; defaultWeight?: number }
  ): ScoreColumnDef | null {
    if (this.isClassArchived(classId)) return null
    const cls = this.getClass(classId)
    if (!cls) return null
    const cols = resolveClassColumns(cls)
    const def = makeColumnDef(
      input.label,
      input.short || '',
      cols.map(c => c.key),
      input.defaultWeight ?? 1
    )
    const ok = this.setClassColumns(classId, [...cols, def])
    return ok ? def : null
  }

  removeClassColumn(classId: string, key: ColumnKey): boolean {
    const cols = this.getClassColumns(classId)
    if (cols.length <= 1) return false
    return this.setClassColumns(classId, cols.filter(c => c.key !== key))
  }

  renameClassColumn(
    classId: string,
    key: ColumnKey,
    updates: Partial<Pick<ScoreColumnDef, 'label' | 'short' | 'defaultWeight'>>
  ): boolean {
    const cols = this.getClassColumns(classId)
    const next = cols.map(c => (c.key === key ? { ...c, ...updates } : c))
    return this.setClassColumns(classId, next)
  }

  // ============================================================
  // Parent tokens (PH read-only)
  // ============================================================

  createParentToken(
    classId: string,
    studentId: string,
    options: { expiresInDays?: number; label?: string; createdBy: string }
  ): ParentToken | null {
    const cls = this.getClass(classId)
    if (!cls) return null
    if (!cls.students.some(s => s.id === studentId)) return null

    const days = options.expiresInDays ?? 30
    const token: ParentToken = {
      id: generateId('ptk'),
      token: generateId('ph').replace(/[^a-z0-9]/gi, '').slice(0, 24) + Date.now().toString(36),
      studentId,
      classId,
      expiresAt: Date.now() + days * 24 * 60 * 60 * 1000,
      createdAt: Date.now(),
      createdBy: options.createdBy,
      label: options.label,
      revoked: false
    }

    this.mutate('Tạo phiếu phụ huynh', (draft) => {
      if (!draft.parentTokens) draft.parentTokens = []
      draft.parentTokens.push(token)
    })
    return token
  }

  revokeParentToken(tokenId: string): boolean {
    const idx = (this.state.parentTokens || []).findIndex(t => t.id === tokenId)
    if (idx === -1) return false
    this.mutate('Thu hồi phiếu phụ huynh', (draft) => {
      draft.parentTokens[idx].revoked = true
    })
    return true
  }

  getParentToken(token: string): ParentToken | null {
    return (this.state.parentTokens || []).find(t => t.token === token) || null
  }

  resolveParentTokenView(token: string): {
    ok: boolean
    error?: string
    token?: ParentToken
    classData?: ClassData
    student?: StudentData
  } {
    const pt = this.getParentToken(token)
    if (!pt) return { ok: false, error: 'Link không hợp lệ' }
    if (pt.revoked) return { ok: false, error: 'Link đã bị thu hồi' }
    if (pt.expiresAt < Date.now()) return { ok: false, error: 'Link đã hết hạn' }

    const cls = this.getClass(pt.classId)
    if (!cls) return { ok: false, error: 'Không tìm thấy lớp' }
    const student = cls.students.find(s => s.id === pt.studentId)
    if (!student) return { ok: false, error: 'Không tìm thấy học viên' }

    return { ok: true, token: pt, classData: cls, student }
  }

  getParentTokensForStudent(classId: string, studentId: string): ParentToken[] {
    return (this.state.parentTokens || []).filter(
      t => t.classId === classId && t.studentId === studentId && !t.revoked
    )
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

  setActiveTerm(term: 'hk1' | 'hk2' | 'year'): void {
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
    try {
      const entry = this.undoStack.pop()!

      // Apply inverse patches
      this.state = produce(this.state, (draft) => {
        for (const patch of entry.inversePatches) {
          applyPatch(draft, patch)
        }
      })

      this.redoStack.push(entry)
      this.notify()
      return true
    } finally {
      this.isApplyingUndoRedo = false
    }
  }

  redo(): boolean {
    if (!this.canRedo()) return false

    this.isApplyingUndoRedo = true
    try {
      const entry = this.redoStack.pop()!

      // Apply original patches
      this.state = produce(this.state, (draft) => {
        for (const patch of entry.patches) {
          applyPatch(draft, patch)
        }
      })

      this.undoStack.push(entry)
      this.notify()
      return true
    } finally {
      this.isApplyingUndoRedo = false
    }
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
    await this.storage.setState({ ...this.state, lastModified: Date.now() })
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
    let changed = false

    if (!Array.isArray(this.state.archivedYears)) {
      this.state.archivedYears = []
      changed = true
    }
    if (!Array.isArray(this.state.parentTokens)) {
      this.state.parentTokens = []
      changed = true
    }

    // v4 → v5: seed columns on each class + align scores/weights
    if (this.state.version < 5) {
      for (const cls of this.state.classes) {
        if (!cls.columns?.length) {
          cls.columns = cloneDefaultCols()
        }
        cls.weights = weightsFromColumns(cls.columns, cls.weights)
        for (const student of cls.students) {
          if (!student.learningLog) student.learningLog = []
          student.scoresByTerm = {
            hk1: ensureScoresMatchColumns(student.scoresByTerm?.hk1, cls.columns),
            hk2: ensureScoresMatchColumns(student.scoresByTerm?.hk2, cls.columns)
          }
        }
      }
      this.state.version = 5
      changed = true
    }

    // v5 → v6: ensure theme is set
    if (this.state.version < 6) {
      if (!this.state.theme) {
        this.state.theme = 'system'
      }
      this.state.version = 6
      changed = true
    }

    if (changed) await this.forcePersist()
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
  const keys = path

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
        const idx = parseInt(String(lastKey), 10)
        if (idx >= 0 && idx <= target.length) {
          target.splice(idx, 0, value)
        }
      } else {
        target[lastKey] = value
      }
      break

    case 'remove':
      if (Array.isArray(target)) {
        const idx = parseInt(String(lastKey), 10)
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