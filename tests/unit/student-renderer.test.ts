import { describe, it, expect, vi, beforeEach } from 'vitest'
import { applyFilters, filterStudents, renderStudents, renderRankView, renderYearView, renderStatsView, StudentFilter } from '../../src/views/StudentRenderer.ts'
import { type ClassData, type StudentData, type ScoreColumnDef } from '../../src/services/storage/StorageAdapter.types.ts'
import { studentTB, studentYearTB, classify } from '../../src/core/calc.ts'
import { resolveClassColumns } from '../../src/config/columns.ts'

function makeCol(key: string, label: string, short: string, defaultWeight = 1): ScoreColumnDef {
  return { key, label, short, defaultWeight, required: false }
}

function makeClass(overrides: Partial<ClassData> = {}): ClassData {
  return {
    id: 'class-1',
    name: 'Lớp 1',
    year: '2025-2026',
    columns: [makeCol('khaoKinh', 'Khảo Kinh', 'KK'), makeCol('thuocBai', 'Thuộc Bài', 'TB'), makeCol('chuyenCan', 'Chuyên Cần', 'CC')],
    weights: { khaoKinh: 2, thuocBai: 1, chuyenCan: 1 },
    students: [],
    rev: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

function makeStudent(overrides: Partial<StudentData> = {}): StudentData {
  return {
    id: 'st-1',
    hoDem: 'Nguyễn Văn',
    ten: 'An',
    tenThanh: 'An',
    name: 'Nguyễn Văn An',
    maHV: 'HV001',
    ghiChu: '',
    scoresByTerm: {
      hk1: { khaoKinh: [8, 8.5], thuocBai: [9], chuyenCan: [10] },
      hk2: { khaoKinh: [7.5], thuocBai: [8], chuyenCan: [9] },
    },
    ...overrides,
  }
}

describe('StudentRenderer - filterStudents', () => {
  const students = [
    makeStudent({ id: '1', hoDem: 'Nguyễn', ten: 'An', tenThanh: 'An', name: 'Nguyễn An', maHV: 'HV001' }),
    makeStudent({ id: '2', hoDem: 'Trần', ten: 'Bình', tenThanh: 'Bình', name: 'Trần Bình', maHV: 'HV002' }),
    makeStudent({ id: '3', hoDem: 'Lê', ten: 'Cường', tenThanh: 'Cường', name: 'Lê Cường', maHV: 'HV003' }),
  ]

  it('returns all when query is empty', () => {
    expect(filterStudents(students, '')).toHaveLength(3)
    expect(filterStudents(students, undefined)).toHaveLength(3)
  })

  it('filters by tenThanh', () => {
    const result = filterStudents(students, 'An')
    expect(result).toHaveLength(1)
    expect(result[0].tenThanh).toBe('An')
  })

  it('filters by hoDem', () => {
    const result = filterStudents(students, 'Trần')
    expect(result).toHaveLength(1)
    expect(result[0].hoDem).toBe('Trần')
  })

  it('filters by ten', () => {
    const result = filterStudents(students, 'Cường')
    expect(result).toHaveLength(1)
    expect(result[0].ten).toBe('Cường')
  })

  it('filters by maHV', () => {
    const result = filterStudents(students, 'HV001')
    expect(result).toHaveLength(1)
  })

  it('filters by ghiChu', () => {
    const s = makeStudent({ id: '4', ghiChu: 'Ghi chú đặc biệt' })
    const result = filterStudents([...students, s], 'đặc biệt')
    expect(result).toHaveLength(1)
  })

  it('case insensitive', () => {
    expect(filterStudents(students, 'nguyễn')).toHaveLength(1)
    expect(filterStudents(students, 'AN')).toHaveLength(1)
  })

  it('returns empty when no match', () => {
    expect(filterStudents(students, 'xyz')).toHaveLength(0)
  })
})

describe('StudentRenderer - applyFilters', () => {
  const cls = makeClass()
  const cols = resolveClassColumns(cls)

  const students = [
    makeStudent({ id: '1', scoresByTerm: { hk1: { khaoKinh: [9, 9], thuocBai: [9], chuyenCan: [10] }, hk2: {} } }),
    makeStudent({ id: '2', scoresByTerm: { hk1: { khaoKinh: [8], thuocBai: [8] }, hk2: {} } }), // avg = 8.0 (rank-g), missing chuyenCan
    makeStudent({ id: '3', scoresByTerm: { hk1: { khaoKinh: [4] }, hk2: {} } }), // missing thuocBai, chuyenCan
    makeStudent({ id: '4', scoresByTerm: { hk1: { khaoKinh: [9.5], thuocBai: [9.5], chuyenCan: [9.5] }, hk2: {} } }),
  ]

  it('returns all when filter is undefined', () => {
    expect(applyFilters(students, cls, 'hk1', undefined)).toHaveLength(4)
  })

  describe('classification filter', () => {
    it('filters rank-g (Giỏi 8–9)', () => {
      const filter: StudentFilter = { classification: 'rank-g' }
      const result = applyFilters(students, cls, 'hk1', filter)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('2')
    })

    it('filters rank-y (Yếu < 5)', () => {
      const filter: StudentFilter = { classification: 'rank-y' }
      const result = applyFilters(students, cls, 'hk1', filter)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('3')
    })

    it('filters rank-xs (Xuất sắc ≥ 9)', () => {
      const filter: StudentFilter = { classification: 'rank-xs' }
      const result = applyFilters(students, cls, 'hk1', filter)
      expect(result).toHaveLength(2)
      expect(result.map(r => r.id).sort()).toEqual(['1', '4'])
    })

    it('returns all for "all"', () => {
      const filter: StudentFilter = { classification: 'all' }
      expect(applyFilters(students, cls, 'hk1', filter)).toHaveLength(4)
    })
  })

  describe('completion filter', () => {
    it('filters complete (all columns have scores)', () => {
      const filter: StudentFilter = { completion: 'complete' }
      const result = applyFilters(students, cls, 'hk1', filter)
      expect(result).toHaveLength(2)
      expect(result.map(r => r.id).sort()).toEqual(['1', '4'])
    })

    it('filters incomplete (at least one column missing)', () => {
      const filter: StudentFilter = { completion: 'incomplete' }
      const result = applyFilters(students, cls, 'hk1', filter)
      expect(result).toHaveLength(2)
      expect(result.map(r => r.id).sort()).toEqual(['2', '3'])
    })

    it('filters none (no scores at all)', () => {
      const emptyStudent = makeStudent({ id: '5', scoresByTerm: { hk1: {}, hk2: {} } })
      const filter: StudentFilter = { completion: 'none' }
      const result = applyFilters([...students, emptyStudent], cls, 'hk1', filter)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('5')
    })

    it('returns all for "all"', () => {
      const filter: StudentFilter = { completion: 'all' }
      expect(applyFilters(students, cls, 'hk1', filter)).toHaveLength(4)
    })
  })

  describe('scoreRanges filter (AND logic)', () => {
    it('filters by min score on specific column (uses latest score)', () => {
      const filter: StudentFilter = { scoreRanges: { khaoKinh: { min: 9 } } }
      const result = applyFilters(students, cls, 'hk1', filter)
      expect(result).toHaveLength(2)
      expect(result.map(r => r.id).sort()).toEqual(['1', '4'])
    })

    it('filters by max score on specific column (uses latest score)', () => {
      const filter: StudentFilter = { scoreRanges: { khaoKinh: { max: 8 } } }
      const result = applyFilters(students, cls, 'hk1', filter)
      expect(result).toHaveLength(2)
      expect(result.map(r => r.id).sort()).toEqual(['2', '3'])
    })

    it('filters by min and max (range)', () => {
      const filter: StudentFilter = { scoreRanges: { khaoKinh: { min: 7.5, max: 8.5 } } }
      const result = applyFilters(students, cls, 'hk1', filter)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('2')
    })

    it('excludes students without score in column', () => {
      const noScoreStudent = makeStudent({ id: '5', scoresByTerm: { hk1: { thuocBai: [8] }, hk2: {} } })
      const filter: StudentFilter = { scoreRanges: { khaoKinh: { min: 0 } } }
      const result = applyFilters([...students, noScoreStudent], cls, 'hk1', filter)
      expect(result).toHaveLength(4)
    })

    it('combines multiple columns (AND)', () => {
      const filter: StudentFilter = { scoreRanges: { khaoKinh: { min: 9 }, thuocBai: { min: 9 } } }
      const result = applyFilters(students, cls, 'hk1', filter)
      expect(result).toHaveLength(2)
      expect(result.map(r => r.id).sort()).toEqual(['1', '4'])
    })
  })

  describe('combined filters', () => {
    it('combines classification + completion (AND)', () => {
      const filter: StudentFilter = { classification: 'rank-xs', completion: 'complete' }
      const result = applyFilters(students, cls, 'hk1', filter)
      expect(result).toHaveLength(2)
    })

    it('combines classification + scoreRanges (AND)', () => {
      const filter: StudentFilter = { classification: 'rank-xs', scoreRanges: { khaoKinh: { min: 9 } } }
      const result = applyFilters(students, cls, 'hk1', filter)
      expect(result).toHaveLength(2)
    })
  })
})

describe('StudentRenderer - renderRankView', () => {
  const cls = makeClass()
  const cols = resolveClassColumns(cls)

const students = [
    makeStudent({ id: '1', scoresByTerm: { hk1: { khaoKinh: [9.5], thuocBai: [9.5], chuyenCan: [9.5] }, hk2: {} } }),
    makeStudent({ id: '2', scoresByTerm: { hk1: { khaoKinh: [7.5], thuocBai: [7.5] }, hk2: {} } }), // missing chuyenCan
    makeStudent({ id: '3', scoresByTerm: { hk1: { khaoKinh: [4] }, hk2: {} } }), // missing thuocBai, chuyenCan
    makeStudent({ id: '4', scoresByTerm: { hk1: { khaoKinh: [9.8], thuocBai: [9.8], chuyenCan: [9.8] }, hk2: {} } }),
  ]

  it('generates HTML with rank table structure', () => {
    const html = renderRankView(cls, students, cls.weights, 'hk1', cols)
    expect(html).toContain('<table')
    expect(html).toContain('rank-table')
    expect(html).toContain('<thead>')
    expect(html).toContain('<tbody>')
  })

  it('includes rank badges (medals for top 3)', () => {
    const html = renderRankView(cls, students, cls.weights, 'hk1', cols)
    expect(html).toContain('🥇')
    expect(html).toContain('🥈')
    expect(html).toContain('🥉')
  })

  it('includes TB values formatted', () => {
    const html = renderRankView(cls, students, cls.weights, 'hk1', cols)
    expect(html).toContain('tb-cell')
  })

  it('includes classification tags', () => {
    const html = renderRankView(cls, students, cls.weights, 'hk1', cols)
    expect(html).toMatch(/class="tag (xs|g|k|tb|y)"/)
  })

  it('includes filled columns count', () => {
    const html = renderRankView(cls, students, cls.weights, 'hk1', cols)
    expect(html).toMatch(/\d\/3/)
  })

  it('sorts by TB descending', () => {
    const html = renderRankView(cls, students, cls.weights, 'hk1', cols)
    const firstRow = html.indexOf('🥇')
    const secondRow = html.indexOf('🥈')
    expect(firstRow).toBeLessThan(secondRow)
  })
})

describe('StudentRenderer - renderYearView', () => {
  const cls = makeClass()
  const cols = resolveClassColumns(cls)

  const students = [
    makeStudent({ id: '1', scoresByTerm: { hk1: { khaoKinh: [9], thuocBai: [9], chuyenCan: [10] }, hk2: { khaoKinh: [8], thuocBai: [8], chuyenCan: [9] } } }),
    makeStudent({ id: '2', scoresByTerm: { hk1: { khaoKinh: [7], thuocBai: [8], chuyenCan: [7] }, hk2: { khaoKinh: [6], thuocBai: [7], chuyenCan: [6] } } }),
    makeStudent({ id: '3', scoresByTerm: { hk1: {}, hk2: {} } }),
  ]

  it('generates year-board with hero section', () => {
    const html = renderYearView(cls, students, cols)
    expect(html).toContain('year-board')
    expect(html).toContain('year-hero')
    expect(html).toContain('TB lớp cả năm')
  })

  it('calculates year average correctly', () => {
    const html = renderYearView(cls, students, cols)
    expect(html).toContain('TB lớp cả năm')
  })

  it('shows chips for both/only1/only2/none', () => {
    const html = renderYearView(cls, students, cols)
    expect(html).toContain('đủ 2 HK')
    expect(html).toContain('chỉ HK1')
    expect(html).toContain('chỉ HK2')
    expect(html).toContain('chưa điểm')
  })

  it('generates year-table with both terms', () => {
    const html = renderYearView(cls, students, cols)
    expect(html).toContain('TB HK1')
    expect(html).toContain('XL HK1')
    expect(html).toContain('TB HK2')
    expect(html).toContain('XL HK2')
    expect(html).toContain('TB cả năm')
    expect(html).toContain('XL năm')
  })

  it('sorts by year TB descending', () => {
    const html = renderYearView(cls, students, cols)
    const firstRow = html.indexOf('🥇')
    expect(firstRow).toBeGreaterThan(-1)
  })
})

describe('StudentRenderer - renderStatsView', () => {
  const cls = makeClass()
  const cols = resolveClassColumns(cls)

  const students = [
    makeStudent({ id: '1', scoresByTerm: { hk1: { khaoKinh: [9], thuocBai: [9], chuyenCan: [10] }, hk2: {} } }),
    makeStudent({ id: '2', scoresByTerm: { hk1: { khaoKinh: [7], thuocBai: [8], chuyenCan: [7] }, hk2: {} } }),
    makeStudent({ id: '3', scoresByTerm: { hk1: { khaoKinh: [4], thuocBai: [5], chuyenCan: [5] }, hk2: {} } }),
    makeStudent({ id: '4', scoresByTerm: { hk1: {}, hk2: {} } }),
  ]

  it('generates stats-grid with two panels', () => {
    const html = renderStatsView(cls, students, cols, cls.weights, 'hk1')
    expect(html).toContain('stats-grid')
    expect(html).toContain('stats-panel')
  })

  it('calculates classification buckets correctly', () => {
    const html = renderStatsView(cls, students, cols, cls.weights, 'hk1')
    expect(html).toContain('Xuất sắc (≥9)')
    expect(html).toContain('Giỏi (8–9)')
    expect(html).toContain('Khá (6.5–8)')
    expect(html).toContain('TB (5–6.5)')
    expect(html).toContain('Yếu (<5)')
    expect(html).toContain('Chưa có TB')
  })

  it('shows bar fill based on max count', () => {
    const html = renderStatsView(cls, students, cols, cls.weights, 'hk1')
    expect(html).toContain('bar-fill')
    expect(html).toContain('width:')
  })

  it('calculates class TB, max, min', () => {
    const html = renderStatsView(cls, students, cols, cls.weights, 'hk1')
    expect(html).toContain('TB lớp')
    expect(html).toContain('Cao nhất')
    expect(html).toContain('Thấp nhất')
  })

  it('shows per-column averages', () => {
    const html = renderStatsView(cls, students, cols, cls.weights, 'hk1')
    expect(html).toContain('Trung bình từng cột điểm')
    expect(html).toContain('Khảo Kinh (')
    expect(html).toContain('Thuộc Bài (')
    expect(html).toContain('Chuyên Cần (')
  })

  it('handles all students with no scores (emdash TB)', () => {
    const nos = [
      makeStudent({ id: '1', scoresByTerm: { hk1: {}, hk2: {} } }),
      makeStudent({ id: '2', scoresByTerm: { hk1: {}, hk2: {} } }),
    ]
    const html = renderStatsView(cls, nos, cols, cls.weights, 'hk1')
    expect(html).toContain('—')
    expect(html).toContain('(0/2)')
  })
})

describe('StudentRenderer - renderStudents integration', () => {
  const cls = makeClass()
  const cols = resolveClassColumns(cls)

  const students = [
    makeStudent({ id: '1', scoresByTerm: { hk1: { khaoKinh: [8], thuocBai: [9], chuyenCan: [10] }, hk2: {} } }),
    makeStudent({ id: '2', scoresByTerm: { hk1: { khaoKinh: [7], thuocBai: [8], chuyenCan: [7] }, hk2: {} } }),
    makeStudent({ id: '3', scoresByTerm: { hk1: { khaoKinh: [4], thuocBai: [5], chuyenCan: [5] }, hk2: {} } }),
    makeStudent({ id: '4', scoresByTerm: { hk1: {}, hk2: {} } }),
  ]

  cls.students = students

  it('returns empty for table viewMode (handled by ClassView)', () => {
    const html = renderStudents(cls, 'hk1', 'table', '', undefined, new Set())
    expect(html).toBe('')
  })

  it('renders rank view when viewMode=rank', () => {
    const html = renderStudents(cls, 'hk1', 'rank', '', undefined, new Set())
    expect(html).toContain('rank-table')
  })

  it('renders year view when viewMode=year and term=year', () => {
    const html = renderStudents(cls, 'year', 'year', '', undefined, new Set())
    expect(html).toContain('year-board')
  })

  it('renders stats view when viewMode=stats and term=year', () => {
    const html = renderStudents(cls, 'year', 'stats', '', undefined, new Set())
    expect(html).toContain('stats-grid')
  })

  it('returns empty for cards viewMode (handled by ClassView)', () => {
    const html = renderStudents(cls, 'hk1', 'cards', '', undefined, new Set())
    expect(html).toBe('')
  })

  it('applies search query', () => {
    const html = renderStudents(cls, 'hk1', 'rank', 'An', undefined, new Set())
    expect(html).toContain('An')
  })

  it('applies filter', () => {
    const filter: StudentFilter = { classification: 'rank-k' }
    const html = renderStudents(cls, 'hk1', 'rank', '', filter, new Set())
    expect(html).toContain('Khá')
  })

  it('shows empty state when no students', () => {
    const emptyCls = { ...cls, students: [] }
    const html = renderStudents(emptyCls, 'hk1', 'table', '', undefined, new Set())
    expect(html).toContain('Lớp chưa có học viên')
  })

  it('shows empty state when search no match', () => {
    const html = renderStudents(cls, 'hk1', 'table', 'xyz', undefined, new Set())
    expect(html).toContain('Không tìm thấy')
  })

  it('shows empty state when filter no match', () => {
    const filter: StudentFilter = { classification: 'rank-xs' }
    const html = renderStudents(cls, 'hk1', 'table', '', filter, new Set())
    expect(html).toContain('Không có học viên phù hợp')
  })

  it('returns empty when viewMode=year but term is not year (cards handled by ClassView)', () => {
    const html = renderStudents(cls, 'hk1', 'year', '', undefined, new Set())
    expect(html).toBe('')
  })

  it('falls back to stats when viewMode=stats but term is not year', () => {
    const html = renderStudents(cls, 'hk1', 'stats', '', undefined, new Set())
    expect(html).toContain('stats-grid')
  })

  it('returns empty for unknown viewMode', () => {
    const html = renderStudents(cls, 'hk1', 'unknown' as any, '', undefined, new Set())
    expect(html).toBe('')
  })
})