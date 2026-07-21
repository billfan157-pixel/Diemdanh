// ============================================================
// Sổ Điểm GL — Conflict Resolution Modal Component
// ============================================================

import { ConflictData } from '../../../services/sync/SyncEngine'
import { NotificationManager } from '../../../services/NotificationManager'
import { createFocusTrap } from '../../../utils/focusTrap.ts'

export class ConflictModal {
  private notification: NotificationManager
  private element: HTMLElement | null = null
  private currentConflict: ConflictData | null = null
  private _focusTrap: ReturnType<typeof createFocusTrap> | null = null

  constructor(notification: NotificationManager) {
    this.notification = notification
  }

  open(conflict: ConflictData): void {
    this.currentConflict = conflict
    this.ensureModalElement()
    
    // Fill dynamic content
    const detailsEl = this.element?.querySelector('#conflictDetails') as HTMLElement
    if (detailsEl) {
      detailsEl.innerHTML = this.renderConflictDiff(conflict)
    }

    this.element?.classList.remove('hidden')
    if (this.element) this._focusTrap = createFocusTrap(this.element)
  }

  close(): void {
    this._focusTrap?.destroy()
    this._focusTrap = null
    this.element?.classList.add('hidden')
    this.currentConflict = null
  }

  private ensureModalElement(): void {
    let modal = document.getElementById('conflictModal')
    if (!modal) {
      modal = document.createElement('div')
      modal.id = 'conflictModal'
      modal.className = 'modal-overlay hidden'
      modal.setAttribute('role', 'dialog')
      modal.setAttribute('aria-modal', 'true')

      modal.innerHTML = `
        <div class="modal-panel modal-panel-md" style="max-width: 600px;">
          <div class="modal-head">
            <div>
              <h3 style="color: var(--color-danger)">⚠️ Phát hiện xung đột dữ liệu</h3>
              <p class="modal-sub">Dữ liệu trên máy này cũ hơn phiên bản mới cập nhật trên Cloud</p>
            </div>
            <button type="button" class="icon-btn modal-close" id="conflictModalClose" aria-label="Đóng">×</button>
          </div>
          <div class="modal-body" style="padding-top: 10px;">
            <div id="conflictDetails"></div>
          </div>
            <div class="modal-foot gap-3">
            <button type="button" class="btn btn-ghost" id="conflictCancelBtn">Bỏ qua</button>
            <button type="button" class="btn btn-success" id="conflictKeepLocalBtn">Giữ bản máy này</button>
            <button type="button" class="btn btn-primary ml-auto" id="conflictTakeCloudBtn">Lấy bản Cloud</button>
          </div>
        </div>
      `
      document.body.appendChild(modal)
      this.bindEvents(modal)
    }
    this.element = modal
  }

  private renderConflictDiff(conflict: ConflictData): string {
    const op = conflict.op
    const local = op.data || {}
    const cloud = conflict.cloudRecord || {}

    let name = 'Bản ghi'
    if (op.table === 'classes') name = `Lớp "${local.name || cloud.name || ''}"`
    if (op.table === 'students') name = `Học viên "${local.ten_thanh || ''} ${local.ho_dem || ''} ${local.ten || ''}"`

    // Extract fields that differ
    const allKeys = new Set([...Object.keys(local), ...Object.keys(cloud)])
    const diffRows: string[] = []

    for (const key of allKeys) {
      if (key === 'rev' || key === 'id' || key === 'class_id' || key === 'created_at' || key === 'updated_at') continue
      
      const localVal = JSON.stringify(local[key] !== undefined ? local[key] : '')
      const cloudVal = JSON.stringify(cloud[key] !== undefined ? cloud[key] : '')

      if (localVal !== cloudVal) {
        const localDisp = local[key] !== undefined ? String(local[key]) : '(Rỗng)'
        const cloudDisp = cloud[key] !== undefined ? String(cloud[key]) : '(Rỗng)'
        diffRows.push(`
          <tr>
            <td class="font-semibold border-b" style="padding: 6px 10px;">${escapeHtml(key)}</td>
            <td class="border-b" style="color: var(--color-danger); padding: 6px 10px;">${escapeHtml(localDisp)}</td>
            <td class="border-b" style="color: var(--color-success); padding: 6px 10px;">${escapeHtml(cloudDisp)}</td>
          </tr>
        `)
      }
    }

    return `
      <p class="mb-3">Xung đột xảy ra tại: <strong>${escapeHtml(name)}</strong> (Bảng: <code>${escapeHtml(op.table)}</code>, ID: <code>${escapeHtml(op.id)}</code>)</p>
      
      <table class="w-full text-left" style="border-collapse: collapse; margin-top: 10px; font-size: 0.9rem;">
        <thead>
          <tr style="background: var(--surface2)">
            <th scope="col" style="padding: 8px 10px; border-bottom: 2px solid var(--border)">Trường dữ liệu</th>
            <th scope="col" style="padding: 8px 10px; border-bottom: 2px solid var(--border)">Máy của bạn</th>
            <th scope="col" style="padding: 8px 10px; border-bottom: 2px solid var(--border)">Máy chủ Cloud</th>
          </tr>
        </thead>
        <tbody>
          ${diffRows.length > 0 ? diffRows.join('') : '<tr><td colspan="3" class="text-center p-3" style="color:var(--text2)">Chỉ khác biệt số thứ tự sửa đổi (revision)</td></tr>'}
        </tbody>
      </table>
      
      <div class="hint mt-4" style="line-height: 1.4;">
        💡 <strong>Giữ bản máy này:</strong> Ghi đè dữ liệu trên Cloud bằng dữ liệu của bạn.<br>
        💡 <strong>Lấy bản Cloud:</strong> Hủy các thay đổi trên máy này và tải dữ liệu mới từ Cloud về.
      </div>
    `
  }

  private bindEvents(modal: HTMLElement): void {
    const closeBtn = modal.querySelector('#conflictModalClose')
    const cancelBtn = modal.querySelector('#conflictCancelBtn')
    const keepLocalBtn = modal.querySelector('#conflictKeepLocalBtn')
    const takeCloudBtn = modal.querySelector('#conflictTakeCloudBtn')

    const closeHandler = () => {
      this.close()
    }

    closeBtn?.addEventListener('click', closeHandler)
    cancelBtn?.addEventListener('click', closeHandler)

    keepLocalBtn?.addEventListener('click', async () => {
      if (this.currentConflict) {
        const resolve = this.currentConflict.resolve
        this.close()
        await resolve('keep_local')
        this.notification.show('Đã ghi đè bản local lên đám mây', 'success')
      }
    })

    takeCloudBtn?.addEventListener('click', async () => {
      if (this.currentConflict) {
        const resolve = this.currentConflict.resolve
        this.close()
        await resolve('take_cloud')
        this.notification.show('Đã nạp lại dữ liệu mới nhất từ đám mây', 'success')
      }
    })
  }
}

function escapeHtml(s: any): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
