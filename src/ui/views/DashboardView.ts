// ============================================================
// Sổ Điểm GL — Dashboard View Component
// ============================================================

import { StateManager } from '../StateManager'
import { AuthManager } from '../../core/auth/AuthManager'
import { displayName, classifyStudent, resolveClassColumns } from '../../config/constants.ts'
import { studentYearTB, hasMissingColumnScores } from '../../core/calc.ts'
import { buildParishDashboard } from '../../features/parishReport.ts'
import { summarizeYear } from '../../features/years.ts'

export class DashboardView {
  private container: HTMLElement | null = null

  constructor(
    private stateManager: StateManager,
    private authManager: AuthManager,
    private onSelectClass: (classId: string) => void,
    private onToggleArchiveCurrentYear: () => void,
    private onOpenYearCompare: () => void,
    private onExportParishReport: () => void
  ) {}

  render(container: HTMLElement): void {
    this.container = container
    const classes = this.stateManager.getAllClasses()
    const yearFilter = this.stateManager.getState().yearFilter
    const data = buildParishDashboard(classes, yearFilter)
    const archived = yearFilter ? this.stateManager.isYearArchived(yearFilter) : false
    const yearInfo = yearFilter ? summarizeYear(classes, yearFilter) : null

    if (!classes.length) {
      container.innerHTML = `
        <div class="dashboard">
          <div class="dash-header">
            <h2>Tổng quan Ban GL${yearFilter ? ` · ${yearFilter}` : ''}</h2>
          </div>
          <div class="dash-empty">
            <div class="empty-icon">📂</div>
            <strong>Chưa có lớp học nào</strong>
            <p class="hint" style="margin-top:6px">Tạo lớp mới từ menu bên trái để bắt đầu nhập điểm.</p>
          </div>
        </div>
      `
      return
    }

    container.innerHTML = `
      <div class="dashboard">
        <div class="dash-header">
          <h2>Tổng quan Ban GL${yearFilter ? ` · ${yearFilter}` : ''}${archived ? ' · đã lưu trữ' : ''}</h2>
          <div
            ${this.authManager.isAdmin() ? `
              <button class="btn btn-ghost btn-sm" id="dashExportBtn">📄 Xuất báo cáo</button>
              <button class="btn btn-ghost btn-sm" id="dashCompareBtn">📊 So sánh năm</button>
              <button class="btn btn-ghost btn-sm" id="dashArchiveBtn">${archived ? 'Mở lại năm' : 'Lưu trữ năm'}</button>
            ` : ''}
          </div>
        </div>

        <div class="dash-stats">
          <div class="stat touch-ripple"><span class="stat-label">Lớp</span><span class="stat-value">${data.classCount}</span></div>
          <div class="stat touch-ripple"><span class="stat-label">Học viên</span><span class="stat-value">${data.studentCount}</span></div>
          <div class="stat touch-ripple"><span class="stat-label">TB cả năm</span><span class="stat-value">${data.avgTB != null ? data.avgTB.toFixed(2) : '—'}</span></div>
          <div class="stat touch-ripple"><span class="stat-label">% đủ điểm</span><span class="stat-value">${data.completePercent}%</span></div>
        </div>

        <div class="dashboard-grid">
        <section class="dash-section dash-section--full">
          <h3>🏅 Xếp hạng liên lớp</h3>
          ${data.rankings.length ? `
            <div class="dash-rank-table">
              <table>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Lớp</th>
                    <th scope="col" class="text-right">TB</th>
                    <th scope="col" class="text-right">% đủ</th>
                    <th scope="col">TT</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.rankings.map((c: any, i: number) => `
                    <tr${c.isRed ? ' data-red' : ''}>
                      <td>${i + 1}</td>
                      <td><button type="button" class="btn btn-ghost btn-sm" data-dash-class="${c.classId}">${this.escapeHtml(c.className)}</button></td>
                      <td class="text-right">${c.avgTB != null ? c.avgTB.toFixed(2) : '—'}</td>
                      <td class="text-right">${c.completePercent}%</td>
                      <td>${c.isRed ? '🔴' : '🟢'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : '<div class="dash-empty"><p class="hint">Chưa có lớp — tạo lớp và nhập điểm để xem xếp hạng.</p></div>'}
        </section>

        <section class="dash-section">
          <h3>🔴 Lớp cần quan tâm</h3>
          ${data.redClasses.length
            ? data.redClasses.map((c: any) => `
              <div class="dash-student weak">
                <div class="info">
                  <strong>${this.escapeHtml(c.className)}</strong>
                  <small>TB ${c.avgTB != null ? c.avgTB.toFixed(2) : '—'} · đủ điểm ${c.completePercent}%</small>
                </div>
              </div>
            `).join('')
            : '<div class="dash-empty dash-empty-col p-3"><p class="hint m-0">✅ Không có lớp đỏ — tất cả đều ổn.</p></div>'}
        </section>

        <section class="dash-section">
          <h3>🏆 Xuất sắc</h3>
          ${this.renderTopStudents(5)}
        </section>

        <section class="dash-section">
          <h3>📉 Cần quan tâm (HV)</h3>
          ${this.renderAttentionStudents()}
        </section>

        <section class="dash-section">
          <h3>⚠️ Yếu (TB &lt; 5)</h3>
          ${this.renderWeakStudents()}
        </section>

        <section class="dash-section">
          <h3>📋 Thiếu điểm</h3>
          ${this.renderMissingScores()}
        </section>
        </div>
        ${yearInfo ? `<p class="hint mt-3">Năm ${yearInfo.year}: ${yearInfo.redClasses} lớp cần quan tâm</p>` : ''}
      </div>
    `

    this.bindEvents()
  }

  private bindEvents(): void {
    if (!this.container) return

    this.container.querySelector('#dashExportBtn')?.addEventListener('click', () => this.onExportParishReport())
    this.container.querySelector('#dashCompareBtn')?.addEventListener('click', () => this.onOpenYearCompare())
    this.container.querySelector('#dashArchiveBtn')?.addEventListener('click', () => this.onToggleArchiveCurrentYear())

    this.container.querySelectorAll('[data-dash-class]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.dashClass!
        this.onSelectClass(id)
      })
    })

    this.container.querySelectorAll('[data-missing-class]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.missingClass!
        const sid = (btn as HTMLElement).dataset.missingStudent
        this.onSelectClass(id)
        if (sid) {
          requestAnimationFrame(() => {
            // Emit a custom event or let AppView handle scroll-into-view
            window.dispatchEvent(new CustomEvent('gl:scroll-to-student', { detail: { studentId: sid } }))
          })
        }
      })
    })
  }

  private scopedClasses() {
    return this.stateManager.getVisibleClasses()
  }

  private renderTopStudents(limit: number): string {
    const students = this.scopedClasses()
      .flatMap(c => {
        const cols = resolveClassColumns(c)
        return c.students.map(s => ({
          ...s,
          className: c.name,
          classId: c.id,
          yearTB: studentYearTB(s, c.weights, cols)
        }))
      })
      .filter(s => s.yearTB !== null)
      .sort((a, b) => (b.yearTB || 0) - (a.yearTB || 0))
      .slice(0, limit)

    if (!students.length) return '<div class="dash-empty dash-empty-col p-3"><p class="hint m-0">Chưa có điểm — nhập điểm cho học viên để xem xếp hạng.</p></div>'

    return students.map((s, i) => `
      <div class="dash-student touch-ripple ${i < 3 ? 'top-' + (i + 1) : ''}">
        <span class="rank">${i + 1}</span>
        <div class="info">
          <strong>${displayName(s as any)}</strong>
          <small>${s.className}</small>
        </div>
        <span class="tb score-${s.yearTB !== null ? classifyStudent(s.yearTB || 0).rank : 'none'}">${s.yearTB !== null ? s.yearTB.toFixed(2) : '—'}</span>
      </div>
    `).join('')
  }

  private renderAttentionStudents(): string {
    const students = this.scopedClasses()
      .flatMap(c => {
        const cols = resolveClassColumns(c)
        return c.students.map(s => ({
          ...s,
          className: c.name,
          yearTB: studentYearTB(s, c.weights, cols)
        }))
      })
      .filter(s => s.yearTB !== null && s.yearTB >= 5 && s.yearTB < 6.5)
      .sort((a, b) => (a.yearTB || 0) - (b.yearTB || 0))
      .slice(0, 10)

    if (!students.length) return '<div class="dash-empty dash-empty-col p-3"><p class="hint m-0">✅ Không có học viên cần quan tâm.</p></div>'

    return students.map(s => `
      <div class="dash-student">
        <div class="info">
          <strong>${displayName(s as any)}</strong>
          <small>${s.className}</small>
        </div>
        <span class="tb score-${classifyStudent(s.yearTB || 0).rank}">${s.yearTB?.toFixed(2)}</span>
      </div>
    `).join('')
  }

  private renderWeakStudents(): string {
    const students = this.scopedClasses()
      .flatMap(c => {
        const cols = resolveClassColumns(c)
        return c.students.map(s => ({
          ...s,
          className: c.name,
          yearTB: studentYearTB(s, c.weights, cols)
        }))
      })
      .filter(s => s.yearTB !== null && s.yearTB < 5)
      .sort((a, b) => (a.yearTB || 0) - (b.yearTB || 0))
      .slice(0, 10)

    if (!students.length) return '<div class="dash-empty dash-empty-col p-3"><p class="hint m-0">✅ Không có học viên yếu (TB &lt; 5).</p></div>'

    return students.map(s => `
      <div class="dash-student weak">
        <div class="info">
          <strong>${displayName(s as any)}</strong>
          <small>${s.className}</small>
        </div>
        <span class="tb score-${classifyStudent(s.yearTB || 0).rank}">${s.yearTB?.toFixed(2)}</span>
      </div>
    `).join('')
  }

  private renderMissingScores(): string {
    const students = this.scopedClasses()
      .flatMap(c => c.students.map(s => ({
        ...s,
        className: c.name,
        classId: c.id,
        columns: resolveClassColumns(c)
      })))
      .filter(s => this.hasMissingScores(s))
      .slice(0, 10)

    if (!students.length) return '<div class="dash-empty dash-empty-col p-3"><p class="hint m-0">✅ Không thiếu điểm — tất cả học viên đã nhập đủ.</p></div>'

    return students.map(s => `
      <div class="dash-student missing">
        <div class="info">
          <strong>${displayName(s as any)}</strong>
          <small>${s.className}</small>
        </div>
        <button class="btn btn-ghost btn-sm" data-missing-class="${s.classId}" data-missing-student="${s.id}">Xem</button>
      </div>
    `).join('')
  }

  private hasMissingScores(student: any): boolean {
    const term = this.stateManager.getState().activeTerm
    if (term === 'year') {
      return hasMissingColumnScores(student, 'hk1', student.columns) ||
        hasMissingColumnScores(student, 'hk2', student.columns)
    }
    return hasMissingColumnScores(student, term, student.columns)
  }

  private escapeHtml(s: string): string {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
}
