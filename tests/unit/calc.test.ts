import { describe, it, expect } from 'vitest'
import {
  defaultWeights,
  emptyScores,
  cloneScores,
  ensureStudentTerms,
  colAvg,
  studentTB,
  studentYearTB,
  studentTBContext,
  yearFormulaText,
  classify,
  YEAR_WEIGHTS
} from '../../src/core/calc.ts'
import { StudentData } from '../../src/services/storage/StorageAdapter.types'

// Helper to create a minimal student
function makeStudent(overrides: Partial<StudentData> = {}): StudentData {
  return {
    id: 'st-1',
    tenThanh: '',
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
    scoresByTerm: { hk1: {} as any, hk2: {} as any },
    learningLog: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides
  } as StudentData
}

describe('Calculation Engine', () => {

  // ================================================================
  // defaultWeights
  // ================================================================
  describe('defaultWeights', () => {
    it('should return weights for all 6 columns', () => {
      const w = defaultWeights()
      expect(w.khaoKinh).toBe(1)
      expect(w.thuocBai).toBe(1)
      expect(w.chuyenCan).toBe(1)
      expect(w.baiTap).toBe(1)
      expect(w.thaiDo).toBe(1)
      expect(w.kiemTra).toBe(1)
    })
  })

  // ================================================================
  // emptyScores
  // ================================================================
  describe('emptyScores', () => {
    it('should return empty arrays for all columns', () => {
      const s = emptyScores()
      expect(s.khaoKinh).toEqual([])
      expect(s.thuocBai).toEqual([])
      expect(s.kiemTra).toEqual([])
    })
  })

  // ================================================================
  // cloneScores
  // ================================================================
  describe('cloneScores', () => {
    it('should deep clone score arrays', () => {
      const src = { khaoKinh: [8, 9], thuocBai: [7] }
      const cloned = cloneScores(src)
      expect(cloned.khaoKinh).toEqual([8, 9])
      expect(cloned.thuocBai).toEqual([7])
      // Mutating original should not affect clone
      src.khaoKinh.push(10)
      expect(cloned.khaoKinh).toEqual([8, 9])
    })

    it('should return empty scores when source is undefined', () => {
      const cloned = cloneScores(undefined)
      expect(cloned.khaoKinh).toEqual([])
    })
  })

  // ================================================================
  // colAvg
  // ================================================================
  describe('colAvg', () => {
    it('should compute average of numbers', () => {
      expect(colAvg([8, 9, 10])).toBe(9)
      expect(colAvg([10])).toBe(10)
      expect(colAvg([0, 10])).toBe(5)
    })

    it('should return null for empty or missing arrays', () => {
      expect(colAvg([])).toBeNull()
      expect(colAvg(undefined)).toBeNull()
    })

    it('should handle single score', () => {
      expect(colAvg([7.5])).toBe(7.5)
    })

    it('should handle decimal scores', () => {
      expect(colAvg([8.5, 9.5])).toBe(9)
    })
  })

  // ================================================================
  // studentTB (term average)
  // ================================================================
  describe('studentTB', () => {
    it('should compute weighted average for a term', () => {
      const student = makeStudent({
        scoresByTerm: {
          hk1: { khaoKinh: [9], kiemTra: [7] } as any,
          hk2: {} as any
        }
      })
      const weights = { khaoKinh: 1, kiemTra: 3 } as any
      // (9*1 + 7*3) / (1+3) = 30/4 = 7.5
      expect(studentTB(student, weights, 'hk1')).toBe(7.5)
    })

    it('should return null when no scores exist', () => {
      const student = makeStudent()
      expect(studentTB(student, defaultWeights(), 'hk1')).toBeNull()
    })

    it('should skip columns with zero weight', () => {
      const student = makeStudent({
        scoresByTerm: {
          hk1: { khaoKinh: [10], kiemTra: [5] } as any,
          hk2: {} as any
        }
      })
      const weights = { khaoKinh: 0, kiemTra: 1 } as any
      // khaoKinh weight=0 → skipped, only kiemTra: 5/1 = 5
      expect(studentTB(student, weights, 'hk1')).toBe(5)
    })

    it('should handle all columns having scores', () => {
      const student = makeStudent({
        scoresByTerm: {
          hk1: {
            khaoKinh: [8], thuocBai: [8], chuyenCan: [8],
            baiTap: [8], thaiDo: [8], kiemTra: [8]
          } as any,
          hk2: {} as any
        }
      })
      // All equal weights=1, all avg=8 → TB = 8
      expect(studentTB(student, defaultWeights(), 'hk1')).toBe(8)
    })

    it('should handle multiple scores per column', () => {
      const student = makeStudent({
        scoresByTerm: {
          hk1: { khaoKinh: [6, 8, 10] } as any, // avg = 8
          hk2: {} as any
        }
      })
      const weights = { khaoKinh: 1 } as any
      expect(studentTB(student, weights, 'hk1')).toBe(8)
    })
  })

  // ================================================================
  // studentYearTB (year average with term weights)
  // ================================================================
  describe('studentYearTB', () => {
    it('should compute year average: (HK1*1 + HK2*2) / 3', () => {
      const student = makeStudent({
        scoresByTerm: {
          hk1: { khaoKinh: [9] } as any, // TB HK1 = 9
          hk2: { khaoKinh: [6] } as any  // TB HK2 = 6
        }
      })
      const weights = { khaoKinh: 1 } as any
      // (9*1 + 6*2) / 3 = 21/3 = 7
      expect(studentYearTB(student, weights)).toBe(7)
    })

    it('should fallback to HK1 if HK2 is empty', () => {
      const student = makeStudent({
        scoresByTerm: {
          hk1: { khaoKinh: [8] } as any,
          hk2: {} as any
        }
      })
      expect(studentYearTB(student, { khaoKinh: 1 } as any)).toBe(8)
    })

    it('should fallback to HK2 if HK1 is empty', () => {
      const student = makeStudent({
        scoresByTerm: {
          hk1: {} as any,
          hk2: { khaoKinh: [7] } as any
        }
      })
      expect(studentYearTB(student, { khaoKinh: 1 } as any)).toBe(7)
    })

    it('should return null if both terms are empty', () => {
      const student = makeStudent()
      expect(studentYearTB(student, defaultWeights())).toBeNull()
    })

    it('should use correct term weights (HK1=1, HK2=2)', () => {
      expect(YEAR_WEIGHTS.hk1).toBe(1)
      expect(YEAR_WEIGHTS.hk2).toBe(2)
    })

    it('should compute correctly with complex multi-column scores', () => {
      const student = makeStudent({
        scoresByTerm: {
          hk1: { khaoKinh: [10], kiemTra: [10] } as any, // TB = 10
          hk2: { khaoKinh: [7], kiemTra: [7] } as any    // TB = 7
        }
      })
      const weights = { khaoKinh: 1, kiemTra: 1 } as any
      // (10*1 + 7*2) / 3 = 24/3 = 8
      expect(studentYearTB(student, weights)).toBe(8)
    })
  })

  // ================================================================
  // studentTBContext
  // ================================================================
  describe('studentTBContext', () => {
    it('should delegate to studentTB for hk1/hk2', () => {
      const student = makeStudent({
        scoresByTerm: {
          hk1: { khaoKinh: [9] } as any,
          hk2: { khaoKinh: [6] } as any
        }
      })
      const weights = { khaoKinh: 1 } as any
      expect(studentTBContext(student, weights, 'hk1')).toBe(9)
      expect(studentTBContext(student, weights, 'hk2')).toBe(6)
    })

    it('should delegate to studentYearTB for year', () => {
      const student = makeStudent({
        scoresByTerm: {
          hk1: { khaoKinh: [9] } as any,
          hk2: { khaoKinh: [6] } as any
        }
      })
      const weights = { khaoKinh: 1 } as any
      // (9*1 + 6*2)/3 = 7
      expect(studentTBContext(student, weights, 'year')).toBe(7)
    })
  })

  // ================================================================
  // classify
  // ================================================================
  describe('classify', () => {
    it('should classify Xuất sắc (≥9)', () => {
      expect(classify(9)).toEqual({ label: 'Xuất sắc', rank: 'rank-xs', score: 'score-xs' })
      expect(classify(10)).toEqual({ label: 'Xuất sắc', rank: 'rank-xs', score: 'score-xs' })
      expect(classify(9.5)).toEqual({ label: 'Xuất sắc', rank: 'rank-xs', score: 'score-xs' })
    })

    it('should classify Giỏi (≥8, <9)', () => {
      expect(classify(8)).toEqual({ label: 'Giỏi', rank: 'rank-g', score: 'score-g' })
      expect(classify(8.99)).toEqual({ label: 'Giỏi', rank: 'rank-g', score: 'score-g' })
    })

    it('should classify Khá (≥6.5, <8)', () => {
      expect(classify(6.5)).toEqual({ label: 'Khá', rank: 'rank-k', score: 'score-k' })
      expect(classify(7.99)).toEqual({ label: 'Khá', rank: 'rank-k', score: 'score-k' })
    })

    it('should classify Trung bình (≥5, <6.5)', () => {
      expect(classify(5)).toEqual({ label: 'Trung bình', rank: 'rank-tb', score: 'score-tb' })
      expect(classify(6.49)).toEqual({ label: 'Trung bình', rank: 'rank-tb', score: 'score-tb' })
    })

    it('should classify Yếu (<5)', () => {
      expect(classify(4.99)).toEqual({ label: 'Yếu', rank: 'rank-y', score: 'score-y' })
      expect(classify(0)).toEqual({ label: 'Yếu', rank: 'rank-y', score: 'score-y' })
    })

    it('should handle null (chưa đủ điểm)', () => {
      expect(classify(null)).toEqual({ label: 'Chưa đủ điểm', rank: 'rank-none', score: 'score-none' })
    })

    it('should handle boundary values precisely', () => {
      expect(classify(9).label).toBe('Xuất sắc')
      expect(classify(8).label).toBe('Giỏi')
      expect(classify(6.5).label).toBe('Khá')
      expect(classify(5).label).toBe('Trung bình')
      expect(classify(4.99).label).toBe('Yếu')
    })
  })

  // ================================================================
  // yearFormulaText
  // ================================================================
  describe('yearFormulaText', () => {
    it('should return correct formula description', () => {
      const text = yearFormulaText()
      expect(text).toContain('TB HK1 × 1')
      expect(text).toContain('TB HK2 × 2')
      expect(text).toContain('/ 3')
      expect(text).toContain('nếu thiếu 1 kỳ')
    })
  })

  // ================================================================
  // ensureStudentTerms
  // ================================================================
  describe('ensureStudentTerms', () => {
    it('should create scoresByTerm if missing', () => {
      const student = { id: 'st-1', hoDem: 'A', ten: 'B' } as any
      const result = ensureStudentTerms(student)
      expect(result.scoresByTerm).toBeDefined()
      expect(result.scoresByTerm.hk1).toBeDefined()
      expect(result.scoresByTerm.hk2).toBeDefined()
    })

    it('should preserve existing scores', () => {
      const student = makeStudent({
        scoresByTerm: {
          hk1: { khaoKinh: [8, 9] } as any,
          hk2: { khaoKinh: [7] } as any
        }
      })
      const result = ensureStudentTerms(student)
      expect((result.scoresByTerm.hk1 as any).khaoKinh).toEqual([8, 9])
      expect((result.scoresByTerm.hk2 as any).khaoKinh).toEqual([7])
    })
  })
})
