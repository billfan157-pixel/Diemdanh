import { StateManager } from '../../StateManager'
import { buildParishDashboard } from '../../../features/parishReport'
import { formatRank } from '../../../config/constants.ts'

export class ParishModal {
  private stateManager: StateManager
  private element: HTMLElement | null = null

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager
  }

  open(): void {
    this.ensureModal()
    this.renderContent()
    const modal = this.element as any
    if (modal) { modal.open = true }
  }

  close(): void {
    const modal = this.element as any
    if (modal) { modal.open = false }
  }

  private ensureModal(): void {
    let modal = document.getElementById('parishModal')
    if (!modal) {
      modal = document.createElement('gl-modal')
      modal.id = 'parishModal'
      modal.setAttribute('heading', '🏛️ Tổng quan Giáo xứ')
      modal.setAttribute('size', 'md')

      modal.innerHTML = `
        <div id="parishBody"></div>
        <gl-button slot="footer" variant="ghost" id="parishModalClose">Đóng</gl-button>
      `
      document.body.appendChild(modal)
      modal.addEventListener('gl-close', () => this.close())
      modal.querySelector('#parishModalClose')?.addEventListener('click', () => this.close())
    }
    this.element = modal
  }

  private renderContent(): void {
    const state = this.stateManager.getState()
    const data = buildParishDashboard(state.classes, state.yearFilter)

    const body = this.element?.querySelector('#parishBody')
    if (!body) return
    body.innerHTML = `
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
            ${data.rankings.map((c: any, i: number) => `
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
    `
  }
}
