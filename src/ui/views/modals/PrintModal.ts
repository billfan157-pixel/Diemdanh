import { StateManager } from '../../StateManager'
import { NotificationManager } from '../../../services/NotificationManager'
import { resolveClassColumns } from '../../../config/columns.ts'
import { displayName } from '../../../config/constants.ts'
import { studentTB, classify } from '../../../core/calc.ts'
import { fmt, escapeHtml } from '../../../views/helpers.ts'
import { buildParishDashboard, buildParishReportHtml } from '../../../features/parishReport.ts'
import { createFocusTrap } from '../../../utils/focusTrap.ts'

export class PrintModal {
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
    this.overlay = document.createElement('div')
    this.overlay.className = 'modal-overlay'
    this.overlay.setAttribute('role', 'dialog')
    this.overlay.setAttribute('aria-modal', 'true')
    this.overlay.setAttribute('aria-labelledby', 'printModalTitle')
    this.overlay.innerHTML = `
<div class="modal-panel max-w-sm">
  <h2 id="printModalTitle">🖨️ Cài đặt in ấn <button class="modal-close" id="printModalClose" aria-label="Đóng">×</button></h2>
  <div id="printModalBody">
    <div class="print-opt">
      <label class="print-opt-label">Phạm vi</label>
      <select id="printScope" class="print-opt-select">
        <option value="class">Lớp hiện tại</option>
        <option value="all">Tất cả lớp</option>
      </select>
    </div>
    <div class="print-opt">
      <label class="print-opt-label">Chi tiết</label>
      <select id="printDetail" class="print-opt-select">
        <option value="full">Đầy đủ cột điểm</option>
        <option value="compact">Chỉ TB + xếp loại</option>
      </select>
    </div>
    <div class="print-opt">
      <label class="print-opt-label">Bố cục</label>
      <select id="printLayout" class="print-opt-select">
        <option value="portrait">Dọc (A4)</option>
        <option value="landscape">Ngang (A4)</option>
      </select>
    </div>
  </div>
  <div class="actions mt-4">
    <button class="btn btn-secondary" id="printModalCancel">Hủy</button>
    <button class="btn btn-primary" id="printModalGo">🖨️ In</button>
  </div>
</div>`
    document.body.appendChild(this.overlay)
    this._focusTrap = createFocusTrap(this.overlay)

    this.overlay.querySelector('#printModalClose')?.addEventListener('click', () => this.close())
    this.overlay.querySelector('#printModalCancel')?.addEventListener('click', () => this.close())
    this.overlay.querySelector('#printModalGo')?.addEventListener('click', () => this.doPrint())
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close()
    })
  }

  private doPrint(): void {
    const scope = (this.overlay?.querySelector('#printScope') as HTMLSelectElement)?.value || 'class'
    const detail = (this.overlay?.querySelector('#printDetail') as HTMLSelectElement)?.value || 'full'
    const layout = (this.overlay?.querySelector('#printLayout') as HTMLSelectElement)?.value || 'portrait'

    let html: string

    if (scope === 'all') {
      const classes = this.stateManager.getAllClasses()
      const yearFilter = this.stateManager.getState().yearFilter
      const data = buildParishDashboard(classes, yearFilter)
      html = buildParishReportHtml(data, classes)
    } else {
      const classId = this.stateManager.getState().activeClassId
      if (!classId) {
        this.notificationManager.show('Chưa chọn lớp', 'warning')
        return
      }
      const cls = this.stateManager.getClass(classId)
      if (!cls) return
      html = this.buildClassPrintHtml(cls, detail)
    }

    const orientation = layout === 'landscape' ? 'landscape' : 'portrait'
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>In điểm</title><style>
      @page { size: A4 ${orientation}; margin: 14mm; }
      body { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 11pt; color: #111; }
      table { width: 100%; border-collapse: collapse; margin: 8px 0; }
      th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; font-size: 9pt; }
      th { background: #f1f5f9; font-weight: 600; }
      h2 { font-size: 14pt; margin: 0 0 4px; }
      .hint { color: #666; font-size: 9pt; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style></head><body>${html}</body></html>`

    const w = window.open('', '_blank')
    if (!w) {
      this.notificationManager.show('Trình duyệt chặn cửa sổ in — hãy cho phép popup', 'error')
      return
    }
    w.document.write(fullHtml)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 400)
    this.close()
  }

  private buildClassPrintHtml(cls: import('../../../services/storage/StorageAdapter.types.ts').ClassData, detail: string): string {
    const cols = resolveClassColumns(cls)
    const rawTerm = this.stateManager.getState().activeTerm
    const term: 'hk1' | 'hk2' = rawTerm === 'year' ? 'hk1' : rawTerm

    if (detail === 'compact') {
      const rows = cls.students.map((st, i) => {
        const tb = studentTB(st, cls.weights, term, cols)
        const cl = classify(tb)
        const filled = cols.filter(c => (st.scoresByTerm?.[term]?.[c.key]?.length ?? 0) > 0).length
        return `<tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(displayName(st))}</td>
          <td class="tb">${fmt(tb)}</td>
          <td><span class="tag ${cl.rank}">${cl.label}</span></td>
          <td>${filled}/${cols.length}</td>
        </tr>`
      }).join('')
      return `<h2>${escapeHtml(cls.name)} ${cls.year ? `· ${cls.year}` : ''}</h2>
        <p class="hint">TB · ${term === 'hk1' ? 'HK1' : 'HK2'}</p>
        <table>
          <thead><tr><th scope="col">STT</th><th scope="col">Học viên</th><th scope="col">TB</th><th scope="col">Xếp loại</th><th scope="col">Điểm đủ</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`
    }

    const rows = cls.students.map((st, i) => {
      const tb = studentTB(st, cls.weights, term, cols)
      const scoreCells = cols.map(c => {
        const scores: number[] = st.scoresByTerm?.[term]?.[c.key] || []
        return `<td>${scores.length ? scores.map(s => fmt(s)).join('; ') : '—'}</td>`
      }).join('')
      return `<tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(displayName(st))}</td>
        ${scoreCells}
        <td class="tb">${fmt(tb)}</td>
        <td>${escapeHtml(st.ghiChu || '')}</td>
      </tr>`
    }).join('')

    return `<h2>${escapeHtml(cls.name)} ${cls.year ? `· ${cls.year}` : ''}</h2>
      <p class="hint">${term === 'hk1' ? 'HK1' : 'HK2'} · Đầy đủ cột điểm</p>
      <table>
        <thead><tr>
          <th scope="col">STT</th><th scope="col">Học viên</th>
          ${cols.map(c => `<th scope="col">${escapeHtml(c.short)}</th>`).join('')}
          <th scope="col">TB</th><th scope="col">Ghi chú</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`
  }
}
