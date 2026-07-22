import { StateManager } from '../../StateManager'
import { NotificationManager } from '../../../services/NotificationManager'
import { resolveClassColumns } from '../../../config/columns.ts'
import { displayName } from '../../../config/constants.ts'
import { studentTB, classify } from '../../../core/calc.ts'
import { fmt, escapeHtml } from '../../../views/helpers.ts'

export class PrintModal {
  private stateManager: StateManager
  private notificationManager: NotificationManager
  private element: HTMLElement | null = null
  private previewFrame: HTMLIFrameElement | null = null

  constructor(stateManager: StateManager, notificationManager: NotificationManager) {
    this.stateManager = stateManager
    this.notificationManager = notificationManager
  }

  open(): void {
    this.ensureModal()
    const modal = this.element as any
    if (modal) { modal.open = true }
    this.refreshPreview()
  }

  close(): void {
    const modal = this.element as any
    if (modal) { modal.open = false }
  }

  private refreshPreview(): void {
    const html = this.buildPrintHtml()
    if (this.previewFrame && this.previewFrame.contentDocument) {
      this.previewFrame.contentDocument.open()
      this.previewFrame.contentDocument.write(html)
      this.previewFrame.contentDocument.close()
    }
  }

  private getSelectedClassIds(): string[] {
    const el = this.element
    if (!el) return []
    const checkboxes = el.querySelectorAll<HTMLInputElement>('#printClassList input[type=checkbox]')
    const checked: string[] = []
    checkboxes.forEach(cb => { if (cb.checked) checked.push(cb.value) })
    return checked
  }

  private getClassSelectionHtml(): string {
    const classes = this.stateManager.getAllClasses()
    const activeId = this.stateManager.getState().activeClassId
    const yearFilter = this.stateManager.getState().yearFilter
    const filtered = yearFilter ? classes.filter(c => c.year === yearFilter) : classes
    if (!filtered.length) return '<p class="hint">Không có lớp học</p>'
    return filtered.map(c => {
      const checked = c.id === activeId ? 'checked' : ''
      return `<label style="display:flex;align-items:center;gap:6px;padding:4px 0;font-size:0.8rem;cursor:pointer;">
        <input type="checkbox" value="${c.id}" ${checked} style="accent-color:var(--color-primary);" />
        <span>${escapeHtml(c.name)}${c.year ? ` <span style="color:var(--muted);font-size:0.7rem;">· ${escapeHtml(c.year)}</span>` : ''}</span>
      </label>`
    }).join('')
  }

  private ensureModal(): void {
    let modal = document.getElementById('printModal')
    if (!modal) {
      modal = document.createElement('gl-modal')
      modal.id = 'printModal'
      modal.setAttribute('heading', '🖨️ In ấn & Xuất PDF')
      modal.setAttribute('size', 'lg')

      modal.innerHTML = `
        <div id="printModalBody" style="display:grid;grid-template-columns:240px 1fr;gap:16px;min-height:400px;">
          <div class="print-sidebar" style="display:flex;flex-direction:column;gap:12px;">
            <div class="print-opt">
              <label class="field-label" for="printTitle">Tiêu đề</label>
              <input type="text" id="printTitle" class="input" placeholder="VD: Bảng điểm HK1 - 2026-2027" style="width:100%;font-size:0.8rem;" />
            </div>
            <div class="print-opt">
              <label class="field-label" for="printDetail">Chi tiết</label>
              <select id="printDetail" class="input" style="width:100%">
                <option value="full">Đầy đủ cột điểm</option>
                <option value="compact">Chỉ TB + xếp loại</option>
              </select>
            </div>
            <div class="print-opt">
              <label class="field-label" for="printLayout">Bố cục</label>
              <select id="printLayout" class="input" style="width:100%">
                <option value="portrait">Dọc (A4)</option>
                <option value="landscape">Ngang (A4)</option>
              </select>
            </div>
            <div class="print-opt">
              <label class="field-label">Zoom</label>
              <select id="printZoom" class="input" style="width:100%">
                <option value="0.5">50%</option>
                <option value="0.75">75%</option>
                <option value="1" selected>100%</option>
                <option value="1.25">125%</option>
                <option value="1.5">150%</option>
              </select>
            </div>
            <div class="print-opt">
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.8rem;">
                <input type="checkbox" id="printPageBreak" checked style="accent-color:var(--color-primary);" />
                Ngắt trang giữa các lớp
              </label>
            </div>
            <div class="print-opt" style="flex:1;overflow-y:auto;max-height:200px;">
              <label class="field-label">Lớp cần in</label>
              <div id="printClassList" style="margin-top:4px;">
                ${this.getClassSelectionHtml()}
              </div>
            </div>
            <p class="hint" style="font-size:0.75rem;margin-top:auto;">
              Chọn ít nhất một lớp. Nhấn "In" → chọn "Save as PDF" nếu muốn xuất PDF.
            </p>
          </div>
          <div class="print-preview" style="border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;background:#fff;position:relative;">
            <div class="print-preview-toolbar" style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:var(--surface2);border-bottom:1px solid var(--border);font-size:0.8rem;">
              <span style="color:var(--muted)">📄 Xem trước</span>
              <gl-button variant="ghost" size="sm" id="printPreviewRefreshBtn" style="font-size:0.7rem;">⟳ Làm mới</gl-button>
            </div>
            <iframe id="printPreviewFrame" style="width:100%;height:420px;border:none;background:#fff;" sandbox="allow-scripts allow-same-origin"></iframe>
          </div>
        </div>
        <gl-button slot="footer" variant="ghost" id="printModalCancel">Hủy</gl-button>
        <gl-button slot="footer" variant="primary" id="printModalGo">🖨️ In</gl-button>
      `
      document.body.appendChild(modal)

      this.previewFrame = modal.querySelector('#printPreviewFrame') as HTMLIFrameElement

      const refresh = () => this.refreshPreview()
      modal.querySelector('#printTitle')?.addEventListener('change', refresh)
      modal.querySelector('#printDetail')?.addEventListener('change', refresh)
      modal.querySelector('#printLayout')?.addEventListener('change', refresh)
      modal.querySelector('#printPageBreak')?.addEventListener('change', refresh)
      modal.querySelector('#printPreviewRefreshBtn')?.addEventListener('click', refresh)
      modal.querySelector('#printClassList')?.addEventListener('change', refresh)

      modal.querySelector('#printZoom')?.addEventListener('change', (e: any) => {
        if (this.previewFrame) {
          this.previewFrame.style.transform = `scale(${e.target.value})`
          this.previewFrame.style.transformOrigin = 'top left'
          this.previewFrame.style.width = `${100 / e.target.value}%`
          this.previewFrame.style.height = `${420 / e.target.value}px`
        }
      })

      modal.addEventListener('gl-close', () => this.close())
      modal.querySelector('#printModalCancel')?.addEventListener('click', () => this.close())
      modal.querySelector('#printModalGo')?.addEventListener('click', () => this.doPrint())
    } else {
      const listEl = modal.querySelector('#printClassList')
      if (listEl) listEl.innerHTML = this.getClassSelectionHtml()
    }
    this.element = modal
  }

  private buildPrintHtml(): string {
    const detail = (this.element?.querySelector('#printDetail') as HTMLSelectElement)?.value || 'full'
    const layout = (this.element?.querySelector('#printLayout') as HTMLSelectElement)?.value || 'portrait'
    const customTitle = (this.element?.querySelector('#printTitle') as HTMLInputElement)?.value?.trim() || ''
    const pageBreak = (this.element?.querySelector('#printPageBreak') as HTMLInputElement)?.checked !== false

    const classIds = this.getSelectedClassIds()
    if (!classIds.length) return '<p class="hint" style="padding:20px;text-align:center;">Chọn ít nhất một lớp để in.</p>'

    const bodyParts = classIds.map((id, i) => {
      const cls = this.stateManager.getClass(id)
      if (!cls) return ''
      const html = this.buildClassPrintHtml(cls, detail)
      if (pageBreak && i < classIds.length - 1) {
        return html + '<div style="page-break-before:always;"></div>'
      }
      return html
    })

    const bodyHtml = bodyParts.join('')
    const orientation = layout === 'landscape' ? 'landscape' : 'portrait'

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${customTitle || 'In điểm'}</title><style>
      @page { size: A4 ${orientation}; margin: 12mm 10mm 16mm; }
      body { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 11pt; color: #111; margin: 0; padding: 0; }
      table { width: 100%; border-collapse: collapse; margin: 8px 0; }
      th, td { border: 1px solid #222; padding: 5px 7px; text-align: center; font-size: 9pt; }
      th { background: #f1f5f9; font-weight: 700; }
      td.name-col { text-align: left; }
      h2 { font-size: 14pt; margin: 0 0 4px; }
      .hint { color: #666; font-size: 9pt; }
      .cols-5 th, .cols-5 td, .cols-6 th, .cols-6 td { font-size: 8.5pt; padding: 4px 5px; }
      .cols-7 th, .cols-7 td, .cols-8 th, .cols-8 td { font-size: 8pt; padding: 3px 4px; }
      .cols-9 th, .cols-9 td, .cols-10 th, .cols-10 td, .cols-11 th, .cols-11 td, .cols-12 th, .cols-12 td { font-size: 7pt; padding: 2px 3px; }
      .print-container { page-break-inside: avoid; margin-bottom: 16px; }
      .print-signatures { margin-top: 36px; display: grid; grid-template-columns: 1fr 1fr; text-align: center; font-size: 10pt; page-break-inside: avoid; }
      .tag { border: 1px solid #666; padding: 1px 6px; border-radius: 3px; font-size: 8pt; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style></head><body style="background:#fff;color:#000;">${customTitle ? `<h1 style="font-size:16pt;text-align:center;margin-bottom:16px;">${escapeHtml(customTitle)}</h1>` : ''}${bodyHtml}</body></html>`
  }

  private doPrint(): void {
    const fullHtml = this.buildPrintHtml()
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

    const signaturesBlock = `
      <div class="print-signatures">
        <div>
          <p style="margin-bottom: 60px;"><strong>Ban Giáo Lý</strong></p>
          <p style="font-size: 9pt; color: #555;">(Ký và ghi rõ họ tên)</p>
        </div>
        <div>
          <p style="margin-bottom: 60px;"><strong>Giáo Lý Viên Lớp</strong></p>
          <p style="font-size: 9pt; color: #555;">(Ký và ghi rõ họ tên)</p>
        </div>
      </div>
    `

    if (detail === 'compact') {
      const rows = cls.students.map((st, i) => {
        const tb = studentTB(st, cls.weights, term, cols)
        const cl = classify(tb)
        const filled = cols.filter(c => (st.scoresByTerm?.[term]?.[c.key]?.length ?? 0) > 0).length
        return `<tr>
          <td style="text-align: center;">${i + 1}</td>
          <td>${escapeHtml(displayName(st))}</td>
          <td style="text-align: center; font-weight: bold;">${fmt(tb)}</td>
          <td style="text-align: center;"><span class="tag ${cl.rank}">${cl.label}</span></td>
          <td style="text-align: center;">${filled}/${cols.length}</td>
        </tr>`
      }).join('')
      return `
        <div class="print-container cols-5">
          <h2>${escapeHtml(cls.name)} ${cls.year ? `· ${cls.year}` : ''}</h2>
          <p class="hint">TB · ${term === 'hk1' ? 'HK1' : 'HK2'}</p>
          <table>
            <thead><tr><th scope="col">STT</th><th scope="col">Học viên</th><th scope="col">TB</th><th scope="col">Xếp loại</th><th scope="col">Điểm đủ</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          ${signaturesBlock}
        </div>
      `
    }

    const rows = cls.students.map((st, i) => {
      const tb = studentTB(st, cls.weights, term, cols)
      const scoreCells = cols.map(c => {
        const scores: number[] = st.scoresByTerm?.[term]?.[c.key] || []
        return `<td style="text-align: center;">${scores.length ? scores.map(s => fmt(s)).join('; ') : '—'}</td>`
      }).join('')
      return `<tr>
        <td style="text-align: center;">${i + 1}</td>
        <td>${escapeHtml(displayName(st))}</td>
        ${scoreCells}
        <td style="text-align: center; font-weight: bold;">${fmt(tb)}</td>
        <td>${escapeHtml(st.ghiChu || '')}</td>
      </tr>`
    }).join('')

    return `
      <div class="print-container cols-${cols.length}">
        <h2>${escapeHtml(cls.name)} ${cls.year ? `· ${cls.year}` : ''}</h2>
        <p class="hint">${term === 'hk1' ? 'HK1' : 'HK2'} · Đầy đủ cột điểm</p>
        <table>
          <thead><tr>
            <th scope="col" style="width: 36px;">STT</th><th scope="col" style="width: 160px; text-align: left;">Học viên</th>
            ${cols.map(c => `<th scope="col">${escapeHtml(c.short)}</th>`).join('')}
            <th scope="col" style="width: 48px;">TB</th><th scope="col">Ghi chú</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${signaturesBlock}
      </div>
    `
  }
}
