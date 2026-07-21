import { type ScoreColumnDef, type TermScores } from '../config/columns.ts'
import { type Term } from '../config/constants.ts'
import type { StudentData, ClassData, UserRecord } from '../services/storage/StorageAdapter.types'

import {
  colAvg,
  studentTB,
  studentYearTB,
  studentTBContext,
  hasMissingColumnScores,
  defaultWeights,
  emptyScores,
  cloneScores,
  ensureStudentTerms,
  getScores,
  classify,
  yearFormulaText,
} from './calc.ts'

export {
  colAvg,
  studentTB,
  studentYearTB,
  studentTBContext,
  hasMissingColumnScores,
  defaultWeights,
  emptyScores,
  cloneScores,
  ensureStudentTerms,
  getScores,
  classify,
  yearFormulaText,
}

export function normalizeYear(y: string): string {
  return String(y || '').trim().replace(/–/g, '-').replace(/\s+/g, ' ')
}

export function yearMatches(a: string, b: string): boolean {
  return normalizeYear(a) === normalizeYear(b)
}

export function classesInScope(
  classes: ClassData[],
  yearFilter: string | null,
  user: UserRecord | null
): ClassData[] {
  let list = classes
  if (yearFilter) {
    list = list.filter(c => yearMatches(c.year, yearFilter))
  }
  if (user && user.role !== 'ban_gl') {
    const ids = user.classIds || []
    list = list.filter(c => ids.indexOf(c.id) >= 0)
  }
  return list
}

export function collectSchoolYears(classes: ClassData[]): string[] {
  const set = new Set<string>()
  for (const c of classes) {
    if (c.year) set.add(c.year.trim())
  }
  return Array.from(set).sort()
}

export function suggestDefaultYear(classes: ClassData[]): string | null {
  const years = collectSchoolYears(classes)
  if (!years.length) return null
  const now = new Date()
  const currentYear = now.getFullYear()
  const nextYear = currentYear + 1
  const guess1 = `${currentYear}-${nextYear}`
  const guess2 = `${String(currentYear).slice(2)}-${String(nextYear).slice(2)}`
  for (const y of years) {
    if (yearMatches(y, guess1) || yearMatches(y, guess2)) return y
  }
  return years[years.length - 1]
}

export function termLabel(term: Term): string {
  switch (term) {
    case 'hk1': return 'Học kỳ 1'
    case 'hk2': return 'Học kỳ 2'
    case 'year': return 'Cả năm'
    default: return String(term)
  }
}

export function formatDateVN(date: Date | string | number): string {
  const d = typeof date === 'object' ? date : new Date(date)
  if (isNaN(d.getTime())) return String(date)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  const day = d.getDate()
  const month = d.getMonth() + 1
  const year = d.getFullYear()
  return `giờ ${h}:${m}, ngày ${day} tháng ${month} năm ${year}`
}

export function formatLogDate(iso: string): string {
  try {
    const d = new Date(iso)
    const dd = d.getDate().toString().padStart(2, '0')
    const mm = (d.getMonth() + 1).toString().padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}/${mm}/${yyyy}`
  } catch {
    return iso
  }
}

export function todayISODate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatHistoryTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('vi-VN')
  } catch {
    return iso
  }
}

export function normName(name: string): string {
  const s = String(name || '')
  const normalized = typeof s.normalize === 'function' ? s.normalize('NFC') : s
  return normalized.toLowerCase().replace(/\s+/g, ' ').trim()
}

export function normStudent(st: StudentData): string {
  return normName(displayName(st))
}

export function displayName(st: { tenThanh?: string; hoDem?: string; ten?: string; name?: string } | null | undefined): string {
  if (!st) return ''
  const parts = [st.tenThanh, st.hoDem, st.ten]
    .map(x => String(x || '').trim())
    .filter(Boolean)
  if (parts.length) return parts.join(' ')
  return String(st.name || '').trim()
}

export function ensureNameFields(st: StudentData): void {
  if (!st) return
  if (st.tenThanh == null && st.hoDem == null && st.ten == null) {
    if (st.name) {
      const parts = String(st.name).trim().split(/\s+/)
      if (parts.length === 1) {
        st.ten = parts[0]
      } else if (parts.length === 2) {
        st.hoDem = parts[0]
        st.ten = parts[1]
      } else {
        st.tenThanh = parts[0]
        st.hoDem = parts.slice(1, -1).join(' ')
        st.ten = parts[parts.length - 1]
      }
    }
  }
  if (st.tenThanh == null) st.tenThanh = ''
  if (st.hoDem == null) st.hoDem = ''
  if (st.ten == null) st.ten = ''
}

export function ensureLearningLog(st: StudentData): void {
  if (!Array.isArray(st.learningLog)) st.learningLog = []
}

export function studentMissingCols(
  student: StudentData,
  term: 'hk1' | 'hk2',
  cols: readonly ScoreColumnDef[]
): ScoreColumnDef[] {
  const scores = student.scoresByTerm?.[term]
  if (!scores) return cols.slice()
  return cols.filter(c => !scores[c.key]?.length)
}

export function studentMissingColsList(
  student: StudentData,
  term: 'hk1' | 'hk2',
  cols: readonly ScoreColumnDef[]
): string[] {
  return studentMissingCols(student, term, cols).map(c => c.label)
}

export function studentMissingForClass(
  student: StudentData,
  term: 'hk1' | 'hk2',
  cols: readonly ScoreColumnDef[]
): { missing: ScoreColumnDef[]; total: number; done: number } {
  const missing = studentMissingCols(student, term, cols)
  return { missing, total: cols.length, done: cols.length - missing.length }
}

export interface AttentionResult {
  level: 'high' | 'mid' | 'none'
  reasons: string[]
}

export function studentAttention(
  student: StudentData,
  tb: number | null,
  term: Term
): AttentionResult {
  const reasons: string[] = []
  const logs = student.learningLog || []
  const negCount = logs.filter(l => l.level === 'yeu' || l.level === 'kem').length
  const recentNeg = logs.filter(l => {
    try {
      return (l.level === 'yeu' || l.level === 'kem') &&
        Date.now() - new Date(l.date).getTime() < 30 * 24 * 60 * 60 * 1000
    } catch { return false }
  }).length

  if (tb != null && tb < 5) {
    reasons.push(`TB ${termLabel(term)} = ${tb.toFixed(1)} (yếu)`)
  }
  if (tb != null && tb >= 5 && tb < 6.5) {
    reasons.push(`TB ${termLabel(term)} = ${tb.toFixed(1)} (cần theo dõi)`)
  }
  if (negCount >= 3) {
    reasons.push(`${negCount} nhật ký mức yếu/kém`)
  }
  if (recentNeg >= 2) {
    reasons.push(`${recentNeg} nhật ký yếu/kém trong 30 ngày`)
  }

  if (tb != null && tb < 5 && (negCount >= 2 || recentNeg >= 1)) {
    return { level: 'high', reasons }
  }
  if (tb != null && tb >= 5 && tb < 6.5) {
    return { level: 'mid', reasons }
  }
  if (negCount >= 3) {
    return { level: 'mid', reasons }
  }
  return { level: 'none', reasons }
}

export function attentionBadgeHtml(attention: AttentionResult): string {
  if (attention.level === 'high') {
    return '<span class="badge badge-danger">🔴 Cần quan tâm</span>'
  }
  if (attention.level === 'mid') {
    return '<span class="badge badge-warning">🟡 Theo dõi</span>'
  }
  return ''
}

export interface QuickReport {
  top5: StudentData[]
  weak: StudentData[]
  needHelp: StudentData[]
  missing: StudentData[]
  improved: StudentData[]
  declined: StudentData[]
  classAvg: number | null
}

export function buildQuickReport(
  students: StudentData[],
  weights: Record<string, number>,
  cols: readonly ScoreColumnDef[],
  term: Term
): QuickReport {
  const withTB = students.map(st => ({
    st,
    hk1: studentTB(st, weights, 'hk1', cols),
    hk2: studentTB(st, weights, 'hk2', cols),
    tb: term === 'year'
      ? studentYearTB(st, weights, cols)
      : studentTB(st, weights, term as 'hk1' | 'hk2', cols),
  }))

  const valid = withTB.filter(x => x.tb != null)
  valid.sort((a, b) => (b.tb ?? 0) - (a.tb ?? 0))

  const top5 = valid.slice(0, 5).map(x => x.st)
  const weak = valid.filter(x => x.tb != null && x.tb < 5).map(x => x.st)
  const needHelp = valid.filter(x => x.tb != null && x.tb >= 5 && x.tb < 6.5).map(x => x.st)

  const missing = students.filter(st => {
    if (term === 'year') return cols.some(c => !st.scoresByTerm?.hk1?.[c.key]?.length && !st.scoresByTerm?.hk2?.[c.key]?.length)
    return cols.some(c => !st.scoresByTerm?.[term as 'hk1' | 'hk2']?.[c.key]?.length)
  })

  const improved = withTB
    .filter(x => x.hk1 != null && x.hk2 != null && x.hk2 > x.hk1)
    .sort((a, b) => ((b.hk2 ?? 0) - (b.hk1 ?? 0)) - ((a.hk2 ?? 0) - (a.hk1 ?? 0)))
    .map(x => x.st)

  const declined = withTB
    .filter(x => x.hk1 != null && x.hk2 != null && x.hk2 < x.hk1)
    .sort((a, b) => ((a.hk1 ?? 0) - (a.hk2 ?? 0)) - ((b.hk1 ?? 0) - (b.hk2 ?? 0)))
    .map(x => x.st)

  const classAvg = valid.length
    ? valid.reduce((s, x) => s + (x.tb ?? 0), 0) / valid.length
    : null

  return { top5, weak, needHelp, missing, improved, declined, classAvg }
}

export interface ExportRow {
  tenThanh: string
  hoDem: string
  ten: string
  [colKey: string]: string | number
}

export function buildExportRows(
  students: StudentData[],
  cols: readonly ScoreColumnDef[],
  term: 'hk1' | 'hk2'
): ExportRow[] {
  return students.map(st => {
    const row: ExportRow = {
      tenThanh: st.tenThanh || '',
      hoDem: st.hoDem || '',
      ten: st.ten || '',
    }
    const scores = st.scoresByTerm?.[term] || {} as TermScores
    for (const col of cols) {
      const vals = scores[col.key]
      row[col.key] = vals?.length ? vals.join('; ') : ''
    }
    return row
  })
}

export function buildYearSummaryRows(
  students: StudentData[],
  weights: Record<string, number>,
  cols: readonly ScoreColumnDef[]
): ExportRow[] {
  return students.map(st => {
    const hk1 = studentTB(st, weights, 'hk1', cols)
    const hk2 = studentTB(st, weights, 'hk2', cols)
    const year = studentYearTB(st, weights, cols)
    return {
      tenThanh: st.tenThanh || '',
      hoDem: st.hoDem || '',
      ten: st.ten || '',
      TB_HK1: hk1 != null ? Number(hk1.toFixed(2)) : '',
      TB_HK2: hk2 != null ? Number(hk2.toFixed(2)) : '',
      TB_CN: year != null ? Number(year.toFixed(2)) : '',
    }
  })
}

export function formatScoresList(arr: number[] | undefined | null): string {
  if (!arr || !arr.length) return '(trống)'
  return arr.map(n => {
    const f = Number(n.toFixed(1))
    return Number.isInteger(f) ? String(f) : f.toFixed(1)
  }).join('; ')
}

export interface LegacyBackup {
  version: number
  exportedAt: string
  state: any
  auth: any
  printSettings?: any
  scoreHistory?: any[]
}

export function buildFullBackup(state: any, auth: any, printSettings?: any): LegacyBackup {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    state,
    auth,
    printSettings: printSettings || {},
  }
}

export function safeSheetName(name: string): string {
  return String(name || '').slice(0, 31).replace(/[\\*?[\]/]/g, '')
}
