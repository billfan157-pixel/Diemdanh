import { describe, it, expect } from 'vitest'
import { buildParishDashboard, buildRankingChartSvg, buildClassificationChartSvg, buildParishReportHtml, buildParishReportCsv } from '../../src/features/parishReport'
import type { ClassData, StudentData } from '../../src/services/storage/StorageAdapter.types'

function makeStudent(id: string, scores: Record<string, number[]>, overrides: Partial<StudentData> = {}): StudentData {
  return {
    id, tenThanh: '', hoDem: 'Nguyễn', ten: `HS${id}`, name: '',
    maHV: '', ngaySinh: '', gioiTinh: '', tenPhuHuynh: '', sdPhuHuynh: '',
    diaChi: '', email: '', ghiChu: '',
    scoresByTerm: {
      hk1: { cc: scores.cc || [], khaoKinh: scores.khaoKinh || [], thuocBai: scores.thuocBai || [], chuyenCan: scores.chuyenCan || [], baiTap: scores.baiTap || [], kiemTra: scores.kiemTra || [] },
      hk2: { cc: scores.cc2 || [], khaoKinh: scores.khaoKinh2 || [], thuocBai: scores.thuocBai2 || [], chuyenCan: scores.chuyenCan2 || [], baiTap: scores.baiTap2 || [], kiemTra: scores.kiemTra2 || [] }
    },
    learningLog: [], createdAt: Date.now(), updatedAt: Date.now(), ...overrides
  }
}

function makeClass(id: string, name: string, year: string, students: StudentData[], weights?: Record<string, number>): ClassData {
  return {
    id, name, year, students,
    weights: weights || { cc: 1, khaoKinh: 1, thuocBai: 1, chuyenCan: 1, baiTap: 1, kiemTra: 1 },
    columns: [
      { key: 'cc', short: 'CC', label: 'Chuyên Cần', defaultWeight: 1 },
      { key: 'khaoKinh', short: 'KK', label: 'Khảo Kinh', defaultWeight: 2 },
      { key: 'thuocBai', short: 'TB', label: 'Thuộc Bài', defaultWeight: 2 },
      { key: 'chuyenCan', short: 'CC', label: 'Chuyên Cần', defaultWeight: 1 },
      { key: 'baiTap', short: 'BT', label: 'Bài Tập', defaultWeight: 1 },
      { key: 'kiemTra', short: 'KT', label: 'Kiểm Tra', defaultWeight: 2 }
    ],
    createdAt: Date.now(), updatedAt: Date.now()
  }
}

describe('parishReport', () => {
  describe('buildParishDashboard', () => {
    it('aggregates all classes when no year filter', () => {
      const s1 = makeStudent('1', { khaoKinh: [8], thuocBai: [8] })
      const s2 = makeStudent('2', { khaoKinh: [6], thuocBai: [6] })
      const cls1 = makeClass('c1', 'Lớp 1', '2025-2026', [s1, s2])
      const cls2 = makeClass('c2', 'Lớp 2', '2026-2027', [s1])
      const result = buildParishDashboard([cls1, cls2], null)
      expect(result.classCount).toBe(2)
      expect(result.studentCount).toBe(3)
      expect(result.rankings).toHaveLength(2)
    })

    it('filters by year', () => {
      const s1 = makeStudent('1', { khaoKinh: [8], thuocBai: [8] })
      const cls1 = makeClass('c1', 'Lớp 1', '2025-2026', [s1])
      const cls2 = makeClass('c2', 'Lớp 2', '2026-2027', [s1])
      const result = buildParishDashboard([cls1, cls2], '2025-2026')
      expect(result.classCount).toBe(1)
      expect(result.year).toBe('2025-2026')
    })

    it('returns empty dashboard for empty classes', () => {
      const result = buildParishDashboard([], null)
      expect(result.classCount).toBe(0)
      expect(result.studentCount).toBe(0)
      expect(result.rankings).toEqual([])
      expect(result.redClasses).toEqual([])
    })

    it('limits topStudents to 20', () => {
      const students = Array.from({ length: 25 }, (_, i) =>
        makeStudent(String(i + 1), { khaoKinh: [9], thuocBai: [9] }, { ten: `HS${i + 1}` })
      )
      const cls = makeClass('c1', 'Lớp 1', '2025-2026', students)
      const result = buildParishDashboard([cls], '2025-2026')
      expect(result.topStudents).toHaveLength(20)
    })

    it('sorts rankings by avgTB descending', () => {
      const s = makeStudent('1', { khaoKinh: [8], thuocBai: [8] })
      const better = makeClass('c1', 'Lớp A', '2025-2026', [
        makeStudent('2', { khaoKinh: [9], thuocBai: [9] })
      ])
      const worse = makeClass('c2', 'Lớp B', '2025-2026', [
        makeStudent('3', { khaoKinh: [5], thuocBai: [5] })
      ])
      const result = buildParishDashboard([worse, better], '2025-2026')
      expect(result.rankings[0].className).toBe('Lớp A')
      expect(result.rankings[1].className).toBe('Lớp B')
    })
  })

  describe('buildRankingChartSvg', () => {
    it('renders bars for each ranking', () => {
      const data = buildParishDashboard([], null)
      const svg = buildRankingChartSvg(data)
      expect(svg).toBe('')
    })

    it('returns SVG with rect and text elements', () => {
      const s1 = makeStudent('1', { khaoKinh: [8], thuocBai: [8] })
      const cls = makeClass('c1', 'Lớp 1', '2025-2026', [s1])
      const data = buildParishDashboard([cls], null)
      const svg = buildRankingChartSvg(data)
      expect(svg).toContain('<svg')
      expect(svg).toContain('<rect')
      expect(svg).toContain('<text')
      expect(svg).toContain('Lớp 1')
    })
  })

  describe('buildClassificationChartSvg', () => {
    it('returns empty string when no scores exist', () => {
      const s1 = makeStudent('1', {})
      const cls = makeClass('c1', 'Lớp 1', '2025-2026', [s1])
      const svg = buildClassificationChartSvg([cls], null)
      expect(svg).toBe('')
    })

    it('renders donut slices for each rank', () => {
      const students = [
        makeStudent('1', { khaoKinh: [9.5], thuocBai: [9.5] }, { ten: 'XS' }),
        makeStudent('2', { khaoKinh: [8.5], thuocBai: [8.5] }, { ten: 'G' }),
        makeStudent('3', { khaoKinh: [7], thuocBai: [7] }, { ten: 'K' }),
        makeStudent('4', { khaoKinh: [5.5], thuocBai: [5.5] }, { ten: 'TB' }),
        makeStudent('5', { khaoKinh: [3], thuocBai: [3] }, { ten: 'Y' })
      ]
      const cls = makeClass('c1', 'Lớp 1', '2025-2026', students)
      const svg = buildClassificationChartSvg([cls], null)
      expect(svg).toContain('<svg')
      expect(svg).toContain('<path')
      expect(svg).toContain('5') // total count
      expect(svg).toContain('XS')
      expect(svg).toContain('Giỏi')
      expect(svg).toContain('Khá')
      expect(svg).toContain('TB')
      expect(svg).toContain('Yếu')
    })
  })

  describe('buildParishReportHtml', () => {
    it('produces a complete HTML document', () => {
      const s1 = makeStudent('1', { khaoKinh: [8], thuocBai: [8] })
      const cls = makeClass('c1', 'Lớp 1', '2025-2026', [s1])
      const data = buildParishDashboard([cls], null)
      const html = buildParishReportHtml(data, [cls], 'Giáo xứ ABC')
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('Giáo xứ ABC')
      expect(html).toContain('Lớp 1')
      expect(html).toContain('<table')
      expect(html).toContain('</html>')
    })

    it('includes fallback text when no data', () => {
      const data = buildParishDashboard([], null)
      const html = buildParishReportHtml(data, [])
      expect(html).toContain('Chưa có dữ liệu')
    })

    it('includes top-students section when present', () => {
      const s1 = makeStudent('1', { khaoKinh: [9], thuocBai: [9] })
      const cls = makeClass('c1', 'Lớp 1', '2025-2026', [s1])
      const data = buildParishDashboard([cls], null)
      const html = buildParishReportHtml(data, [cls])
      expect(html).toContain('Top học viên xuất sắc')
    })
  })

  describe('buildParishReportCsv', () => {
    it('produces CSV with BOM header', () => {
      const s1 = makeStudent('1', { khaoKinh: [8], thuocBai: [8] })
      const cls = makeClass('c1', 'Lớp 1', '2025-2026', [s1])
      const data = buildParishDashboard([cls], null)
      const csv = buildParishReportCsv(data)
      expect(csv.startsWith('\uFEFF')).toBe(true)
      expect(csv).toContain('Lớp')
      expect(csv).toContain('Lớp 1')
    })

    it('includes top-students section when present', () => {
      const s1 = makeStudent('1', { khaoKinh: [9], thuocBai: [9] }, { ten: 'An' })
      const cls = makeClass('c1', 'Lớp 1', '2025-2026', [s1])
      const data = buildParishDashboard([cls], null)
      const csv = buildParishReportCsv(data)
      expect(csv).toContain('Top học viên xuất sắc')
      expect(csv).toContain('An')
    })
  })
})
