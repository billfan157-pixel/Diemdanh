import { LitElement, html } from 'lit'
import type { StateManager } from '../StateManager'
import type { AuthManager } from '../../core/auth/AuthManager'
import type { StudentData, ScoreColumnDef } from '../../services/storage/StorageAdapter.types'
import { displayName, resolveClassColumns } from '../../config/constants'
import { studentYearTB, hasMissingColumnScores } from '../../core/calc'
import { buildParishDashboard } from '../../features/parishReport'
import { summarizeYear } from '../../features/years'
import './components/gl-kpi-card'
import { iconFolder, iconBarChart, iconCheck, iconTrophy, iconHeart, iconThumbsUp, iconClipboard } from './components/gl-icons'

interface ClassRankingData {
  classId: string
  className: string
  avgTB: number | null
  completePercent: number
  isRed: boolean
}

interface DashboardData {
  classCount: number
  studentCount: number
  avgTB: number | null
  completePercent: number
  rankings: ClassRankingData[]
  redClasses: ClassRankingData[]
}

interface EnrichedStudent extends StudentData {
  className: string
  classId: string
  columns: ScoreColumnDef[]
  yearTB: number | null
}

interface YearInfo {
  year: string
  redClasses: number
}

export class GlDashboard extends LitElement {
  static properties = {
    stateManager: { type: Object },
    authManager: { type: Object },
    active: { type: Boolean },
  }

  declare stateManager: StateManager
  declare authManager: AuthManager
  declare active: boolean

  private _yearFilter: string | null = null
  private _data: DashboardData | null = null
  private _enrichedStudents: EnrichedStudent[] = []
  private _yearInfo: YearInfo | null = null
  private _archived = false
  private _lastMissingEvent = ''
  private _actionLoading = false

  constructor() {
    super()
    this.active = false
  }

  createRenderRoot() {
    return this
  }

  willUpdate(changed: Map<string, unknown>) {
    if (changed.has('stateManager') || changed.has('active')) {
      this._computeData()
    }
  }

  private _computeData(): void {
    if (!this.stateManager || !this.active) return

    const classes = this.stateManager.getAllClasses()
    this._yearFilter = this.stateManager.getState().yearFilter
    this._data = buildParishDashboard(classes, this._yearFilter)
    this._archived = this._yearFilter ? this.stateManager.isYearArchived(this._yearFilter) : false
    this._yearInfo = this._yearFilter ? summarizeYear(classes, this._yearFilter) : null

    const visibleClasses = this.stateManager.getVisibleClasses()
    this._enrichedStudents = visibleClasses.flatMap(c => {
      const cols = resolveClassColumns(c)
      return c.students.map(s => ({
        ...s,
        className: c.name,
        classId: c.id,
        columns: cols,
        yearTB: studentYearTB(s, c.weights, cols),
      }))
    })

    this._checkMissingScores()
  }

  private _checkMissingScores(): void {
    const missingStudents = this._enrichedStudents.filter(s => this._hasMissingScores(s))
    if (missingStudents.length > 0) {
      const classNames = [...new Set(missingStudents.map(s => s.className))]
      const eventKey = `${missingStudents.length}:${classNames.join(',')}`
      if (eventKey !== this._lastMissingEvent) {
        this._lastMissingEvent = eventKey
        window.dispatchEvent(new CustomEvent('gl:missing-scores', {
          detail: { count: missingStudents.length, classes: classNames },
        }))
      }
    }
  }

  private _hasMissingScores(student: EnrichedStudent): boolean {
    const term = this.stateManager.getState().activeTerm
    if (term === 'year') {
      return hasMissingColumnScores(student, 'hk1', student.columns) ||
             hasMissingColumnScores(student, 'hk2', student.columns)
    }
    return hasMissingColumnScores(student, term, student.columns)
  }

  render() {
    if (!this.stateManager || !this.active) return html``

    const classes = this.stateManager.getAllClasses()
    if (!classes.length) return this._renderEmptyState()

    if (!this._data) return html`<div class="dashboard">${this._skeletonTemplate()}</div>`

    return html`
      <div class="dashboard">
        ${this._renderHeader()}
        ${this._renderStats()}
        <div class="dashboard-grid">
          <section class="dash-section dash-section--full">
            <h3>🏅 Xếp hạng liên lớp</h3>
            ${this._renderClassRankings()}
          </section>
          <section class="dash-section">
            <h3>🔴 Lớp cần quan tâm</h3>
            ${this._renderRedClasses()}
          </section>
          <section class="dash-section">
            <h3>🏆 Xuất sắc</h3>
            ${this._renderTopStudents()}
          </section>
          <section class="dash-section">
            <h3>📉 Cần quan tâm (HV)</h3>
            ${this._renderAttentionStudents()}
          </section>
          <section class="dash-section">
            <h3>⚠️ Yếu (TB &lt; 5)</h3>
            ${this._renderWeakStudents()}
          </section>
          <section class="dash-section">
            <h3>📋 Thiếu điểm</h3>
            ${this._renderMissingScores()}
          </section>
        </div>
        ${this._yearInfo ? html`<p class="hint mt-3">Năm ${this._escapeHtml(this._yearInfo.year)}: ${this._yearInfo.redClasses} lớp cần quan tâm</p>` : ''}
      </div>
    `
  }

  private _renderEmptyState() {
    const yearFilter = this._yearFilter
    return html`
      <div class="dashboard">
        <div class="dash-header">
          <h2>Tổng quan Ban GL${yearFilter ? html` · ${this._escapeHtml(yearFilter)}` : ''}</h2>
        </div>
        <div class="dash-empty">
          <div class="empty-icon">${iconFolder()}</div>
          <strong>Chưa có lớp học nào</strong>
          <p class="hint" style="margin-top:6px">Tạo lớp mới từ menu bên trái để bắt đầu nhập điểm.</p>
        </div>
      </div>
    `
  }

  private _renderHeader() {
    const yearFilter = this._yearFilter
    const archived = this._archived
    const isAdmin = this.authManager?.isAdmin() ?? false

    return html`
      <div class="dash-header">
        <h2>Tổng quan Ban GL${yearFilter ? html` · ${this._escapeHtml(yearFilter)}` : ''}${archived ? ' · đã lưu trữ' : ''}</h2>
        ${isAdmin ? html`
          <div class="dash-actions">
            <gl-button variant="ghost" size="sm" ?disabled=${this._actionLoading} @click=${this._onExportReport}>📄 Xuất báo cáo</gl-button>
            <gl-button variant="ghost" size="sm" ?disabled=${this._actionLoading} @click=${this._onCompareYears}>📊 So sánh năm</gl-button>
            <gl-button variant="ghost" size="sm" ?disabled=${this._actionLoading} @click=${this._onToggleArchive}>${archived ? 'Mở lại năm' : 'Lưu trữ năm'}</gl-button>
          </div>
        ` : ''}
      </div>
    `
  }

  private _renderStats() {
    const data = this._data
    if (!data) return html``

    return html`
      <div class="dash-stats">
        <gl-kpi-card label="Lớp" value=${String(data.classCount)} icon="🏫" barPercent="100" barColor="var(--color-primary)"></gl-kpi-card>
        <gl-kpi-card label="Học viên" value=${String(data.studentCount)} icon="👥" barPercent="100" barColor="var(--color-purple)"></gl-kpi-card>
        <gl-kpi-card label="TB cả năm" value=${data.avgTB != null ? data.avgTB.toFixed(2) : '—'} icon="📈" barPercent=${data.avgTB != null ? Math.min(data.avgTB * 10, 100) : 0} barColor="var(--color-gold)"></gl-kpi-card>
        <gl-kpi-card label="% đủ điểm" value=${`${data.completePercent}%`} icon="✅" barPercent=${data.completePercent} barColor="var(--color-success)"></gl-kpi-card>
      </div>
    `
  }

  private _renderClassRankings() {
    const rankings = this._data?.rankings
    if (!rankings?.length) return html`<div class="dash-empty"><div class="empty-icon">${iconBarChart()}</div><p class="hint">Chưa có lớp — tạo lớp và nhập điểm để xem xếp hạng.</p></div>`

    const rows = rankings.map((c: ClassRankingData, i: number) => {
      const badge = i === 0
        ? html`<span style="font-size: 1.15rem; filter: drop-shadow(0 2px 4px rgba(234,179,8,0.3));">👑</span>`
        : i === 1
        ? html`<span style="font-size: 1rem;">⭐</span>`
        : i === 2
        ? html`<span style="font-size: 1rem;">🥉</span>`
        : html`<span style="font-weight:700; color:var(--color-text-secondary); opacity:0.7;">${i + 1}</span>`

      return html`
        <tr ?data-red=${c.isRed} style="transition: background var(--duration-fast);">
          <td style="text-align: center; width: 48px; padding: 10px var(--space-2);">${badge}</td>
          <td style="padding: 10px var(--space-2);">
            <gl-button variant="ghost" size="sm" @click=${() => this._dispatchSelectClass(c.classId)} style="font-weight: 750; color: var(--color-primary);">${this._escapeHtml(c.className)}</gl-button>
          </td>
          <td class="text-right" style="padding: 10px var(--space-2); font-weight: 800; font-family: monospace; font-size: 0.95rem; color: var(--color-text);">${c.avgTB != null ? c.avgTB.toFixed(2) : '—'}</td>
          <td class="text-right" style="padding: 10px var(--space-2); width: 140px;">
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px;">
              <span style="font-weight: 700; font-family: monospace; font-size: 0.85rem; color: var(--color-text-secondary);">${c.completePercent}%</span>
              <div style="width: 50px; height: 6px; background: var(--color-border); border-radius: 3px; overflow: hidden; display: inline-block; vertical-align: middle;">
                <div style="width: ${c.completePercent}%; height: 100%; background: ${c.isRed ? 'var(--color-danger)' : 'var(--color-success)'}; border-radius: 3px;"></div>
              </div>
            </div>
          </td>
          <td style="padding: 10px var(--space-2); text-align: center; width: 80px;"><gl-badge variant="${c.isRed ? 'danger' : 'success'}">${c.isRed ? 'Cần chú ý' : 'Hoàn thành'}</gl-badge></td>
        </tr>
      `
    })

    return html`
      <div class="dash-rank-table" style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; min-width: 450px;">
          <thead>
            <tr style="border-bottom: 2px solid var(--color-border);">
              <th scope="col" style="text-align: center; padding: 10px var(--space-2); width: 48px;">Hạng</th>
              <th scope="col" style="text-align: left; padding: 10px var(--space-2);">Lớp học</th>
              <th scope="col" class="text-right" style="padding: 10px var(--space-2); width: 70px;">TB</th>
              <th scope="col" class="text-right" style="padding: 10px var(--space-2); width: 140px;">Hoàn thành</th>
              <th scope="col" style="text-align: center; padding: 10px var(--space-2); width: 100px;">Trạng thái</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `
  }

  private _renderRedClasses() {
    const redClasses = this._data?.redClasses
    if (!redClasses?.length) return html`<div class="dash-empty dash-empty-col p-3"><div class="empty-icon">${iconCheck()}</div><p class="hint m-0">Không có lớp đỏ — tất cả đều tốt.</p></div>`

    return redClasses.map((c: ClassRankingData) => html`
      <div class="dash-student weak" style="display: flex; align-items: center; justify-content: space-between; border-left: 4px solid var(--color-danger); padding: 10px 14px; border-radius: var(--radius-lg); margin-bottom: 8px;">
        <div class="info" style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
          <span style="font-size: 1.3rem;">⚠️</span>
          <div style="flex: 1; min-width: 0;">
            <strong style="font-weight: 750; color: var(--color-danger); text-overflow: ellipsis; overflow: hidden; white-space: nowrap; display: block;">${this._escapeHtml(c.className)}</strong>
            <small style="color: var(--color-text-secondary);">TB: ${c.avgTB != null ? c.avgTB.toFixed(2) : '—'} · Hoàn thành: ${c.completePercent}%</small>
          </div>
        </div>
        <gl-button variant="ghost" size="sm" @click=${() => this._dispatchSelectClass(c.classId)}>Chi tiết</gl-button>
      </div>
    `)
  }

  private _renderTopStudents() {
    const students = this._enrichedStudents
    const limit = 5
    const topStudents = students
      .filter((s: EnrichedStudent) => s.yearTB !== null)
      .sort((a: EnrichedStudent, b: EnrichedStudent) => (b.yearTB || 0) - (a.yearTB || 0))
      .slice(0, limit)

    if (!topStudents.length) return html`<div class="dash-empty dash-empty-col p-3"><div class="empty-icon">${iconTrophy()}</div><p class="hint m-0">Chưa có điểm học kỳ.</p></div>`

    const rankBadges = ['🥇', '🥈', '🥉']

    return topStudents.map((s: EnrichedStudent, i: number) => {
      const isTop3 = i < 3
      return html`
        <div class="dash-student touch-ripple ${isTop3 ? 'top-' + (i + 1) : ''}" @click=${() => this._dispatchScrollToStudent(s.classId, s.id)}>
          ${isTop3
            ? html`<span class="rank" style="font-size: 1.15rem; background: none; box-shadow: none;">${rankBadges[i]}</span>`
            : html`<span class="rank">${i + 1}</span>`
          }
          <div class="info">
            <strong>${this._escapeHtml(displayName(s))}</strong>
            <small>${this._escapeHtml(s.className)}</small>
          </div>
          <span class="tb" style="font-family: monospace; font-weight: 800; font-size: 0.9rem; background: var(--color-gold-soft); color: var(--color-gold); border: 1px solid rgba(180, 83, 9, 0.15); padding: 3px 8px; border-radius: 8px;">
            ${s.yearTB !== null ? s.yearTB.toFixed(2) : '—'}
          </span>
        </div>
      `
    })
  }

  private _renderAttentionStudents() {
    const students = this._enrichedStudents
    const limit = 10
    const attentionStudents = students
      .filter((s: EnrichedStudent) => s.yearTB !== null && s.yearTB >= 5 && s.yearTB < 6.5)
      .sort((a: EnrichedStudent, b: EnrichedStudent) => (a.yearTB || 0) - (b.yearTB || 0))
      .slice(0, limit)

    if (!attentionStudents.length) return html`<div class="dash-empty dash-empty-col p-3"><div class="empty-icon">${iconHeart()}</div><p class="hint m-0">Không có học viên TB trung bình yếu.</p></div>`

    return attentionStudents.map((s: EnrichedStudent) => html`
      <div class="dash-student" @click=${() => this._dispatchScrollToStudent(s.classId, s.id)}>
        <div class="info">
          <strong>${this._escapeHtml(displayName(s))}</strong>
          <small>${this._escapeHtml(s.className)}</small>
        </div>
        <span class="tb" style="font-family: monospace; font-weight: 800; font-size: 0.9rem; background: var(--color-warning-soft); color: var(--color-warning); border: 1px solid rgba(234, 88, 12, 0.15); padding: 3px 8px; border-radius: 8px;">
          ${s.yearTB?.toFixed(2)}
        </span>
      </div>
    `)
  }

  private _renderWeakStudents() {
    const students = this._enrichedStudents
    const limit = 10
    const weakStudents = students
      .filter((s: EnrichedStudent) => s.yearTB !== null && s.yearTB < 5)
      .sort((a: EnrichedStudent, b: EnrichedStudent) => (a.yearTB || 0) - (b.yearTB || 0))
      .slice(0, limit)

    if (!weakStudents.length) return html`<div class="dash-empty dash-empty-col p-3"><div class="empty-icon">${iconThumbsUp()}</div><p class="hint m-0">Không có học viên yếu (TB &lt; 5).</p></div>`

    return weakStudents.map((s: EnrichedStudent) => html`
      <div class="dash-student weak" style="border-left: 3px solid var(--color-danger);" @click=${() => this._dispatchScrollToStudent(s.classId, s.id)}>
        <div class="info">
          <strong>${this._escapeHtml(displayName(s))}</strong>
          <small>${this._escapeHtml(s.className)}</small>
        </div>
        <span class="tb" style="font-family: monospace; font-weight: 800; font-size: 0.9rem; background: var(--color-danger-soft); color: var(--color-danger); border: 1px solid rgba(220, 38, 38, 0.15); padding: 3px 8px; border-radius: 8px;">
          ${s.yearTB?.toFixed(2)}
        </span>
      </div>
    `)
  }

  private _renderMissingScores() {
    const students = this._enrichedStudents
    const limit = 10
    const missingStudents = students
      .filter((s: EnrichedStudent) => this._hasMissingScores(s))
      .slice(0, limit)

    if (!missingStudents.length) return html`<div class="dash-empty dash-empty-col p-3"><div class="empty-icon">${iconClipboard()}</div><p class="hint m-0">Đã nhập đủ điểm tất cả học viên.</p></div>`

    return missingStudents.map((s: EnrichedStudent) => html`
      <div class="dash-student missing" style="display: flex; align-items: center; justify-content: space-between; border-left: 3px solid var(--color-warning); padding: var(--space-2) var(--space-3);">
        <div class="info" style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
          <span style="font-size: 1.15rem;">📋</span>
          <div style="flex: 1; min-width: 0;">
            <strong style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap; display: block;">${this._escapeHtml(displayName(s))}</strong>
            <small style="color: var(--color-text-secondary);">${this._escapeHtml(s.className)}</small>
          </div>
        </div>
        <gl-button variant="primary" size="sm" @click=${() => this._dispatchScrollToStudent(s.classId, s.id)}>Nhập điểm</gl-button>
      </div>
    `)
  }

  private _dispatchSelectClass(classId: string) {
    this.dispatchEvent(new CustomEvent('dash-select-class', { detail: { classId }, bubbles: true, composed: true }))
  }

  private _dispatchScrollToStudent(classId: string, studentId: string) {
    this.dispatchEvent(new CustomEvent('dash-scroll-to-student', { detail: { classId, studentId }, bubbles: true, composed: true }))
  }

  private _onExportReport() {
    if (this._actionLoading) return
    this._actionLoading = true
    this.dispatchEvent(new CustomEvent('dash-export-report', { bubbles: true, composed: true }))
    setTimeout(() => { this._actionLoading = false }, 2000)
  }

  private _onCompareYears() {
    if (this._actionLoading) return
    this._actionLoading = true
    this.dispatchEvent(new CustomEvent('dash-compare-years', { bubbles: true, composed: true }))
    setTimeout(() => { this._actionLoading = false }, 2000)
  }

  private _onToggleArchive() {
    if (this._actionLoading) return
    this._actionLoading = true
    this.dispatchEvent(new CustomEvent('dash-toggle-archive', { bubbles: true, composed: true }))
    setTimeout(() => { this._actionLoading = false }, 2000)
  }

  private _skeletonTemplate() {
    return html`
      <div class="skeleton-list pt-4 px-4">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-card"></div>
        <div class="skeleton skeleton-card"></div>
        <div class="skeleton skeleton-card"></div>
      </div>
    `
  }

  private _escapeHtml(s: string): string {
    if (!s) return ''
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
}

customElements.define('gl-dashboard', GlDashboard)

declare global {
  interface HTMLElementTagNameMap {
    'gl-dashboard': GlDashboard
  }
}
