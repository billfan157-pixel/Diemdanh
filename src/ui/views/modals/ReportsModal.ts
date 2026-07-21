import { StateManager } from '../../StateManager'
import { NotificationManager } from '../../../services/NotificationManager'
import { resolveClassColumns } from '../../../config/columns.ts'
import { buildQuickReport, displayName, termLabel } from '../../../core/legacyCompat.ts'
import { formatScore } from '../../../config/constants.ts'
import { createFocusTrap } from '../../../utils/focusTrap.ts'

export class ReportsModal {
  private stateManager: StateManager
  private notificationManager: NotificationManager
  private overlay: HTMLElement | null = null
  private _focusTrap: ReturnType<typeof createFocusTrap> | null = null

  constructor(stateManager: StateManager, notificationManager: NotificationManager) {
    this.stateManager = stateManager
    this.notificationManager = notificationManager
  }

  open(): void {
    this.render()
  }

  close(): void {
    this._focusTrap?.destroy()
    this._focusTrap = null
    if (this.overlay) {
      this.overlay.remove()
      this.overlay = null
    }
  }

  private render(): void {
    const state = this.stateManager.getState()
    const cls = state.classes.find(c => c.id === state.activeClassId)
    if (!cls) {
      this.notificationManager.show('Chọn lớp trước.', 'warning')
      this.close()
      return
    }

    const term: 'hk1' | 'hk2' | 'year' = state.activeTerm
    const cols = resolveClassColumns(cls)
    const report = buildQuickReport(cls.students, cls.weights, cols, term)

    this.overlay = document.createElement('div')
    this.overlay.className = 'modal-overlay'
    this.overlay.innerHTML = `
<div class="modal-panel overflow-y-auto" style="max-width:560px;max-height:80vh">
  <h2>📊 Báo cáo nhanh <button class="modal-close" id="reportsModalClose" aria-label="Đóng">×</button></h2>
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
        ${report.top5.map(st => `<li>${displayName(st)}</li>`).join('')}
      </ol>
    </div>` : ''}

    ${report.weak.length ? `
    <div>
      <h3 style="font-size:.9rem" class="mb-1 text-danger">🔴 Yếu (TB &lt; 5)</h3>
      <ul class="m-0 pl-5" style="font-size:.85rem">
        ${report.weak.map(st => `<li>${displayName(st)}</li>`).join('')}
      </ul>
    </div>` : ''}

    ${report.needHelp.length ? `
    <div>
      <h3 style="font-size:.9rem;color:var(--color-warning)" class="mb-1">🟡 Cần theo dõi (5 ≤ TB &lt; 6.5)</h3>
      <ul class="m-0 pl-5" style="font-size:.85rem">
        ${report.needHelp.map(st => `<li>${displayName(st)}</li>`).join('')}
      </ul>
    </div>` : ''}

    ${report.missing.length ? `
    <div>
      <h3 style="font-size:.9rem" class="mb-1 text-muted">📋 Thiếu điểm</h3>
      <ul class="m-0 pl-5" style="font-size:.85rem">
        ${report.missing.map(st => `<li>${displayName(st)}</li>`).join('')}
      </ul>
    </div>` : ''}

    ${report.improved.length ? `
    <div>
      <h3 style="font-size:.9rem" class="mb-1 text-success">📈 Tiến bộ (HK2 &gt; HK1)</h3>
      <ul class="m-0 pl-5" style="font-size:.85rem">
        ${report.improved.slice(0, 10).map(st => `<li>${displayName(st)}</li>`).join('')}
        ${report.improved.length > 10 ? `<li class="hint">… và ${report.improved.length - 10} em khác</li>` : ''}
      </ul>
    </div>` : ''}

    ${report.declined.length ? `
    <div>
      <h3 style="font-size:.9rem" class="mb-1 text-danger">📉 Giảm (HK2 &lt; HK1)</h3>
      <ul class="m-0 pl-5" style="font-size:.85rem">
        ${report.declined.slice(0, 10).map(st => `<li>${displayName(st)}</li>`).join('')}
        ${report.declined.length > 10 ? `<li class="hint">… và ${report.declined.length - 10} em khác</li>` : ''}
      </ul>
    </div>` : ''}
  </div>
</div>`
    document.body.appendChild(this.overlay)
    this._focusTrap = createFocusTrap(this.overlay)

    this.overlay.querySelector('#reportsModalClose')?.addEventListener('click', () => this.close())
    this.overlay.addEventListener('click', (e: Event) => {
      if (e.target === this.overlay) this.close()
    })
  }
}
