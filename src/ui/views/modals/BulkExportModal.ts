import { StateManager } from '../../StateManager'
import { NotificationManager } from '../../../services/NotificationManager'
import { resolveClassColumns } from '../../../config/columns.ts'
import { studentTBContext } from '../../../core/calc.ts'
import { fmt } from '../../../views/helpers.ts'
import { downloadTextFile } from '../../../features/parishReport.ts'
import { createFocusTrap } from '../../../utils/focusTrap.ts'

export class BulkExportModal {
  private stateManager: StateManager
  private notification: NotificationManager
  private element: HTMLElement | null = null
  private _focusTrap: ReturnType<typeof createFocusTrap> | null = null
  private selectedClasses: Set<string> = new Set()
  private selectAll = true

  constructor(stateManager: StateManager, notification: NotificationManager) {
    this.stateManager = stateManager
    this.notification = notification
  }

  open(): void {
    this.ensureModal()
    const classes = this.stateManager.getVisibleClasses()
    if (this.selectAll) {
      this.selectedClasses = new Set(classes.map(c => c.id))
    }
    this.renderBody()
    this.element?.classList.remove('hidden')
    if (this.element) this._focusTrap = createFocusTrap(this.element)
  }

  close(): void {
    this._focusTrap?.destroy()
    this._focusTrap = null
    this.element?.classList.add('hidden')
  }

  private ensureModal(): void {
    let modal = document.getElementById('bulkExportModal')
    if (!modal) {
      modal = document.createElement('div')
      modal.id = 'bulkExportModal'
      modal.className = 'modal-overlay hidden'
      modal.setAttribute('role', 'dialog')
      modal.setAttribute('aria-modal', 'true')
      modal.innerHTML = `
        <div class="modal-panel max-w-lg overflow-y-auto" style="max-height:85vh">
          <div class="modal-head">
            <div>
              <h3>Xuất điểm nhiều lớp</h3>
              <p class="modal-sub">Chọn lớp và tuỳ chọn xuất CSV</p>
            </div>
            <button type="button" class="icon-btn modal-close" id="bulkExportClose" aria-label="Đóng">×</button>
          </div>
          <div class="modal-body">
            <div class="d-flex gap-2 mb-3 flex-wrap items-center">
              <label class="field-label mb-0" for="bulkExportTerm">Học kỳ</label>
              <select id="bulkExportTerm" class="input" style="width:auto">
                <option value="hk1">HK1</option>
                <option value="hk2">HK2</option>
                <option value="year" selected>Cả năm (TB cả năm)</option>
              </select>
              <label class="field-label mb-0 ml-2" for="bulkExportInfo">
                <input type="checkbox" id="bulkExportInfo" checked /> Kèm thông tin HV
              </label>
              <label class="field-label mb-0 ml-2" for="bulkExportTB">
                <input type="checkbox" id="bulkExportTB" checked /> Cột TB
              </label>
            </div>
            <div class="d-flex gap-2 mb-2 items-center">
              <button type="button" class="btn btn-ghost btn-sm" id="bulkExportSelectAll">Chọn tất cả</button>
              <button type="button" class="btn btn-ghost btn-sm" id="bulkExportDeselectAll">Bỏ chọn</button>
              <span class="hint ml-2" id="bulkExportCount"></span>
            </div>
            <div id="bulkExportList" class="class-checklist"></div>
          </div>
          <div class="modal-foot d-flex gap-2 justify-end">
            <button type="button" class="btn btn-ghost" id="bulkExportCancel">Hủy</button>
            <button type="button" class="btn btn-primary" id="bulkExportBtn">📥 Xuất CSV</button>
          </div>
        </div>
      `
      document.body.appendChild(modal)

      modal.querySelector('#bulkExportClose')?.addEventListener('click', () => this.close())
      modal.querySelector('#bulkExportCancel')?.addEventListener('click', () => this.close())
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.close()
      })
      modal.querySelector('#bulkExportSelectAll')?.addEventListener('click', () => {
        const classes = this.stateManager.getVisibleClasses()
        this.selectedClasses = new Set(classes.map(c => c.id))
        this.renderBody()
      })
      modal.querySelector('#bulkExportDeselectAll')?.addEventListener('click', () => {
        this.selectedClasses.clear()
        this.renderBody()
      })
      modal.querySelector('#bulkExportBtn')?.addEventListener('click', () => this.doExport())
    }
    this.element = modal
  }

  private renderBody(): void {
    const list = this.element?.querySelector('#bulkExportList') as HTMLElement
    if (!list) return
    const classes = this.stateManager.getVisibleClasses()

    list.innerHTML = classes.map(c => {
      const checked = this.selectedClasses.has(c.id)
      return `
        <label class="io-box d-flex gap-2 items-center p-2 mb-1 border rounded-sm cursor-pointer ${checked ? 'is-selected' : ''}" data-class-id="${c.id}">
          <input type="checkbox" class="bulk-export-cb" data-class-id="${c.id}" ${checked ? 'checked' : ''} />
          <span class="flex-1">
            <strong>${this.escapeHtml(c.name)}</strong>
            <small class="ml-2 hint">${c.students.length} HV · ${this.escapeHtml(c.year || '')}</small>
          </span>
        </label>
      `
    }).join('') || '<p class="hint">Chưa có lớp nào.</p>'

    list.querySelectorAll('.bulk-export-cb').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement
        const id = target.dataset.classId!
        if (target.checked) {
          this.selectedClasses.add(id)
        } else {
          this.selectedClasses.delete(id)
        }
        this.updateCount()
        this.updateRowStyles()
      })
    })

    this.updateCount()
  }

  private updateCount(): void {
    const el = this.element?.querySelector('#bulkExportCount')
    if (el) el.textContent = `Đã chọn: ${this.selectedClasses.size} lớp`
  }

  private updateRowStyles(): void {
    this.element?.querySelectorAll('[data-class-id]').forEach(row => {
      const id = (row as HTMLElement).dataset.classId!
      row.classList.toggle('is-selected', this.selectedClasses.has(id))
    })
  }

  private doExport(): void {
    const termSelect = this.element?.querySelector('#bulkExportTerm') as HTMLSelectElement
    const includeInfo = (this.element?.querySelector('#bulkExportInfo') as HTMLInputElement)?.checked ?? true
    const includeTB = (this.element?.querySelector('#bulkExportTB') as HTMLInputElement)?.checked ?? true
    const term = termSelect?.value as 'hk1' | 'hk2' | 'year' || 'year'

    if (this.selectedClasses.size === 0) {
      this.notification.show('Chọn ít nhất một lớp', 'warning')
      return
    }

    const classes = this.stateManager.getVisibleClasses().filter(c => this.selectedClasses.has(c.id))
    const lines: string[] = []
    const bom = '\uFEFF'

    for (const cls of classes) {
      const cols = resolveClassColumns(cls)
      const actualTerm = term === 'year' ? 'hk1' : term
      const header = includeInfo
        ? ['STT', 'Tên thánh', 'Họ đệm', 'Tên', ...cols.map(c => c.short)]
        : [...cols.map(c => c.short)]
      if (includeTB) header.push('TB')
      const rows = cls.students.map((st, i) => {
        const scores = cols.map(c => {
          const arr = st.scoresByTerm?.[actualTerm]?.[c.key] || []
          return arr.length ? arr.join(';') : ''
        })
        const row = includeInfo
          ? [String(i + 1), st.tenThanh || '', st.hoDem || '', st.ten || '', ...scores]
          : [...scores]
        if (includeTB) {
          const tb = studentTBContext(st, cls.weights, actualTerm, cols)
          row.push(fmt(tb))
        }
        return row.map(cell => csvCell(cell)).join(',')
      })

      lines.push(`"Lớp: ${csvCell(cls.name)}","Năm: ${csvCell(cls.year || '')}","HV: ${cls.students.length}","HK: ${term.toUpperCase()}"`)
      lines.push(header.map(cell => csvCell(cell)).join(','))
      lines.push(...rows)
      lines.push('')
    }

    const stamp = new Date().toISOString().slice(0, 10)
    downloadTextFile(`xuat_diem_hang_loat_${stamp}.csv`, bom + lines.join('\n'), 'text/csv;charset=utf-8')
    this.notification.show(`Đã xuất điểm ${this.selectedClasses.size} lớp`, 'success')
    this.close()
  }

  private escapeHtml(s: string): string {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }
}

function csvCell(s: string): string {
  s = String(s).replace(/"/g, '""')
  if (/[",\n]/.test(s)) return `"${s}"`
  return s
}
