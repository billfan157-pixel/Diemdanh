import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  COLS,
  DEFAULT_WEIGHTS,
  COL_LABELS,
  COL_SHORTS,
  createEmptyTermScores,
  createEmptyScoresByTerm,
  parseScore,
  parseScoreCell,
  formatScore,
  formatRank,
  classifyStudent,
  normalizeName,
  displayName,
  sortName,
  generateId,
  deepClone,
  debounce,
  throttle,
  classifyRank,
  getRankColorClass,
  getRankBadgeClass,
  YEAR_WEIGHTS
} from '../../src/config/constants'

describe('constants', () => {
  describe('COLS', () => {
    it('should have 6 columns', () => {
      expect(COLS.length).toBe(6)
    })

    it('should have correct column keys', () => {
      expect(COLS).toEqual(['khaoKinh', 'thuocBai', 'chuyenCan', 'baiTap', 'thaiDo', 'kiemTra'])
    })
  })

  describe('COL_LABELS', () => {
    it('should have labels for all columns', () => {
      expect(COL_LABELS.khaoKinh).toBe('Khảo kinh')
      expect(COL_LABELS.thuocBai).toBe('Thuộc bài')
      expect(COL_LABELS.chuyenCan).toBe('Chuyên cần')
      expect(COL_LABELS.baiTap).toBe('Bài tập')
      expect(COL_LABELS.thaiDo).toBe('Thái độ')
      expect(COL_LABELS.kiemTra).toBe('Kiểm tra')
    })
  })

  describe('COL_SHORTS', () => {
    it('should have short names for all columns', () => {
      expect(COL_SHORTS.khaoKinh).toBe('KK')
      expect(COL_SHORTS.thuocBai).toBe('TB')
      expect(COL_SHORTS.chuyenCan).toBe('CC')
      expect(COL_SHORTS.baiTap).toBe('BT')
      expect(COL_SHORTS.thaiDo).toBe('TĐ')
      expect(COL_SHORTS.kiemTra).toBe('KT')
    })
  })

  describe('DEFAULT_WEIGHTS', () => {
    it('should have weight 1 for all columns by default', () => {
      expect(DEFAULT_WEIGHTS.khaoKinh).toBe(1)
      expect(DEFAULT_WEIGHTS.thuocBai).toBe(1)
      expect(DEFAULT_WEIGHTS.chuyenCan).toBe(1)
      expect(DEFAULT_WEIGHTS.baiTap).toBe(1)
      expect(DEFAULT_WEIGHTS.thaiDo).toBe(1)
      expect(DEFAULT_WEIGHTS.kiemTra).toBe(1)
    })
  })

  describe('createEmptyTermScores', () => {
    it('should create empty arrays for all columns', () => {
      const scores = createEmptyTermScores()
      expect(scores.khaoKinh).toEqual([])
      expect(scores.thuocBai).toEqual([])
      expect(scores.chuyenCan).toEqual([])
      expect(scores.baiTap).toEqual([])
      expect(scores.thaiDo).toEqual([])
      expect(scores.kiemTra).toEqual([])
    })
  })

  describe('createEmptyScoresByTerm', () => {
    it('should create empty scores for both terms', () => {
      const scores = createEmptyScoresByTerm()
      expect(scores.hk1).toBeDefined()
      expect(scores.hk2).toBeDefined()
      expect(scores.hk1.khaoKinh).toEqual([])
      expect(scores.hk2.khaoKinh).toEqual([])
    })
  })

  describe('parseScore', () => {
    it('should parse valid numbers', () => {
      expect(parseScore('8')).toBe(8)
      expect(parseScore('8.5')).toBe(8.5)
      expect(parseScore('8,5')).toBe(8.5)
      expect(parseScore('10')).toBe(10)
      expect(parseScore('0')).toBe(0)
    })

    it('should return null for invalid inputs', () => {
      expect(parseScore('abc')).toBeNull()
      expect(parseScore('11')).toBeNull()
      expect(parseScore('-1')).toBeNull()
      expect(parseScore('')).toBeNull()
      expect(parseScore(null as any)).toBeNull()
      expect(parseScore(undefined as any)).toBeNull()
    })

    it('should round to 2 decimal places', () => {
      expect(parseScore('8.123')).toBe(8.12)
      expect(parseScore('8.125')).toBe(8.12)
      expect(parseScore('8.126')).toBe(8.13)
    })
  })

  describe('parseScoreCell', () => {
    it('should parse single score', () => {
      expect(parseScoreCell('8')).toEqual([8])
      expect(parseScoreCell('8.5')).toEqual([8.5])
    })

    it('should parse comma-separated scores', () => {
      expect(parseScoreCell('8, 9, 7')).toEqual([8, 9, 7])
      expect(parseScoreCell('8;9;7')).toEqual([8, 9, 7])
      expect(parseScoreCell('8|9|7')).toEqual([8, 9, 7])
    })

    it('should filter invalid scores', () => {
      expect(parseScoreCell('8, abc, 9')).toEqual([8, 9])
      expect(parseScoreCell('11, -1, 5')).toEqual([5])
    })

    it('should return empty for empty input', () => {
      expect(parseScoreCell('')).toEqual([])
      expect(parseScoreCell('')).toEqual([])
      expect(parseScoreCell(null as any)).toEqual([])
      expect(parseScoreCell(undefined as any)).toEqual([])
    })
  })

  describe('formatScore', () => {
    it('should format numbers correctly', () => {
      expect(formatScore(8)).toBe('8')
      expect(formatScore(8.5)).toBe('8.5')
      expect(formatScore(8.125)).toBe('8.1')
      expect(formatScore(8.126)).toBe('8.1')
      expect(formatScore(8.125, 2)).toBe('8.13')
    })

    it('should return dash for null', () => {
      expect(formatScore(null)).toBe('—')
      expect(formatScore(NaN)).toBe('—')
    })
  })

  describe('formatRank', () => {
    it('should format rank labels', () => {
      expect(formatRank('xs')).toBe('XS')
      expect(formatRank('g')).toBe('G')
      expect(formatRank('k')).toBe('K')
      expect(formatRank('tb')).toBe('TB')
      expect(formatRank('y')).toBe('Y')
      expect(formatRank('none')).toBe('—')
    })
  })

  describe('classifyStudent', () => {
    it('should classify correctly', () => {
      expect(classifyStudent(9.5)).toEqual({ score: 'score-xs', rank: 'xs', label: 'Xuất sắc' })
      expect(classifyStudent(9.0)).toEqual({ score: 'score-xs', rank: 'xs', label: 'Xuất sắc' })
      expect(classifyStudent(8.5)).toEqual({ score: 'score-g', rank: 'g', label: 'Giỏi' })
      expect(classifyStudent(8.0)).toEqual({ score: 'score-g', rank: 'g', label: 'Giỏi' })
      expect(classifyStudent(7.5)).toEqual({ score: 'score-k', rank: 'k', label: 'Khá' })
      expect(classifyStudent(6.5)).toEqual({ score: 'score-k', rank: 'k', label: 'Khá' })
      expect(classifyStudent(6.0)).toEqual({ score: 'score-tb', rank: 'tb', label: 'Trung bình' })
      expect(classifyStudent(5.0)).toEqual({ score: 'score-tb', rank: 'tb', label: 'Trung bình' })
      expect(classifyStudent(4.9)).toEqual({ score: 'score-y', rank: 'y', label: 'Yếu' })
      expect(classifyStudent(0)).toEqual({ score: 'score-y', rank: 'y', label: 'Yếu' })
    })
  })

  describe('normalizeName', () => {
    it('should normalize names', () => {
      expect(normalizeName('Nguyễn Văn A')).toBe('nguyen van a')
      expect(normalizeName('  NGUYỄN   VĂN   A  ')).toBe('nguyen van a')
      expect(normalizeName('Nguyễn Văn A')).toBe('nguyen van a')
      expect(normalizeName('')).toBe('')
    })
  })

  describe('displayName', () => {
    it('should display name with 3 parts', () => {
      expect(displayName({ tenThanh: 'Maria', hoDem: 'Nguyễn Thị', ten: 'Hoa' })).toBe('Maria Nguyễn Thị Hoa')
    })

    it('should display name with 2 parts', () => {
      expect(displayName({ tenThanh: '', hoDem: 'Nguyễn', ten: 'Hoa' })).toBe('Nguyễn Hoa')
    })

    it('should display single name', () => {
      expect(displayName({ tenThanh: '', hoDem: '', ten: 'Hoa' })).toBe('Hoa')
    })

    it('should fallback to name field', () => {
      expect(displayName({ name: 'Nguyễn Văn A' })).toBe('Nguyễn Văn A')
    })
  })

  describe('sortName', () => {
    it('should sort Vietnamese names correctly', () => {
      const names = ['Nguyễn Văn B', 'Nguyễn Văn A', 'Trần Văn A', 'Lê Văn A']
      const sorted = [...names].sort(sortName)
      expect(sorted[0]).toBe('Lê Văn A')
      expect(sorted[1]).toBe('Nguyễn Văn A')
      expect(sorted[2]).toBe('Nguyễn Văn B')
      expect(sorted[3]).toBe('Trần Văn A')
    })
  })

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const ids = new Set()
      for (let i = 0; i < 100; i++) {
        ids.add(generateId())
      }
      expect(ids.size).toBe(100)
    })

    it('should include prefix', () => {
      const id = generateId('test')
      expect(id).toMatch(/^test_/)
    })
  })

  describe('deepClone', () => {
    it('should create deep copy', () => {
      const original = { a: 1, b: { c: 2 } }
      const cloned = deepClone(original)
      cloned.b.c = 3
      expect(original.b.c).toBe(2)
    })
  })

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should debounce function calls', () => {
      const fn = vi.fn()
      const debounced = debounce(fn, 100)

      debounced()
      debounced()
      debounced()

      expect(fn).not.toHaveBeenCalled()

      vi.advanceTimersByTime(100)
      expect(fn).toHaveBeenCalledTimes(1)
    })
  })

  describe('throttle', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should throttle function calls', () => {
      const fn = vi.fn()
      const throttled = throttle(fn, 100)

      throttled()
      throttled()
      throttled()

      expect(fn).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(100)
      throttled()
      expect(fn).toHaveBeenCalledTimes(2)
    })
  })

  describe('classifyRank', () => {
    it('should return correct rank info', () => {
      expect(classifyRank(9.5)).toEqual({ score: 'score-xs', rank: 'xs', label: 'Xuất sắc' })
      expect(classifyRank(8.5)).toEqual({ score: 'score-g', rank: 'g', label: 'Giỏi' })
      expect(classifyRank(7.5)).toEqual({ score: 'score-k', rank: 'k', label: 'Khá' })
      expect(classifyRank(6.5)).toEqual({ score: 'score-tb', rank: 'tb', label: 'Trung bình' })
      expect(classifyRank(4.5)).toEqual({ score: 'score-y', rank: 'y', label: 'Yếu' })
      expect(classifyRank(null)).toEqual({ score: 'score-none', rank: 'none', label: 'Chưa có điểm' })
    })
  })

  describe('getRankColorClass', () => {
    it('should return correct color classes', () => {
      expect(getRankColorClass('xs')).toBe('text-amber-600 dark:text-amber-400')
      expect(getRankColorClass('g')).toBe('text-green-600 dark:text-green-400')
      expect(getRankColorClass('k')).toBe('text-blue-600 dark:text-blue-400')
      expect(getRankColorClass('tb')).toBe('text-gray-600 dark:text-gray-400')
      expect(getRankColorClass('y')).toBe('text-red-600 dark:text-red-400')
    })
  })

  describe('getRankBadgeClass', () => {
    it('should return correct badge classes', () => {
      expect(getRankBadgeClass('xs')).toContain('bg-amber-100')
      expect(getRankBadgeClass('g')).toContain('bg-green-100')
      expect(getRankBadgeClass('k')).toContain('bg-blue-100')
      expect(getRankBadgeClass('tb')).toContain('bg-gray-100')
      expect(getRankBadgeClass('y')).toContain('bg-red-100')
    })
  })

  describe('YEAR_WEIGHTS', () => {
    it('should have correct weights', () => {
      expect(YEAR_WEIGHTS.hk1).toBe(1)
      expect(YEAR_WEIGHTS.hk2).toBe(2)
    })
  })
})