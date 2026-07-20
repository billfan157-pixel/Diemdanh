// ============================================================
// Parent invite / token modal (Phase 3.4)
// ============================================================

import { StateManager } from '../../StateManager'
import { AuthManager } from '../../../core/auth/AuthManager'
import { NotificationManager } from '../../../services/NotificationManager'
import { displayName } from '../../../config/constants.ts'
import { parentReportUrl } from '../../../features/parentReport.ts'

export class ParentInviteModal {
  private stateManager: StateManager
  private authManager: AuthManager
  private notification: NotificationManager
  private element: HTMLElement | null = null
  private classId: string | null = null

  constructor(
    stateManager: StateManager,
    authManager: AuthManager,
    notification: NotificationManager
  ) {
    this.stateManager = stateManager
    this.authManager = authManager
    this.notification = notification
  }

  open(classId?: string | null): void {
    this.classId = classId || this.stateManager.getState().activeClassId
    if (!this.classId) {
      this.notification.show('Chọn lớp trước', 'warning')
      return
    }
    this.ensureModal()
    this.renderStudents()
    this.element?.classList.remove('hidden')
  }

  close(): void {
    this.element?.classList.add('hidden')
  }

  private ensureModal(): void {
    let modal = document.getElementById('parentInviteModal')
    if (!modal) {
      modal = document.createElement('div')
      modal.id = 'parentInviteModal'
      modal.className = 'modal-overlay hidden'
      modal.setAttribute('role', 'dialog')
      modal.setAttribute('aria-modal', 'true')
      modal.innerHTML = `
        <div class="modal-panel" style="max-width:520px">
          <div class="modal-head">
            <div>
              <h3>Phiếu điểm phụ huynh</h3>
              <p class="modal-sub">Link chỉ xem · hết hạn sau số ngày chọn</p>
            </div>
            <button type="button" class="icon-btn modal-close" id="parentInviteClose" aria-label="Đóng">×</button>
          </div>
          <div class="modal-body">
            <label class="field-label" for="parentExpireDays">Hết hạn sau (ngày)</label>
            <input type="number" id="parentExpireDays" class="input" value="30" min="1" max="365" style="width:100px;margin-bottom:12px" />
            <div id="parentInviteList"></div>
            <div id="parentInviteResult" class="hidden" style="margin-top:12px;padding:10px;border:1px solid var(--color-border,#ddd);border-radius:8px"></div>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn btn-primary" id="parentInviteDone">Đóng</button>
          </div>
        </div>
      `
      document.body.appendChild(modal)
      modal.querySelector('#parentInviteClose')?.addEventListener('click', () => this.close())
      modal.querySelector('#parentInviteDone')?.addEventListener('click', () => this.close())
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.close()
      })
    }
    this.element = modal
  }

  private renderStudents(): void {
    const list = this.element?.querySelector('#parentInviteList') as HTMLElement
    if (!list || !this.classId) return
    const cls = this.stateManager.getClass(this.classId)
    if (!cls) return

    list.innerHTML = cls.students.map(s => `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid var(--color-border,#eee)">
        <div>
          <strong>${escapeHtml(displayName(s))}</strong>
          <div class="hint" style="font-size:0.75rem">${this.activeTokenHint(cls.id, s.id)}</div>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" data-invite-student="${s.id}">Tạo link</button>
      </div>
    `).join('') || '<p class="hint">Chưa có học viên</p>'

    list.querySelectorAll('[data-invite-student]').forEach(btn => {
      btn.addEventListener('click', () => {
        const studentId = (btn as HTMLElement).dataset.inviteStudent!
        this.createLink(studentId)
      })
    })
  }

  private activeTokenHint(classId: string, studentId: string): string {
    const tokens = this.stateManager.getParentTokensForStudent(classId, studentId)
      .filter(t => t.expiresAt > Date.now())
    if (!tokens.length) return 'Chưa có link còn hạn'
    const latest = tokens.sort((a, b) => b.expiresAt - a.expiresAt)[0]
    return `Hết hạn: ${new Date(latest.expiresAt).toLocaleDateString('vi-VN')}`
  }

  private createLink(studentId: string): void {
    if (!this.classId) return
    const daysEl = this.element?.querySelector('#parentExpireDays') as HTMLInputElement
    const days = Math.max(1, Math.min(365, parseInt(daysEl?.value || '30', 10) || 30))
    const user = this.authManager.getCurrentUser()
    const token = this.stateManager.createParentToken(this.classId, studentId, {
      expiresInDays: days,
      createdBy: user?.id || 'unknown'
    })
    if (!token) {
      this.notification.show('Không tạo được link', 'error')
      return
    }
    const url = parentReportUrl(token.token)
    const result = this.element?.querySelector('#parentInviteResult') as HTMLElement
    if (result) {
      result.classList.remove('hidden')
      result.innerHTML = `
        <p style="margin:0 0 8px;font-size:0.85rem">Link chỉ xem (hết hạn ${new Date(token.expiresAt).toLocaleString('vi-VN')}):</p>
        <input type="text" class="input" id="parentInviteUrl" readonly value="${escapeAttr(url)}" style="width:100%;margin-bottom:8px" />
        <button type="button" class="btn btn-secondary btn-sm" id="parentCopyUrl">Sao chép</button>
      `
      result.querySelector('#parentCopyUrl')?.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(url)
          this.notification.show('Đã sao chép link', 'success')
        } catch {
          ;(result.querySelector('#parentInviteUrl') as HTMLInputElement)?.select()
        }
      })
    }
    this.renderStudents()
    this.notification.show('Đã tạo phiếu phụ huynh', 'success')
  }
}

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttr(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}
