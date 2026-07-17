// ============================================================
// Sổ Điểm GL — Constants
// ============================================================

// Score columns
export const COLS = [
  { key: 'khaoKinh' as const, short: 'KK', label: 'Khảo kinh', defaultWeight: 1 },
  { key: 'thuocBai' as const, short: 'TB', label: 'Thuộc bài', defaultWeight: 1 },
  { key: 'chuyenCan' as const, short: 'CC', label: 'Chuyên cần', defaultWeight: 1 },
  { key: 'baiTap' as const, short: 'BT', label: 'Bài tập', defaultWeight: 1 },
  { key: 'thaiDo' as const, short: 'TĐ', label: 'Thái độ', defaultWeight: 1 },
  { key: 'kiemTra' as const, short: 'KT', label: 'Kiểm tra', defaultWeight: 1 }
] as const

export type ColumnKey = (typeof COLS)[number]['key']

export const COL_KEYS: ColumnKey[] = COLS.map(c => c.key)
export const COL_SHORTS = Object.fromEntries(COLS.map(c => [c.key, c.short]))
export const COL_LABELS = Object.fromEntries(COLS.map(c => [c.key, c.label]))

export type ColumnKey =
  | 'khaoKinh'
  | 'thuocBai'
  | 'chuyenCan'
  | 'baiTap'
  | 'thaiDo'
  | 'kiemTra'

// Name fields
export const NAME_FIELDS = ['tenThanh', 'hoDem', 'ten'] as const
export const INFO_FIELDS = ['maHV', 'ngaySinh', 'gioiTinh', 'tenPhuHuynh', 'sdPhuHuynh', 'diaChi', 'email'] as const

export type NameField = typeof NAME_FIELDS[number]
export type InfoField = typeof INFO_FIELDS[number]

// Default weights
export const DEFAULT_WEIGHTS: Record<ColumnKey, number> = {
  khaoKinh: 1,
  thuocBai: 1,
  chuyenCan: 1,
  baiTap: 1,
  thaiDo: 1,
  kiemTra: 1
}

// Log types and levels
export const LOG_TYPES = [
  { key: 'hoc_tap', label: 'Học tập', color: '#3b82f6' },
  { key: 'hanh_kiem', label: 'Hạnh kiểm', color: '#16a34a' },
  { key: 'vi_pham', label: 'Vi phạm', color: '#ef4444' },
  { key: 'khac', label: 'Khác', color: '#64748b' }
] as const

export const LOG_LEVELS = [
  { key: 'tot', label: 'Tốt', color: '#16a34a' },
  { key: 'kha', label: 'Khá', color: '#22c55e' },
  { key: 'binh_thuong', label: 'Bình thường', color: '#eab308' },
  { key: 'yeu', label: 'Yếu', color: '#f97316' },
  { key: 'kem', label: 'Kém', color: '#ef4444' }
] as const

export type LogType = typeof LOG_TYPES[number]['key']
export type LogLevel = typeof LOG_LEVELS[number]['key']

// Session key
export const STORAGE_KEY = 'so-diem-gl'
export const AUTH_STORAGE_KEY = 'so-diem-gl-auth'
export const SESSION_KEY = 'so-diem-gl-session'

// User roles
export type UserRole = 'ban_gl' | 'glv'

// View modes
export type ViewMode = 'cards' | 'table' | 'rank' | 'stats' | 'missing' | 'year' | 'print'

// Terms
export type Term = 'hk1' | 'hk2' | 'year'

// Score rank classification
export interface RankInfo {
  score: string
  rank: string
  label: string
}

export const RANK_THRESHOLDS = [
  { min: 9, score: 'score-xs', rank: 'xs', label: 'Xuất sắc' },
  { min: 8, score: 'score-g', rank: 'g', label: 'Giỏi' },
  { min: 6.5, score: 'score-k', rank: 'k', label: 'Khá' },
  { min: 5, score: 'score-tb', rank: 'tb', label: 'Trung bình' },
  { min: 0, score: 'score-y', rank: 'y', label: 'Yếu' }
] as const

export function classifyRank(tb: number | null): RankInfo {
  if (tb === null || tb === undefined || isNaN(tb)) {
    return { score: 'score-none', rank: 'none', label: 'Chưa có điểm' }
  }
  for (const threshold of RANK_THRESHOLDS) {
    if (tb >= threshold.min) {
      return { score: threshold.score, rank: threshold.rank, label: threshold.label }
    }
  }
  return { score: 'score-y', rank: 'y', label: 'Yếu' }
}

export function getRankColorClass(rank: string): string {
  const colors: Record<string, string> = {
    xs: 'text-amber-600 dark:text-amber-400',
    g: 'text-green-600 dark:text-green-400',
    k: 'text-blue-600 dark:text-blue-400',
    tb: 'text-gray-600 dark:text-gray-400',
    y: 'text-red-600 dark:text-red-400',
    none: 'text-gray-400'
  }
  return colors[rank] || colors.none
}

export function getRankBadgeClass(rank: string): string {
  const classes: Record<string, string> = {
    xs: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    g: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    k: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    tb: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    y: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    none: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400'
  }
  return classes[rank] || classes.none
}

// Year weights for final grade calculation
export const YEAR_WEIGHTS = {
  hk1: 1,
  hk2: 2
} as const

// Column weights
export interface ColumnWeights {
  khaoKinh: number
  thuocBai: number
  chuyenCan: number
  baiTap: number
  thaiDo: number
  kiemTra: number
}

export const DEFAULT_WEIGHTS: ColumnWeights = {
  khaoKinh: 1,
  thuocBai: 1,
  chuyenCan: 1,
  baiTap: 1,
  thaiDo: 1,
  kiemTra: 1
}

export function validateWeights(weights: Partial<ColumnWeights>): ColumnWeights {
  const result = { ...DEFAULT_WEIGHTS }
  for (const key of COLS) {
    if (weights[key] !== undefined && typeof weights[key] === 'number' && weights[key]! > 0) {
      result[key] = weights[key]!
    }
  }
  return result
}

// Score helpers
export function createEmptyTermScores(): Record<ColumnKey, number[]> {
  return {
    khaoKinh: [],
    thuocBai: [],
    chuyenCan: [],
    baiTap: [],
    thaiDo: [],
    kiemTra: []
  }
}

export function createEmptyScoresByTerm(): { hk1: Record<ColumnKey, number[]>; hk2: Record<ColumnKey, number[]> } {
  return {
    hk1: createEmptyTermScores(),
    hk2: createEmptyTermScores()
  }
}

// Parsing
export function parseScore(raw: string): number | null {
  if (!raw || !raw.trim()) return null
  const cleaned = raw.trim().replace(',', '.')
  const num = parseFloat(cleaned)
  if (isNaN(num)) return null
  return num >= 0 && num <= 10 ? Math.round(num * 100) / 100 : null
}

export function parseScoreCell(raw: any): number[] {
  if (raw == null || raw === '') return []
  if (typeof raw === 'number' && !isNaN(raw)) {
    const n = Math.round(raw * 100) / 100
    return n >= 0 && n <= 10 ? [n] : []
  }
  const s = String(raw).trim()
  if (!s) return []
  if (/^\d+,\d+$/.test(s)) {
    const single = parseScore(s)
    return single != null ? [single] : []
  }
  return s
    .split(/[;|/]+|\s*,\s*(?=\d)/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(parseScore)
    .filter((n): n is number => n != null)
}

// Format
export function formatScore(n: number | null, digits = 1): string {
  if (n == null || isNaN(n)) return '—'
  const f = Number(n.toFixed(digits))
  return Number.isInteger(f) ? String(f) : f.toFixed(digits)
}

export function formatRank(rank: string): string {
  const labels: Record<string, string> = {
    xs: 'XS',
    g: 'G',
    k: 'K',
    tb: 'TB',
    y: 'Y',
    none: '—'
  }
  return labels[rank] || rank
}

// Grade classification
export function classifyStudent(tb: number): { score: string; rank: string; label: string } {
  if (tb >= 9) return { score: 'score-xs', rank: 'xs', label: 'Xuất sắc' }
  if (tb >= 8) return { score: 'score-g', rank: 'g', label: 'Giỏi' }
  if (tb >= 6.5) return { score: 'score-k', rank: 'k', label: 'Khá' }
  if (tb >= 5) return { score: 'score-tb', rank: 'tb', label: 'Trung bình' }
  return { score: 'score-y', rank: 'y', label: 'Yếu' }
}

export function classifyRank(tb: number | null): RankInfo {
  if (tb === null || tb === undefined || isNaN(tb)) {
    return { score: 'score-none', rank: 'none', label: 'Chưa có điểm' }
  }
  for (const threshold of RANK_THRESHOLDS) {
    if (tb >= threshold.min) {
      return { score: threshold.score, rank: threshold.rank, label: threshold.label }
    }
  }
  return { score: 'score-y', rank: 'y', label: 'Yếu' }
}

export function getRankColorClass(rank: string): string {
  const colors: Record<string, string> = {
    xs: 'text-amber-600 dark:text-amber-400',
    g: 'text-green-600 dark:text-green-400',
    k: 'text-blue-600 dark:text-blue-400',
    tb: 'text-gray-600 dark:text-gray-400',
    y: 'text-red-600 dark:text-red-400',
    none: 'text-gray-400'
  }
  return colors[rank] || colors.none
}

export function getRankBadgeClass(rank: string): string {
  const classes: Record<string, string> = {
    xs: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    g: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    k: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    tb: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    y: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    none: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400'
  }
  return classes[rank] || classes.none
}

// Year weights for final grade calculation
export const YEAR_WEIGHTS = {
  hk1: 1,
  hk2: 2
} as const