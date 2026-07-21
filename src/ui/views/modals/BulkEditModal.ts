import { StateManager } from '../../StateManager'
import { NotificationManager } from '../../../services/NotificationManager'
import { resolveClassColumns } from '../../../config/columns.ts'
import { fmt } from '../../../views/helpers.ts'
import { type StudentData } from '../../../services/storage/StorageAdapter.types.ts'

export class BulkEditModal {
  private stateManager: StateManager
  private notificationManager: NotificationManager
  private overlay: HTMLElement | null = null
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
    if (this.overlay) {
      this.overlay.remove()
      this.overlay = null
    }
  }

  private render(): void {
    const cls = this.stateManager.getClass(this.classId!)
    if (!cls) return
    const cols = resolveClassColumns(cls)
    const rawTerm = this.stateManager.getState().activeTerm
    const term: 'hk1' | 'hk2' = rawTerm === 'year' ? 'hk1' : rawTerm

    this.overlay = document.createElement('div')
    this.overlay.className = 'modal-overlay'
    this.overlay.innerHTML = `
<div class="modal-panel" style="max-width:480px">
  <h2>✏️ Sửa điểm hàng loạt <button class="modal-close" id="bulkModalClose">×</button></h2>
  <p class="hint" style="margin-bottom:12px">Đang sửa <strong>${this.students.length}</strong> học viên · ${term === 'hk1' ? 'HK1' : 'HK2'}</p>
  <div id="bulkModalBody">
    <div style="margin-bottom:12px">
      <label style="display:flex;align-items:center;gap:6px;font-size:.85rem;color:#64748b">
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
  </div>
  <div class="actions">
    <button class="btn btn-secondary" id="bulkModalCancel">Hủy</button>
    <button class="btn btn-success" id="bulkApplyBtn">✅ Áp dụng</button>
  </div>
</div>`
    document.body.appendChild(this.overlay)

    // Show current scores for each column
    cols.forEach(c => {
      const row = this.overlay!.querySelector(`.bulk-col-row[data-col="${c.key}"]`)
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

    this.overlay.querySelector('#bulkModalClose')?.addEventListener('click', () => this.close())
    this.overlay.querySelector('#bulkModalCancel')?.addEventListener('click', () => this.close())
    this.overlay.querySelector('#bulkApplyBtn')?.addEventListener('click', () => this.apply())
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close()
    })
  }

  private apply(): void {
    if (!this.classId) return
    const cls = this.stateManager.getClass(this.classId)
    if (!cls) return
    const cols = resolveClassColumns(cls)
    const rawTerm = this.stateManager.getState().activeTerm
    const term: 'hk1' | 'hk2' = rawTerm === 'year' ? 'hk1' : rawTerm
    const overwrite = (this.overlay?.querySelector('#bulkOverwrite') as HTMLInputElement)?.checked ?? true

    let applied = 0
    for (const st of this.students) {
      for (const col of cols) {
        const row = this.overlay?.querySelector(`.bulk-col-row[data-col="${col.key}"]`)
        if (!row) continue
        const input = row.querySelector<HTMLInputElement>('.bulk-score-input')
        if (!input) continue
        const value = parseFloat(input.value)
        if (isNaN(value) || value < 0 || value > 10) continue

        if (overwrite) {
          this.stateManager.setScore(this.classId, st.id, col.key, [value], term)
        } else {
          this.stateManager.addScore(this.classId, st.id, col.key, value, term)
        }
        applied++
      }
    }

    this.close()
    if (applied > 0) {
      this.notificationManager.show(`✅ Đã sửa ${applied} điểm cho ${this.students.length} học viên`, 'success')
    } else {
      this.notificationManager.show('Không có điểm nào được nhập — hãy nhập ít nhất một giá trị.', 'warning')
    }
    this.onComplete?.()
  }
}
