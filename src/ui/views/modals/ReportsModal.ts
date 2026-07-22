import { StateManager } from '../../StateManager'
import { NotificationManager } from '../../../services/NotificationManager'
import { resolveClassColumns } from '../../../config/columns.ts'
import { buildQuickReport, displayName, termLabel } from '../../../core/legacyCompat.ts'
import { formatScore } from '../../../config/constants.ts'

export class ReportsModal {
  private stateManager: StateManager
  private notificationManager: NotificationManager
  private element: HTMLElement | null = null

  constructor(stateManager: StateManager, notificationManager: NotificationManager) {
    this.stateManager = stateManager
    this.notificationManager = notificationManager
  }

  open(): void {
    const state = this.stateManager.getState()
    const cls = state.classes.find(c => c.id === state.activeClassId)
    if (!cls) {
      this.notificationManager.show('Chọn lớp trước.', 'warning')
      return
    }
    this.ensureModal()
    this.renderContent(cls)
    const modal = this.element as any
    if (modal) { modal.open = true }
  }

  close(): void {
    const modal = this.element as any
    if (modal) { modal.open = false }
  }

  private ensureModal(): void {
    let modal = document.getElementById('reportsModal')
    if (!modal) {
      modal = document.createElement('gl-modal')
      modal.id = 'reportsModal'
      modal.setAttribute('heading', '📊 Báo cáo nhanh')
      modal.setAttribute('size', 'md')

      modal.innerHTML = `
        <div id="reportsBody"></div>
        <gl-button slot="footer" variant="ghost" id="reportsModalClose">Đóng</gl-button>
      `
      document.body.appendChild(modal)
      modal.addEventListener('gl-close', () => this.close())
      modal.querySelector('#reportsModalClose')?.addEventListener('click', () => this.close())
    }
    this.element = modal
  }

  private renderContent(cls: any): void {
    const state = this.stateManager.getState()
    const term: 'hk1' | 'hk2' | 'year' = state.activeTerm
    const cols = resolveClassColumns(cls)
    const report = buildQuickReport(cls.students, cls.weights, cols, term)

    const body = this.element?.querySelector('#reportsBody')
    if (!body) return
    body.innerHTML = `
      <p class="hint mb-2">${cls.name} · ${termLabel(term)}</p>
      <div class="grid gap-3">
        <div class="stat py-2 px-3 rounded-md" style="background:var(--color-bg-subtle)">
          <span class="stat-label">TB lớp</span>
          <span class="stat-value">${report.classAvg != null ? formatScore(report.classAvg) : '—'}</span>
        </div>
        ${report.top5.length ? `
        <div>
          <h3 style="font-size:.9rem" class="mb-1">🏆 Top 5</h3>
          <ol class="m-0 pl-5" style="font-size:.85rem">
            ${report.top5.map((st: any) => `<li>${displayName(st)}</li>`).join('')}
          </ol>
        </div>` : ''}
        ${report.weak.length ? `
        <div>
          <h3 style="font-size:.9rem" class="mb-1 text-danger">🔴 Yếu (TB &lt; 5)</h3>
          <ul class="m-0 pl-5" style="font-size:.85rem">
            ${report.weak.map((st: any) => `<li>${displayName(st)}</li>`).join('')}
          </ul>
        </div>` : ''}
        ${report.needHelp.length ? `
        <div>
          <h3 style="font-size:.9rem;color:var(--color-warning)" class="mb-1">🟡 Cần theo dõi (5 ≤ TB &lt; 6.5)</h3>
          <ul class="m-0 pl-5" style="font-size:.85rem">
            ${report.needHelp.map((st: any) => `<li>${displayName(st)}</li>`).join('')}
          </ul>
        </div>` : ''}
        ${report.missing.length ? `
        <div>
          <h3 style="font-size:.9rem" class="mb-1 text-muted">📋 Thiếu điểm</h3>
          <ul class="m-0 pl-5" style="font-size:.85rem">
            ${report.missing.map((st: any) => `<li>${displayName(st)}</li>`).join('')}
          </ul>
        </div>` : ''}
        ${report.improved.length ? `
        <div>
          <h3 style="font-size:.9rem" class="mb-1 text-success">📈 Tiến bộ (HK2 &gt; HK1)</h3>
          <ul class="m-0 pl-5" style="font-size:.85rem">
            ${report.improved.slice(0, 10).map((st: any) => `<li>${displayName(st)}</li>`).join('')}
            ${report.improved.length > 10 ? `<li class="hint">… và ${report.improved.length - 10} em khác</li>` : ''}
          </ul>
        </div>` : ''}
        ${report.declined.length ? `
        <div>
          <h3 style="font-size:.9rem" class="mb-1 text-danger">📉 Giảm (HK2 &lt; HK1)</h3>
          <ul class="m-0 pl-5" style="font-size:.85rem">
            ${report.declined.slice(0, 10).map((st: any) => `<li>${displayName(st)}</li>`).join('')}
            ${report.declined.length > 10 ? `<li class="hint">… và ${report.declined.length - 10} em khác</li>` : ''}
          </ul>
        </div>` : ''}
      </div>
    `
  }
}
