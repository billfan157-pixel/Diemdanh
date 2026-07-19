// ============================================================
// Sổ Điểm GL — Calculation Logic
// Average scores, weighting, and grade classifications
// ============================================================

import { COLS, ColumnKey } from '../config/constants.ts'
import { StudentData, ColumnWeights } from '../services/storage/StorageAdapter.types'

export const YEAR_WEIGHTS = { hk1: 1, hk2: 2 }

export interface Classification {
  label: string
  rank: string
  score: string
}

/**
 * Return default weights dictionary
 */
export function defaultWeights(): ColumnWeights {
  const w = {} as Record<ColumnKey, number>
  for (const c of COLS) {
    w[c.key] = c.defaultWeight
  }
  return w as unknown as ColumnWeights
}

/**
 * Return empty scores structure
 */
export function emptyScores(): Record<ColumnKey, number[]> {
  const s = {} as Record<ColumnKey, number[]>
  for (const c of COLS) {
    s[c.key] = []
  }
  return s
}

/**
 * Deep clone score data structure
 */
export function cloneScores(src?: Record<string, number[]>): Record<ColumnKey, number[]> {
  const out = emptyScores()
  if (!src) return out
  for (const c of COLS) {
    out[c.key] = Array.isArray(src[c.key]) ? [...src[c.key]] : []
  }
  return out
}

/**
 * Ensure student terms scores are properly formatted and migrates legacy flat scores if needed
 */
export function ensureStudentTerms(st: StudentData): StudentData {
  if (!st) return st

  if (!st.scoresByTerm || typeof st.scoresByTerm !== 'object') {
    st.scoresByTerm = {
      hk1: emptyScores() as any,
      hk2: emptyScores() as any
    }
  }

  if (!st.scoresByTerm.hk1) st.scoresByTerm.hk1 = emptyScores() as any
  if (!st.scoresByTerm.hk2) st.scoresByTerm.hk2 = emptyScores() as any

  // Migrate flat legacy scores -> HK1 (run once)
  const rawSt = st as any
  if (rawSt.scores && typeof rawSt.scores === 'object') {
    const hasFlat = COLS.some(c => rawSt.scores?.[c.key] && rawSt.scores[c.key].length)
    const hk1Empty = !COLS.some(c => st.scoresByTerm?.hk1?.[c.key] && st.scoresByTerm.hk1[c.key].length)

    if (hasFlat && hk1Empty) {
      st.scoresByTerm.hk1 = cloneScores(rawSt.scores) as any
    }
    delete rawSt.scores
  }

  // Ensure each column has an array
  for (const term of ['hk1', 'hk2'] as const) {
    const termData = st.scoresByTerm[term] || emptyScores()
    for (const c of COLS) {
      if (!Array.isArray((termData as any)[c.key])) {
        (termData as any)[c.key] = []
      }
    }
    st.scoresByTerm[term] = termData as any
  }

  return st
}

/**
 * Get term scores safely, ensuring the structure is correct
 */
export function getScores(st: StudentData, term: 'hk1' | 'hk2'): Record<ColumnKey, number[]> {
  ensureStudentTerms(st)
  return (st.scoresByTerm?.[term] || emptyScores()) as unknown as Record<ColumnKey, number[]>
}

/**
 * Compute average of a single score array
 */
export function colAvg(scores?: number[]): number | null {
  if (!scores || !scores.length) return null
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

/**
 * Compute student term average based on column weights
 */
export function studentTB(student: StudentData, weights: ColumnWeights = defaultWeights(), term: 'hk1' | 'hk2'): number | null {
  const bag = getScores(student, term)
  let sum = 0
  let wSum = 0

  for (const col of COLS) {
    const avg = colAvg(bag[col.key])
    if (avg === null) continue

    const w = Number((weights as any)[col.key]) || 0
    if (w <= 0) continue

    sum += avg * w
    wSum += w
  }

  return wSum === 0 ? null : sum / wSum
}

/**
 * Compute student year average, handling fallbacks if a term is missing
 */
export function studentYearTB(student: StudentData, weights: ColumnWeights = defaultWeights()): number | null {
  const t1 = studentTB(student, weights, 'hk1')
  const t2 = studentTB(student, weights, 'hk2')

  const w1 = Number(YEAR_WEIGHTS.hk1) || 1
  const w2 = Number(YEAR_WEIGHTS.hk2) || 2

  if (t1 === null && t2 === null) return null
  if (t1 === null) return t2
  if (t2 === null) return t1

  return (t1 * w1 + t2 * w2) / (w1 + w2)
}

/**
 * Compute student average based on context (HK1, HK2, or Year)
 */
export function studentTBContext(
  student: StudentData,
  weights: ColumnWeights = defaultWeights(),
  term: 'hk1' | 'hk2' | 'year'
): number | null {
  if (term === 'year') return studentYearTB(student, weights)
  return studentTB(student, weights, term)
}

/**
 * Describe calculation formula for Year Average
 */
export function yearFormulaText(): string {
  const w1 = Number(YEAR_WEIGHTS.hk1) || 1
  const w2 = Number(YEAR_WEIGHTS.hk2) || 2
  return `TB cả năm = (TB HK1 × ${w1} + TB HK2 × ${w2}) / ${w1 + w2}  ·  nếu thiếu 1 kỳ thì lấy TB kỳ còn lại`
}

/**
 * Classify rank based on average score
 */
export function classify(avg: number | null): Classification {
  if (avg === null) {
    return { label: 'Chưa đủ điểm', rank: 'rank-none', score: 'score-none' }
  }
  if (avg >= 9) return { label: 'Xuất sắc', rank: 'rank-xs', score: 'score-xs' }
  if (avg >= 8) return { label: 'Giỏi', rank: 'rank-g', score: 'score-g' }
  if (avg >= 6.5) return { label: 'Khá', rank: 'rank-k', score: 'score-k' }
  if (avg >= 5) return { label: 'Trung bình', rank: 'rank-tb', score: 'score-tb' }
  return { label: 'Yếu', rank: 'rank-y', score: 'score-y' }
}
