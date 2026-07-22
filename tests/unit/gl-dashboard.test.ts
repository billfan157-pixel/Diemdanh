import { html, fixture, expect } from '@open-wc/testing'
import { vi } from 'vitest'
import '../../src/ui/views/gl-dashboard'
import type { GlDashboard } from '../../src/ui/views/gl-dashboard'

function mockStateManager(overrides: Record<string, any> = {}) {
  return {
    getAllClasses: vi.fn().mockReturnValue([]),
    getState: vi.fn().mockReturnValue({ yearFilter: null, activeTerm: 'hk1' }),
    getVisibleClasses: vi.fn().mockReturnValue([]),
    isYearArchived: vi.fn().mockReturnValue(false),
    ...overrides,
  }
}

function mockAuthManager(overrides: Record<string, any> = {}) {
  return {
    isAdmin: vi.fn().mockReturnValue(false),
    ...overrides,
  }
}

describe('GlDashboard', () => {
  it('renders empty when no stateManager', async () => {
    const el = await fixture<GlDashboard>(html`<gl-dashboard></gl-dashboard>`)
    expect(el.textContent).to.equal('')
  })

  it('renders empty state when classes are empty (no data yet)', async () => {
    const el = await fixture<GlDashboard>(html`<gl-dashboard active .stateManager=${mockStateManager()}></gl-dashboard>`)
    await el.updateComplete
    expect(el.querySelector('.dash-empty')).to.not.be.null
    expect(el.textContent).to.include('Chưa có lớp học nào')
  })

  it('renders empty state when classes array is empty', async () => {
    const el = await fixture<GlDashboard>(html`<gl-dashboard active .stateManager=${mockStateManager()}></gl-dashboard>`)
    await el.updateComplete
    const emptyIcon = el.querySelector('.empty-icon')
    expect(emptyIcon).to.not.be.null
  })

  it('renders KPI cards when classes exist', async () => {
    const classes = [{
      id: 'cls-1', name: 'Lớp 1A', year: '2025-2026',
      columns: [{ key: 'khaoKinh', short: 'KK', label: 'Khảo Kinh', defaultWeight: 1 }],
      weights: { khaoKinh: 1 },
      students: [{
        id: 'st-1', tenThanh: 'Anna', hoDem: 'Nguyễn', ten: 'An', name: '',
        maHV: '', ngaySinh: '', gioiTinh: '', tenPhuHuynh: '', sdPhuHuynh: '',
        diaChi: '', email: '', ghiChu: '',
        scoresByTerm: { hk1: { khaoKinh: [8, 9] }, hk2: {} },
        learningLog: [], createdAt: 100, updatedAt: 100,
      }],
      createdAt: 100, updatedAt: 100, rev: 1,
    }]
    const sm = mockStateManager({
      getAllClasses: vi.fn().mockReturnValue(classes),
      getVisibleClasses: vi.fn().mockReturnValue(classes),
    })
    const el = await fixture<GlDashboard>(html`<gl-dashboard active .stateManager=${sm}></gl-dashboard>`)
    await el.updateComplete
    const kpiCards = el.querySelectorAll('gl-kpi-card')
    expect(kpiCards.length).to.equal(4)
  })

  it('_hasMissingScores returns true when scores missing', () => {
    const el = document.createElement('gl-dashboard') as GlDashboard
    const student = {
      scoresByTerm: {
        hk1: { khaoKinh: [] },
        hk2: {},
      },
    }
    const sm = mockStateManager({
      getState: vi.fn().mockReturnValue({ yearFilter: null, activeTerm: 'hk1' }),
    })
    el.stateManager = sm as any
    const result = (el as any)._hasMissingScores(student)
    expect(result).to.be.true
  })

  it('_hasMissingScores returns false when all scores present', () => {
    const el = document.createElement('gl-dashboard') as GlDashboard
    const student = {
      scoresByTerm: {
        hk1: { khaoKinh: [8, 9], thuocBai: [7], chuyenCan: [9] },
        hk2: {},
      },
      columns: [
        { key: 'khaoKinh', short: 'KK', label: 'Khảo Kinh', defaultWeight: 1 },
        { key: 'thuocBai', short: 'TB', label: 'Thuộc Bài', defaultWeight: 1 },
        { key: 'chuyenCan', short: 'CC', label: 'Chuyên Cần', defaultWeight: 1 },
      ],
    }
    const sm = mockStateManager({
      getState: vi.fn().mockReturnValue({ yearFilter: null, activeTerm: 'hk1' }),
    })
    el.stateManager = sm as any
    const result = (el as any)._hasMissingScores(student)
    expect(result).to.be.false
  })

  it('_checkMissingScores dispatches gl:missing-scores when missing found', () => {
    const el = document.createElement('gl-dashboard') as GlDashboard
    const student = {
      id: 'st-1', className: 'Lớp 1A',
      scoresByTerm: { hk1: { khaoKinh: [] }, hk2: {} },
      columns: [{ key: 'khaoKinh', short: 'KK', label: 'Khảo Kinh', defaultWeight: 1 }],
    }
    const sm = mockStateManager({
      getState: vi.fn().mockReturnValue({ yearFilter: null, activeTerm: 'hk1' }),
    })
    el.stateManager = sm as any
    ;(el as any)._enrichedStudents = [student]

    const events: any[] = []
    window.addEventListener('gl:missing-scores', (e: Event) => events.push((e as CustomEvent).detail))

    ;(el as any)._checkMissingScores()
    expect(events.length).to.equal(1)
    expect(events[0].count).to.equal(1)
    expect(events[0].classes).to.deep.equal(['Lớp 1A'])
  })

  it('_escapeHtml escapes special characters', () => {
    const el = document.createElement('gl-dashboard') as GlDashboard
    const escaped = (el as any)._escapeHtml('<script>alert("x")</script>')
    expect(escaped).to.equal('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;')
  })

  it('dispatch methods fire CustomEvents', () => {
    const el = document.createElement('gl-dashboard') as GlDashboard
    const events: string[] = []
    el.addEventListener('dash-select-class', () => events.push('select'))
    el.addEventListener('dash-scroll-to-student', () => events.push('scroll'))
    el.addEventListener('dash-export-report', () => events.push('export'))

    ;(el as any)._dispatchSelectClass('cls-1')
    expect(events).to.deep.equal(['select'])

    ;(el as any)._dispatchScrollToStudent('cls-1', 'st-1')
    expect(events).to.deep.equal(['select', 'scroll'])

    ;(el as any)._onExportReport()
    expect(events).to.deep.equal(['select', 'scroll', 'export'])
  })
})
