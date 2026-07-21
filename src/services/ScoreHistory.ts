// ============================================================
// Sổ Điểm GL — Score Change History
// Ported from legacy/core/history.js
// ============================================================

// ============================================================
// Types
// ============================================================

export interface HistoryEntry {
  id: string
  at: string
  byUserId: string
  byName: string
  byUsername: string
  classId: string
  className: string
  studentId: string
  studentName: string
  term: string
  colKey: string
  colLabel: string
  action: 'add' | 'set' | 'delete' | 'import'
  before: string
  after: string
}

export interface HistoryFilter {
  classId?: string
  studentId?: string
  q?: string
}

// ============================================================
// Constants
// ============================================================

const MAX_LOG = 800
const HISTORY_KEY = 'giao-ly-score-history-v1'

// ============================================================
// Storage helpers
// ============================================================

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return arr
    }
  } catch { /* ignore */ }
  return []
}

function persistHistory(list: HistoryEntry[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list))
  } catch {
    try {
      list = list.slice(0, Math.floor(MAX_LOG / 2))
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list))
    } catch { /* ignore */ }
  }
}

// ============================================================
// Score History Class
// ============================================================

export class ScoreHistory {
  private _entries: HistoryEntry[] = []

  constructor() {
    this._entries = loadHistory()
  }

  get entries(): HistoryEntry[] {
    return this._entries
  }

  save(): void {
    persistHistory(this._entries)
  }

  clear(): void {
    this._entries = []
    this.save()
  }

  getFiltered(filter: HistoryFilter = {}): HistoryEntry[] {
    let list = this._entries.slice()
    if (filter.classId) {
      list = list.filter(e => e.classId === filter.classId)
    }
    if (filter.studentId) {
      list = list.filter(e => e.studentId === filter.studentId)
    }
    if (filter.q) {
      const q = String(filter.q).toLowerCase()
      list = list.filter(e => {
        const blob = [e.byName, e.byUsername, e.className, e.studentName, e.colLabel, e.before, e.after, e.action]
          .join(' ')
          .toLowerCase()
        return blob.indexOf(q) >= 0
      })
    }
    return list
  }

  logChange(opts: {
    classId: string
    className: string
    studentId: string
    studentName: string
    term: string
    colKey: string
    colLabel: string
    action: 'add' | 'set' | 'delete' | 'import'
    before: string
    after: string
    byUserId?: string
    byName?: string
    byUsername?: string
  }): HistoryEntry {
    const entry: HistoryEntry = {
      id: `h_${Math.random().toString(36).substr(2, 9)}-${Date.now().toString(36)}`,
      at: new Date().toISOString(),
      byUserId: opts.byUserId || '',
      byName: opts.byName || '',
      byUsername: opts.byUsername || '',
      classId: opts.classId,
      className: opts.className,
      studentId: opts.studentId,
      studentName: opts.studentName,
      term: opts.term,
      colKey: opts.colKey,
      colLabel: opts.colLabel || opts.colKey,
      action: opts.action,
      before: opts.before ?? '',
      after: opts.after ?? '',
    }

    this._entries.unshift(entry)
    if (this._entries.length > MAX_LOG) {
      this._entries = this._entries.slice(0, MAX_LOG)
    }
    this.save()
    return entry
  }

  logColumnChange(
    opts: {
      studentId: string
      studentName: string
      colKey: string
      colLabel: string
      beforeArr: number[]
      afterArr: number[]
      action?: 'add' | 'set' | 'delete'
      classId: string
      className: string
      term: string
      byUserId?: string
      byName?: string
      byUsername?: string
    }
  ): HistoryEntry | null {
    const before = formatScoresList(opts.beforeArr)
    const after = formatScoresList(opts.afterArr)
    if (before === after) return null
    return this.logChange({
      classId: opts.classId,
      className: opts.className,
      studentId: opts.studentId,
      studentName: opts.studentName,
      term: opts.term === 'year' ? 'hk1' : opts.term,
      colKey: opts.colKey,
      colLabel: opts.colLabel,
      action: opts.action || 'set',
      before,
      after,
      byUserId: opts.byUserId,
      byName: opts.byName,
      byUsername: opts.byUsername,
    })
  }

  /** Include history in backup data */
  toBackupPayload(): HistoryEntry[] {
    return this._entries.slice()
  }

  /** Restore history from backup */
  fromBackupPayload(data: HistoryEntry[], mode: 'replace' | 'merge' = 'replace'): void {
    if (!Array.isArray(data)) return
    if (mode === 'replace') {
      this._entries = data.slice(0, MAX_LOG)
    } else {
      this._entries = data.concat(this._entries).slice(0, MAX_LOG)
    }
    this.save()
  }

  get totalCount(): number {
    return this._entries.length
  }

  get maxSize(): number {
    return MAX_LOG
  }
}

// ============================================================
// Format helpers
// ============================================================

export function formatScoresList(arr: number[] | undefined | null): string {
  if (!arr || !arr.length) return '(trống)'
  return arr.map(n => {
    const f = Number(n.toFixed(1))
    return Number.isInteger(f) ? String(f) : f.toFixed(1)
  }).join('; ')
}

export function actionLabel(action: string): string {
  switch (action) {
    case 'add': return 'Thêm điểm'
    case 'delete': return 'Xóa điểm'
    case 'set': return 'Sửa / gán điểm'
    case 'import': return 'Nhập file'
    default: return action || 'Sửa'
  }
}

export function formatHistoryTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('vi-VN')
  } catch {
    return iso
  }
}

// Singleton
export const scoreHistory = new ScoreHistory()
