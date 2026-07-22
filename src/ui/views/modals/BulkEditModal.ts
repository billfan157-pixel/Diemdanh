import { StateManager } from '../../StateManager'
import { NotificationManager } from '../../../services/NotificationManager'
import { resolveClassColumns } from '../../../config/columns.ts'
import { fmt } from '../../../views/helpers.ts'
import { debounce } from '../../../config/constants.ts'
import { validateScoreInputEl } from '../../../utils/scoreInput.ts'
import { type StudentData } from '../../../services/storage/StorageAdapter.types.ts'

export class BulkEditModal {
  private stateManager: StateManager
  private notificationManager: NotificationManager
  private element: HTMLElement | null = null
  private classId: string | null = null
  private students: StudentData[] = []
  private onComplete: (() => void) | null = null

  constructor(stateManager: StateManager, notificationManager: NotificationManager) {
    this.stateManager = stateManager
    this.notificationManager = notificationManager
  }

  open(classId: string, students: StudentData[], onComplete?: () => void): void {
    this.classId = classId
    this.students = students
    this.onComplete = onComplete || null
    this.render()
  }

  close(): void {
    const modal = this.element as any
    if (modal) { modal.open = false }
  }

  private render(): void {
    const cls = this.stateManager.getClass(this.classId!)
    if (!cls) return
    const cols = resolveClassColumns(cls)
    const rawTerm = this.stateManager.getState().activeTerm
    const term: 'hk1' | 'hk2' = rawTerm === 'year' ? 'hk1' : rawTerm

    this.ensureModal()
    const body = this.element?.querySelector('#bulkModalBody')
    if (!body) return

    body.innerHTML = `
      <p class="hint mb-3">Đang sửa <strong>${this.students.length}</strong> học viên · ${term === 'hk1' ? 'HK1' : 'HK2'}</p>
      <div class="mb-3">
        <label class="d-flex items-center gap-2 text-muted" style="font-size:.85rem">
          <input type="checkbox" id="bulkOverwrite" checked />
          Ghi đè điểm cũ (bỏ tick để thêm điểm)
        </label>
      </div>
      <div class="bulk-col-list">
        ${cols.map(c => `
          <div class="bulk-col-row" data-col="${c.key}">
            <label class="bulk-col-label">${c.label}</label>
            <input type="number" class="bulk-score-input" min="0" max="10" step="0.25" placeholder="0–10" inputmode="decimal" autocomplete="off" />
            <span class="bulk-col-current"></span>
          </div>
        `).join('')}
      </div>
      <div class="actions" style="margin-top:12px">
        <gl-button variant="ghost" id="bulkModalCancel">Hủy</gl-button>
        <gl-button variant="success" id="bulkApplyBtn">✅ Áp dụng</gl-button>
      </div>
    `

    cols.forEach(c => {
      const row = body.querySelector(`.bulk-col-row[data-col="${c.key}"]`)
      if (!row) return
      const currentEl = row.querySelector('.bulk-col-current')
      const allScores = this.students
        .map(st => st.scoresByTerm?.[term]?.[c.key] || [])
        .flat()
        .filter(v => v != null)
      if (allScores.length) {
        const avg = allScores.reduce((a, b) => a + b, 0) / allScores.length
        currentEl!.textContent = `TB hiện tại: ${fmt(avg)} (${allScores.length} điểm)`
      }
    })

    body.querySelector('#bulkModalCancel')?.addEventListener('click', () => this.close())
    body.querySelector('#bulkApplyBtn')?.addEventListener('click', () => this.apply())

    const validateDebounced = debounce((input: HTMLInputElement) => {
      validateScoreInputEl(input)
    }, 200)
    body.querySelectorAll<HTMLInputElement>('.bulk-score-input').forEach(input => {
      input.addEventListener('input', () => validateDebounced(input))
    })
  }

  private ensureModal(): void {
    let modal = document.getElementById('bulkEditModal')
    if (!modal) {
      modal = document.createElement('gl-modal')
      modal.id = 'bulkEditModal'
      modal.setAttribute('heading', '✏️ Sửa điểm hàng loạt')
      modal.setAttribute('size', 'sm')

      modal.innerHTML = `<div id="bulkModalBody"></div>`
      document.body.appendChild(modal)
      modal.addEventListener('gl-close', () => this.close())
    }
    this.element = modal
    const modalEl = this.element as any
    modalEl.open = true
  }

  private apply(): void {
    if (!this.classId) return
    const cls = this.stateManager.getClass(this.classId)
    if (!cls) return
    const cols = resolveClassColumns(cls)
    const rawTerm = this.stateManager.getState().activeTerm
    const term: 'hk1' | 'hk2' = rawTerm === 'year' ? 'hk1' : rawTerm
    const overwrite = (this.element?.querySelector('#bulkOverwrite') as HTMLInputElement)?.checked ?? true

    let applied = 0
    let hasInvalid = false
    for (const st of this.students) {
      for (const col of cols) {
        const row = this.element?.querySelector(`.bulk-col-row[data-col="${col.key}"]`)
        if (!row) continue
        const input = row.querySelector<HTMLInputElement>('.bulk-score-input')
        if (!input) continue
        if (!input.value.trim()) continue
        const value = validateScoreInputEl(input)
        if (value === null) {
          hasInvalid = true
          continue
        }

        if (overwrite) {
          this.stateManager.setScore(this.classId, st.id, col.key, [value], term)
        } else {
          this.stateManager.addScore(this.classId, st.id, col.key, value, term)
        }
        applied++
      }
    }

    this.close()
    if (hasInvalid) {
      this.notificationManager.show('Có điểm không hợp lệ (0–10) — kiểm tra lại các ô đỏ.', 'error')
    } else if (applied > 0) {
      this.notificationManager.show(`✅ Đã sửa ${applied} điểm cho ${this.students.length} học viên`, 'success')
    } else {
      this.notificationManager.show('Không có điểm nào được nhập — hãy nhập ít nhất một giá trị.', 'warning')
    }
    this.onComplete?.()
  }
}
