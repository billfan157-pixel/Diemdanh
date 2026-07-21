import { StateManager } from '../../StateManager'
import { buildParishDashboard } from '../../../features/parishReport'
import { formatRank } from '../../../config/constants.ts'

export class ParishModal {
  private stateManager: StateManager
  private overlay: HTMLElement | null = null

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager
  }

  open(): void {
    this.render()
  }

  close(): void {
    if (this.overlay) {
      this.overlay.remove()
      this.overlay = null
    }
  }

  private render(): void {
    const state = this.stateManager.getState()
    const data = buildParishDashboard(state.classes, state.yearFilter)

    this.overlay = document.createElement('div')
    this.overlay.className = 'modal-overlay'
    this.overlay.innerHTML = `
<div class="modal-panel" style="max-width:640px;max-height:80vh;overflow-y:auto">
  <h2>🏛️ Tổng quan Giáo xứ <button class="modal-close" id="parishModalClose">×</button></h2>

  <div class="dash-stats" style="margin-bottom:16px">
    <div class="stat"><span class="stat-label">Lớp</span><span class="stat-value">${data.classCount}</span></div>
    <div class="stat"><span class="stat-label">Học viên</span><span class="stat-value">${data.studentCount}</span></div>
    <div class="stat"><span class="stat-label">TB</span><span class="stat-value">${data.avgTB != null ? data.avgTB.toFixed(2) : '—'}</span></div>
    <div class="stat"><span class="stat-label">% đủ</span><span class="stat-value">${data.completePercent}%</span></div>
  </div>

  ${data.rankings.length ? `
  <div style="margin-bottom:16px">
    <h3 style="font-size:.9rem;margin-bottom:6px">🏅 Xếp hạng liên lớp</h3>
    <table style="width:100%;border-collapse:collapse;font-size:.85rem">
      <thead>
        <tr>
          <th style="text-align:left;padding:4px 6px;border-bottom:1px solid var(--color-border)">#</th>
          <th style="text-align:left;padding:4px 6px;border-bottom:1px solid var(--color-border)">Lớp</th>
          <th style="text-align:right;padding:4px 6px;border-bottom:1px solid var(--color-border)">TB</th>
          <th style="text-align:right;padding:4px 6px;border-bottom:1px solid var(--color-border)">% đủ</th>
        </tr>
      </thead>
      <tbody>
        ${data.rankings.map((c, i) => `
          <tr${c.isRed ? ' data-red' : ''}>
            <td style="padding:4px 6px;border-bottom:1px solid var(--color-border-subtle)">${i + 1}</td>
            <td style="padding:4px 6px;border-bottom:1px solid var(--color-border-subtle)">${c.className}</td>
            <td style="padding:4px 6px;border-bottom:1px solid var(--color-border-subtle);text-align:right">${c.avgTB?.toFixed(2) ?? '—'}</td>
            <td style="padding:4px 6px;border-bottom:1px solid var(--color-border-subtle);text-align:right">${c.completePercent}%</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>` : ''}

  ${data.topStudents.length ? `
  <div>
    <h3 style="font-size:.9rem;margin-bottom:6px">⭐ Top học viên</h3>
    <table style="width:100%;border-collapse:collapse;font-size:.85rem">
      <thead>
        <tr>
          <th style="text-align:left;padding:4px 6px;border-bottom:1px solid var(--color-border)">#</th>
          <th style="text-align:left;padding:4px 6px;border-bottom:1px solid var(--color-border)">Học viên</th>
          <th style="text-align:left;padding:4px 6px;border-bottom:1px solid var(--color-border)">Lớp</th>
          <th style="text-align:right;padding:4px 6px;border-bottom:1px solid var(--color-border)">TB</th>
          <th style="text-align:center;padding:4px 6px;border-bottom:1px solid var(--color-border)">XL</th>
        </tr>
      </thead>
      <tbody>
        ${data.topStudents.map((st: any, i: number) => `
          <tr>
            <td style="padding:4px 6px;border-bottom:1px solid var(--color-border-subtle)">${i + 1}</td>
            <td style="padding:4px 6px;border-bottom:1px solid var(--color-border-subtle)">${st.name || ''}</td>
            <td style="padding:4px 6px;border-bottom:1px solid var(--color-border-subtle)">${st.className || ''}</td>
            <td style="padding:4px 6px;border-bottom:1px solid var(--color-border-subtle);text-align:right">${typeof st.tb === 'number' ? st.tb.toFixed(2) : '—'}</td>
            <td style="padding:4px 6px;border-bottom:1px solid var(--color-border-subtle);text-align:center">${formatRank(st.rank)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>` : '<p class="hint" style="text-align:center;padding:12px">Chưa có dữ liệu.</p>'}
</div>`
    document.body.appendChild(this.overlay)

    this.overlay.querySelector('#parishModalClose')?.addEventListener('click', () => this.close())
    this.overlay.addEventListener('click', (e: Event) => {
      if (e.target === this.overlay) this.close()
    })
  }
}
