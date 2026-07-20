// ============================================================
// Columns + Weights config modal (Phase 3.1)
// ============================================================

import { StateManager } from '../../StateManager'
import { NotificationManager } from '../../../services/NotificationManager'
import { ScoreColumnDef } from '../../../services/storage/StorageAdapter.types'
import { resolveClassColumns } from '../../../config/columns.ts'

export class ColumnsModal {
  private stateManager: StateManager
  private notification: NotificationManager
  private element: HTMLElement | null = null
  private classId: string | null = null
  private draft: ScoreColumnDef[] = []
  private onSaved: (() => void) | null = null

  constructor(stateManager: StateManager, notification: NotificationManager) {
    this.stateManager = stateManager
    this.notification = notification
  }

  open(classId: string, onSaved?: () => void): void {
    this.classId = classId
    this.onSaved = onSaved || null
    const cls = this.stateManager.getClass(classId)
    if (!cls) {
      this.notification.show('Không tìm thấy lớp', 'error')
      return
    }
    if (this.stateManager.isClassArchived(classId)) {
      this.notification.show('Năm học đã lưu trữ — không sửa cột điểm', 'warning')
      return
    }

    this.draft = resolveClassColumns(cls).map(c => ({
      ...c,
      defaultWeight: cls.weights[c.key] ?? c.defaultWeight
    }))
    this.ensureModal()
    this.renderBody()
    this.element?.classList.remove('hidden')
  }

  close(): void {
    this.element?.classList.add('hidden')
  }

  private ensureModal(): void {
    let modal = document.getElementById('columnsModal')
    if (!modal) {
      modal = document.createElement('div')
      modal.id = 'columnsModal'
      modal.className = 'modal-overlay hidden'
      modal.setAttribute('role', 'dialog')
      modal.setAttribute('aria-modal', 'true')
      modal.innerHTML = `
        <div class="modal-panel" style="max-width:520px">
          <div class="modal-head">
            <div>
              <h3>Cột điểm &amp; hệ số</h3>
              <p class="modal-sub">Cấu hình theo lớp · không hardcode</p>
            </div>
            <button type="button" class="icon-btn modal-close" id="columnsModalClose" aria-label="Đóng">×</button>
          </div>
          <div class="modal-body">
            <div id="columnsModalList"></div>
            <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
              <input type="text" id="columnsNewLabel" class="input" placeholder="Tên cột mới" style="flex:1;min-width:140px" />
              <input type="text" id="columnsNewShort" class="input" placeholder="Viết tắt" maxlength="4" style="width:72px" />
              <button type="button" class="btn btn-secondary" id="columnsAddBtn">＋ Thêm cột</button>
            </div>
            <p class="hint" style="margin-top:10px;font-size:0.8rem">
              Cột trống không tính vào TB. Xóa cột sẽ mất điểm của cột đó trên lớp này.
            </p>
          </div>
          <div class="modal-foot" style="display:flex;gap:8px;justify-content:flex-end">
            <button type="button" class="btn btn-ghost" id="columnsResetBtn">Khôi phục mặc định</button>
            <button type="button" class="btn btn-primary" id="columnsSaveBtn">Lưu</button>
          </div>
        </div>
      `
      document.body.appendChild(modal)

      modal.querySelector('#columnsModalClose')?.addEventListener('click', () => this.close())
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.close()
      })
      modal.querySelector('#columnsAddBtn')?.addEventListener('click', () => this.addDraftColumn())
      modal.querySelector('#columnsResetBtn')?.addEventListener('click', () => {
        import('../../../config/columns.ts').then(({ cloneDefaultCols }) => {
          this.draft = cloneDefaultCols()
          this.renderBody()
        })
      })
      modal.querySelector('#columnsSaveBtn')?.addEventListener('click', () => this.save())
    }
    this.element = modal
  }

  private renderBody(): void {
    const list = this.element?.querySelector('#columnsModalList') as HTMLElement
    if (!list) return

    list.innerHTML = this.draft.map((c, i) => `
      <div class="io-box" data-col-idx="${i}" style="margin-bottom:8px;border:1px solid var(--color-border, #ddd);padding:10px;border-radius:8px;display:grid;grid-template-columns:1fr 72px 72px auto;gap:8px;align-items:center">
        <input type="text" class="input col-label" value="${escapeAttr(c.label)}" aria-label="Tên cột" />
        <input type="text" class="input col-short" value="${escapeAttr(c.short)}" maxlength="4" aria-label="Viết tắt" />
        <input type="number" class="input col-weight" value="${c.defaultWeight}" min="0.1" step="0.1" aria-label="Hệ số" />
        <button type="button" class="icon-btn danger col-remove" title="Xóa cột" ${this.draft.length <= 1 ? 'disabled' : ''}>🗑️</button>
      </div>
    `).join('')

    list.querySelectorAll('[data-col-idx]').forEach(row => {
      const idx = Number((row as HTMLElement).dataset.colIdx)
      const labelEl = row.querySelector('.col-label') as HTMLInputElement
      const shortEl = row.querySelector('.col-short') as HTMLInputElement
      const weightEl = row.querySelector('.col-weight') as HTMLInputElement
      const removeBtn = row.querySelector('.col-remove') as HTMLButtonElement

      labelEl?.addEventListener('change', () => {
        this.draft[idx].label = labelEl.value.trim() || this.draft[idx].label
      })
      shortEl?.addEventListener('change', () => {
        this.draft[idx].short = (shortEl.value.trim() || this.draft[idx].short).slice(0, 4)
      })
      weightEl?.addEventListener('change', () => {
        const n = parseFloat(weightEl.value)
        this.draft[idx].defaultWeight = !isNaN(n) && n > 0 ? n : 1
      })
      removeBtn?.addEventListener('click', () => {
        if (this.draft.length <= 1) return
        this.draft.splice(idx, 1)
        this.renderBody()
      })
    })
  }

  private addDraftColumn(): void {
    const labelEl = this.element?.querySelector('#columnsNewLabel') as HTMLInputElement
    const shortEl = this.element?.querySelector('#columnsNewShort') as HTMLInputElement
    const label = labelEl?.value.trim()
    if (!label) {
      this.notification.show('Nhập tên cột mới', 'warning')
      return
    }
    import('../../../config/columns.ts').then(({ makeColumnDef }) => {
      const def = makeColumnDef(label, shortEl?.value || '', this.draft.map(c => c.key))
      this.draft.push(def)
      if (labelEl) labelEl.value = ''
      if (shortEl) shortEl.value = ''
      this.renderBody()
    })
  }

  private save(): void {
    if (!this.classId) return
    // Sync latest input values
    this.element?.querySelectorAll('[data-col-idx]').forEach(row => {
      const idx = Number((row as HTMLElement).dataset.colIdx)
      const labelEl = row.querySelector('.col-label') as HTMLInputElement
      const shortEl = row.querySelector('.col-short') as HTMLInputElement
      const weightEl = row.querySelector('.col-weight') as HTMLInputElement
      if (!this.draft[idx]) return
      this.draft[idx].label = labelEl.value.trim() || this.draft[idx].label
      this.draft[idx].short = (shortEl.value.trim() || this.draft[idx].short).slice(0, 4)
      const n = parseFloat(weightEl.value)
      this.draft[idx].defaultWeight = !isNaN(n) && n > 0 ? n : 1
    })

    const cols = this.draft.map(c => ({
      key: c.key,
      short: c.short,
      label: c.label,
      defaultWeight: c.defaultWeight
    }))
    const weights = Object.fromEntries(cols.map(c => [c.key, c.defaultWeight]))

    const ok = this.stateManager.setClassColumns(this.classId, cols)
    if (!ok) {
      this.notification.show('Không lưu được cột điểm', 'error')
      return
    }
    this.stateManager.updateWeights(this.classId, weights)
    this.notification.show('Đã lưu cấu hình cột điểm', 'success')
    this.close()
    this.onSaved?.()
  }
}

function escapeAttr(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}
