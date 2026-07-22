import { describe, it, expect } from 'vitest'
import { summarizeClass, summarizeYear, compareYears, topStudentsAcrossClasses } from '../../src/features/years.ts'
import { ClassData, StudentData } from '../../src/services/storage/StorageAdapter.types'

function makeStudent(id: string, scores: Record<string, number[]>, overrides: Partial<StudentData> = {}): StudentData {
  return {
    id,
    tenThanh: '',
    hoDem: 'Nguyễn',
    ten: `HS${id}`,
    name: '',
    maHV: '',
    ngaySinh: '',
    gioiTinh: '',
    tenPhuHuynh: '',
    sdPhuHuynh: '',
    diaChi: '',
    email: '',
    ghiChu: '',
    scoresByTerm: {
      hk1: { cc: scores.cc || [], khaoKinh: scores.khaoKinh || [], thuocBai: scores.thuocBai || [], chuyenCan: scores.chuyenCan || [], baiTap: scores.baiTap || [], kiemTra: scores.kiemTra || [] },
      hk2: { cc: scores.cc2 || [], khaoKinh: scores.khaoKinh2 || [], thuocBai: scores.thuocBai2 || [], chuyenCan: scores.chuyenCan2 || [], baiTap: scores.baiTap2 || [], kiemTra: scores.kiemTra2 || [] }
    },
    learningLog: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides
  }
}

function makeClass(id: string, name: string, year: string, students: StudentData[], weights?: Record<string, number>): ClassData {
  return {
    id,
    name,
    year,
    students,
    weights: weights || { cc: 1, khaoKinh: 1, thuocBai: 1, chuyenCan: 1, baiTap: 1, kiemTra: 1 },
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}

describe('years', () => {

  describe('summarizeClass', () => {
    it('should compute average TB', () => {
      const s1 = makeStudent('1', { khaoKinh: [8], thuocBai: [8] }, { ten: 'An' })
      const s2 = makeStudent('2', { khaoKinh: [6], thuocBai: [6] }, { ten: 'Binh' })
      const cls = makeClass('c1', 'Lớp 1', '2025-2026', [s1, s2])
      const result = summarizeClass(cls)
      expect(result.className).toBe('Lớp 1')
      expect(result.studentCount).toBe(2)
      expect(result.avgTB).toBeGreaterThan(0)
    })

    it('should handle class with no scores', () => {
      const s = makeStudent('1', {})
      const cls = makeClass('c1', 'Lớp 1', '2025-2026', [s])
      const result = summarizeClass(cls)
      expect(result.avgTB).toBeNull()
      expect(result.isRed).toBe(true)
    })

    it('should count rank distribution', () => {
      const s1 = makeStudent('1', { khaoKinh: [9], thuocBai: [9] }, { ten: 'An' })
      const s2 = makeStudent('2', { khaoKinh: [3], thuocBai: [3] }, { ten: 'Binh' })
      const cls = makeClass('c1', 'Lớp 1', '2025-2026', [s1, s2])
      const result = summarizeClass(cls)
      expect(result.rankCounts.xs).toBeGreaterThanOrEqual(0)
    })
  })

  describe('summarizeYear', () => {
    it('should aggregate across classes in the same year', () => {
      const cls1 = makeClass('c1', 'Lớp 1', '2025-2026', [makeStudent('1', { khaoKinh: [8] }, { ten: 'An' })])
      const cls2 = makeClass('c2', 'Lớp 2', '2025-2026', [makeStudent('2', { khaoKinh: [6] }, { ten: 'Binh' })])
      const result = summarizeYear([cls1, cls2], '2025-2026')
      expect(result.classCount).toBe(2)
      expect(result.studentCount).toBe(2)
    })

    it('should return empty summary for missing year', () => {
      const result = summarizeYear([], '2025-2026')
      expect(result.classCount).toBe(0)
      expect(result.studentCount).toBe(0)
      expect(result.avgTB).toBeNull()
    })
  })

  describe('compareYears', () => {
    it('should compare two years', () => {
      const y1 = [makeClass('c1', 'Lớp A', '2025-2026', [makeStudent('1', { khaoKinh: [8] }, { ten: 'An' })])]
      const y2 = [makeClass('c2', 'Lớp B', '2026-2027', [makeStudent('2', { khaoKinh: [9] }, { ten: 'Binh' })])]
      const result = compareYears([...y1, ...y2], '2025-2026', '2026-2027')
      expect(result).toHaveLength(5)
      expect(result[0].metric).toBe('Số lớp')
      expect(result[0].yearA).toBe(1)
      expect(result[0].yearB).toBe(1)
    })
  })

  describe('topStudentsAcrossClasses', () => {
    it('should return top students sorted by TB', () => {
      const s1 = makeStudent('1', { khaoKinh: [9], thuocBai: [9] }, { ten: 'An' })
      const s2 = makeStudent('2', { khaoKinh: [5], thuocBai: [5] }, { ten: 'Binh' })
      const cls = makeClass('c1', 'Lớp 1', '2025-2026', [s1, s2])
      const result = topStudentsAcrossClasses([cls], 1)
      expect(result).toHaveLength(1)
      expect(result[0].yearTB).toBeGreaterThan(6)
    })

    it('should return empty array for no students', () => {
      const result = topStudentsAcrossClasses([])
      expect(result).toEqual([])
    })
  })

})
