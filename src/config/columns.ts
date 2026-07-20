// ============================================================
// Sổ Điểm GL — Dynamic Score Columns
// ============================================================

import { generateId } from '../utils/id.ts'

/** Runtime column key (no longer a fixed union). */
export type ColumnKey = string

export interface ScoreColumnDef {
  key: ColumnKey
  short: string
  label: string
  defaultWeight: number
}

/** Default catalog used when a class has no custom columns yet. */
export const DEFAULT_COLS: readonly ScoreColumnDef[] = [
  { key: 'khaoKinh', short: 'KK', label: 'Khảo kinh', defaultWeight: 1 },
  { key: 'thuocBai', short: 'TB', label: 'Thuộc bài', defaultWeight: 1 },
  { key: 'chuyenCan', short: 'CC', label: 'Chuyên cần', defaultWeight: 1 },
  { key: 'baiTap', short: 'BT', label: 'Bài tập', defaultWeight: 1 },
  { key: 'thaiDo', short: 'TĐ', label: 'Thái độ', defaultWeight: 1 },
  { key: 'kiemTra', short: 'KT', label: 'Kiểm tra', defaultWeight: 1 }
]

/** @deprecated Prefer DEFAULT_COLS — kept for existing imports/tests. */
export const COLS = DEFAULT_COLS

export type ColumnWeights = Record<ColumnKey, number>
export type TermScores = Record<ColumnKey, number[]>

export function cloneDefaultCols(): ScoreColumnDef[] {
  return DEFAULT_COLS.map(c => ({ ...c }))
}

export function defaultWeights(cols: readonly ScoreColumnDef[] = DEFAULT_COLS): ColumnWeights {
  const w: ColumnWeights = {}
  for (const c of cols) {
    w[c.key] = c.defaultWeight
  }
  return w
}

export const DEFAULT_WEIGHTS: ColumnWeights = defaultWeights()

export function weightsFromColumns(cols: readonly ScoreColumnDef[], existing?: Partial<ColumnWeights>): ColumnWeights {
  const w: ColumnWeights = {}
  for (const c of cols) {
    const prev = existing?.[c.key]
    w[c.key] = typeof prev === 'number' && prev > 0 ? prev : c.defaultWeight
  }
  return w
}

export function validateWeights(
  weights: Partial<ColumnWeights>,
  cols: readonly ScoreColumnDef[] = DEFAULT_COLS
): ColumnWeights {
  const result = defaultWeights(cols)
  for (const col of cols) {
    const v = weights[col.key]
    if (typeof v === 'number' && v > 0) {
      result[col.key] = v
    }
  }
  return result
}

export function createEmptyTermScores(cols: readonly ScoreColumnDef[] = DEFAULT_COLS): TermScores {
  const scores: TermScores = {}
  for (const c of cols) {
    scores[c.key] = []
  }
  return scores
}

export function createEmptyScoresByTerm(cols: readonly ScoreColumnDef[] = DEFAULT_COLS): {
  hk1: TermScores
  hk2: TermScores
} {
  return {
    hk1: createEmptyTermScores(cols),
    hk2: createEmptyTermScores(cols)
  }
}

export function ensureScoresMatchColumns(
  scores: TermScores | undefined | null,
  cols: readonly ScoreColumnDef[]
): TermScores {
  const out = createEmptyTermScores(cols)
  if (!scores || typeof scores !== 'object') return out
  for (const c of cols) {
    out[c.key] = Array.isArray(scores[c.key]) ? [...scores[c.key]] : []
  }
  return out
}

/** Slugify a label into a stable column key. */
export function columnKeyFromLabel(label: string, existingKeys: Iterable<string> = []): string {
  const base = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .replace(/_+/g, '_')
    .toLowerCase() || 'cot'

  const taken = new Set(existingKeys)
  if (!taken.has(base)) return base
  let i = 2
  while (taken.has(`${base}_${i}`)) i++
  return `${base}_${i}`
}

export function makeColumnDef(
  label: string,
  short: string,
  existingKeys: Iterable<string> = [],
  defaultWeight = 1
): ScoreColumnDef {
  return {
    key: columnKeyFromLabel(label, existingKeys),
    short: (short || label.slice(0, 2)).toUpperCase().slice(0, 4),
    label: label.trim(),
    defaultWeight: defaultWeight > 0 ? defaultWeight : 1
  }
}

export function resolveClassColumns(cls: { columns?: ScoreColumnDef[] } | null | undefined): ScoreColumnDef[] {
  if (cls?.columns?.length) return cls.columns.map(c => ({ ...c }))
  return cloneDefaultCols()
}

export function colLabel(cols: readonly ScoreColumnDef[], key: ColumnKey): string {
  return cols.find(c => c.key === key)?.label || key
}

export function colShort(cols: readonly ScoreColumnDef[], key: ColumnKey): string {
  return cols.find(c => c.key === key)?.short || key.slice(0, 2).toUpperCase()
}

export function newColumnId(): string {
  return generateId('col')
}
