import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  buildProgressionChartSvg,
  buildParentReportCardHtml,
  parentReportUrl,
  parseParentTokenFromHash
} from '../../src/features/parentReport'
import type { ClassData, StudentData, ParentToken } from '../../src/services/storage/StorageAdapter.types'

function makeClass(overrides: Partial<ClassData> = {}): ClassData {
  return {
    id: 'cls-1', name: 'Lớp 1', year: '2025-2026',
    columns: [
      { key: 'khaoKinh', short: 'KK', label: 'Khảo Kinh', defaultWeight: 1 },
      { key: 'thuocBai', short: 'TB', label: 'Thuộc Bài', defaultWeight: 1 },
      { key: 'chuyenCan', short: 'CC', label: 'Chuyên Cần', defaultWeight: 1 }
    ],
    weights: { khaoKinh: 1, thuocBai: 1, chuyenCan: 1 },
    students: [], createdAt: 100, updatedAt: 100, ...overrides
  }
}

function makeStudent(overrides: Partial<StudentData> = {}): StudentData {
  return {
    id: 'st-1', tenThanh: 'Anna', hoDem: 'Nguyễn', ten: 'An', name: '',
    maHV: 'HV001', ngaySinh: '2010-01-01', gioiTinh: 'Nữ',
    tenPhuHuynh: 'Nguyễn Văn B', sdPhuHuynh: '0912345678',
    diaChi: '123 Đường ABC', email: '', ghiChu: '',
    scoresByTerm: {
      hk1: { khaoKinh: [8, 9], thuocBai: [7], chuyenCan: [9, 10] },
      hk2: { khaoKinh: [9], thuocBai: [8, 8], chuyenCan: [10] }
    },
    learningLog: [], createdAt: 200, updatedAt: 200, ...overrides
  }
}

function makeToken(overrides: Partial<ParentToken> = {}): ParentToken {
  return {
    id: 'tok-1', classId: 'cls-1', studentId: 'st-1',
    token: 'abc123', expiresAt: Date.now() + 86400000,
    createdBy: 'admin', createdAt: Date.now(), ...overrides
  }
}

describe('escapeHtml (tested through buildParentReportCardHtml)', () => {
  it('should escape & < > " in class name and student name', () => {
    const cls = makeClass({ name: '<script>alert(1)</script>' })
    const st = makeStudent({ ten: 'An & Bình' })
    const tok = makeToken()
    const html = buildParentReportCardHtml(cls, st, tok)
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('An &amp; Bình')
  })
})

describe('buildProgressionChartSvg', () => {
  it('should return SVG string with grid and points', () => {
    const cls = makeClass()
    const st = makeStudent()
    const svg = buildProgressionChartSvg(cls, st)
    expect(svg).toContain('<svg')
    expect(svg).toContain('progression-svg')
    expect(svg).toContain('KK')
    expect(svg).toContain('TB')
    expect(svg).toContain('CC')
    expect(svg).toContain('#2563eb')
    expect(svg).toContain('#10b981')
  })

  it('should generate SVG with default columns when class has no columns', () => {
    const cls = makeClass({ columns: [] })
    const st = makeStudent()
    const svg = buildProgressionChartSvg(cls, st)
    expect(svg).toContain('<svg')
    expect(svg).toContain('KK')
    expect(svg).toContain('TB')
  })

  it('should handle single column', () => {
    const cls = makeClass({ columns: [{ key: 'khaoKinh', short: 'KK', label: 'KK', defaultWeight: 1 }] })
    const st = makeStudent()
    const svg = buildProgressionChartSvg(cls, st)
    expect(svg).toContain('<svg')
  })

  it('should handle student with no scores', () => {
    const cls = makeClass()
    const st = makeStudent({ scoresByTerm: { hk1: {}, hk2: {} } })
    const svg = buildProgressionChartSvg(cls, st)
    expect(svg).toContain('<svg')
  })

  it('should handle student with empty scores arrays', () => {
    const cls = makeClass()
    const st = makeStudent({ scoresByTerm: { hk1: { khaoKinh: [], thuocBai: [], chuyenCan: [] }, hk2: { khaoKinh: [], thuocBai: [], chuyenCan: [] } } })
    const svg = buildProgressionChartSvg(cls, st)
    expect(svg).toContain('<svg')
  })
})

describe('buildParentReportCardHtml', () => {
  it('should generate full report card HTML', () => {
    const cls = makeClass()
    const st = makeStudent()
    const tok = makeToken()
    const html = buildParentReportCardHtml(cls, st, tok)
    expect(html).toContain('parent-report-card')
    expect(html).toContain('Anna')
    expect(html).toContain('Nguyễn An')
    expect(html).toContain('Lớp 1')
    expect(html).toContain('2025-2026')
    expect(html).toContain('Học Kỳ 1')
    expect(html).toContain('Học Kỳ 2')
    expect(html).toContain('Cả Năm')
    expect(html).toContain('Tiến trình học tập')
    expect(html).toContain('Điểm số chi tiết')
    expect(html).toContain('progression-svg')
    expect(html).toContain('GIÁO XỨ')
    expect(html).toContain('hết hạn')
  })

  it('should handle student without tenThanh', () => {
    const cls = makeClass()
    const st = makeStudent({ tenThanh: '', hoDem: 'Trần', ten: 'Bình' })
    const tok = makeToken()
    const html = buildParentReportCardHtml(cls, st, tok)
    expect(html).not.toContain('se-ten-thanh')
    expect(html).toContain('Trần Bình')
  })

  it('should use name field when hoDem/ten are empty and name is set', () => {
    const cls = makeClass()
    const st = makeStudent({ tenThanh: '', hoDem: '', ten: '', name: 'Nguyễn Văn C' })
    const tok = makeToken()
    const html = buildParentReportCardHtml(cls, st, tok)
    expect(html).toContain('Nguyễn Văn C')
  })

  it('should show rank label', () => {
    const cls = makeClass()
    const st = makeStudent()
    const tok = makeToken()
    const html = buildParentReportCardHtml(cls, st, tok)
    expect(html).toContain('rank-lbl')
  })

  it('should show score table rows for each column', () => {
    const cls = makeClass()
    const st = makeStudent()
    const tok = makeToken()
    const html = buildParentReportCardHtml(cls, st, tok)
    expect(html).toContain('Khảo Kinh')
    expect(html).toContain('Thuộc Bài')
    expect(html).toContain('Chuyên Cần')
    expect(html).toContain('score-cell')
  })

  it('should format expiry date', () => {
    const cls = makeClass()
    const st = makeStudent()
    const future = new Date('2026-12-31T12:00:00').getTime()
    const tok = makeToken({ expiresAt: future })
    const html = buildParentReportCardHtml(cls, st, tok)
    expect(html).toContain('2026')
  })

  it('should always show chart section (resolveClassColumns provides defaults)', () => {
    const cls = makeClass({ columns: [] })
    const st = makeStudent()
    const tok = makeToken()
    const html = buildParentReportCardHtml(cls, st, tok)
    expect(html).toContain('Tiến trình học tập')
    expect(html).toContain('Điểm số chi tiết')
  })
})

describe('parentReportUrl', () => {
  beforeEach(() => {
    ;(globalThis as any).location = { origin: 'https://example.com', pathname: '/app/' } as Location
  })

  it('should generate correct URL with token', () => {
    const url = parentReportUrl('tok-xyz')
    expect(url).toBe('https://example.com/app/#/ph/tok-xyz')
  })

  it('should encode special characters in token', () => {
    const url = parentReportUrl('tok with spaces+/')
    expect(url).toContain(encodeURIComponent('tok with spaces+/'))
  })
})

describe('parseParentTokenFromHash', () => {
  it('should parse token from hash', () => {
    const token = parseParentTokenFromHash('#/ph/abc123')
    expect(token).toBe('abc123')
  })

  it('should return null for non-matching hash', () => {
    expect(parseParentTokenFromHash('#/other')).toBeNull()
    expect(parseParentTokenFromHash('')).toBeNull()
  })

  it('should decode encoded token', () => {
    const token = parseParentTokenFromHash('#/ph/tok%20test')
    expect(token).toBe('tok test')
  })
})
