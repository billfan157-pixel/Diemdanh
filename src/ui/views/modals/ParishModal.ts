import { StateManager } from '../../StateManager'
import { buildParishDashboard } from '../../../features/parishReport'
import { formatRank } from '../../../config/constants.ts'
import { createFocusTrap } from '../../../utils/focusTrap.ts'

export class ParishModal {
  private stateManager: StateManager
  private overlay: HTMLElement | null = null
  private _focusTrap: ReturnType<typeof createFocusTrap> | null = null

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager
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
    const data = buildParishDashboard(state.classes, state.yearFilter)

    this.overlay = document.createElement('div')
    this.overlay.className = 'modal-overlay'
    this.overlay.setAttribute('role', 'dialog')
    this.overlay.setAttribute('aria-modal', 'true')
    this.overlay.setAttribute('aria-labelledby', 'parishModalTitle')
    this.overlay.innerHTML = `
<div class="modal-panel max-w-lg overflow-y-auto" style="max-height:80vh">
  <h2>🏛️ Tổng quan Giáo xứ <button class="modal-close" id="parishModalClose" aria-label="Đóng">×</button></h2>

  <div class="dash-stats mb-4">
    <div class="stat"><span class="stat-label">Lớp</span><span class="stat-value">${data.classCount}</span></div>
    <div class="stat"><span class="stat-label">Học viên</span><span class="stat-value">${data.studentCount}</span></div>
    <div class="stat"><span class="stat-label">TB</span><span class="stat-value">${data.avgTB != null ? data.avgTB.toFixed(2) : '—'}</span></div>
    <div class="stat"><span class="stat-label">% đủ</span><span class="stat-value">${data.completePercent}%</span></div>
  </div>

  ${data.rankings.length ? `
  <div class="mb-4">
    <h3 style="font-size:.9rem;margin-bottom:6px">🏅 Xếp hạng liên lớp</h3>
    <table class="w-full" style="border-collapse:collapse;font-size:.85rem">
      <thead>
        <tr>
          <th class="text-left border-b" style="padding:4px 6px">#</th>
          <th class="text-left border-b" style="padding:4px 6px">Lớp</th>
          <th class="text-right border-b" style="padding:4px 6px">TB</th>
          <th class="text-right border-b" style="padding:4px 6px">% đủ</th>
        </tr>
      </thead>
      <tbody>
        ${data.rankings.map((c, i) => `
          <tr${c.isRed ? ' data-red' : ''}>
            <td class="border-b" style="padding:4px 6px">${i + 1}</td>
            <td class="border-b" style="padding:4px 6px">${c.className}</td>
            <td class="border-b text-right" style="padding:4px 6px">${c.avgTB?.toFixed(2) ?? '—'}</td>
            <td class="border-b text-right" style="padding:4px 6px">${c.completePercent}%</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>` : ''}

  ${data.topStudents.length ? `
  <div>
    <h3 style="font-size:.9rem;margin-bottom:6px">⭐ Top học viên</h3>
    <table class="w-full" style="border-collapse:collapse;font-size:.85rem">
      <thead>
        <tr>
          <th class="text-left border-b" style="padding:4px 6px">#</th>
          <th class="text-left border-b" style="padding:4px 6px">Học viên</th>
          <th class="text-left border-b" style="padding:4px 6px">Lớp</th>
          <th class="text-right border-b" style="padding:4px 6px">TB</th>
          <th class="text-center border-b" style="padding:4px 6px">XL</th>
        </tr>
      </thead>
      <tbody>
        ${data.topStudents.map((st: any, i: number) => `
          <tr>
            <td class="border-b" style="padding:4px 6px">${i + 1}</td>
            <td class="border-b" style="padding:4px 6px">${st.name || ''}</td>
            <td class="border-b" style="padding:4px 6px">${st.className || ''}</td>
            <td class="border-b text-right" style="padding:4px 6px">${typeof st.tb === 'number' ? st.tb.toFixed(2) : '—'}</td>
            <td class="border-b text-center" style="padding:4px 6px">${formatRank(st.rank)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>` : '<p class="hint text-center p-3">Chưa có dữ liệu.</p>'}
</div>`
    document.body.appendChild(this.overlay)
    this._focusTrap = createFocusTrap(this.overlay)

    this.overlay.querySelector('#parishModalClose')?.addEventListener('click', () => this.close())
    this.overlay.addEventListener('click', (e: Event) => {
      if (e.target === this.overlay) this.close()
    })
  }
}
