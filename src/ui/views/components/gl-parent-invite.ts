import { LitElement, html } from 'lit'
import { StateManager } from '../../StateManager'
import { AuthManager } from '../../../core/auth/AuthManager'
import { NotificationManager } from '../../../services/NotificationManager'
import { displayName } from '../../../config/constants.ts'
import { parentReportUrl } from '../../../features/parentReport.ts'

export class GlParentInvite extends LitElement {
  createRenderRoot() { return this }

  static properties = {
    open: { type: Boolean, reflect: true },
    stateManager: { type: Object },
    authManager: { type: Object },
    notification: { type: Object },
    classId: { type: String },
    _generatedUrl: { state: true },
    _generatedExpiry: { state: true },
  }

  declare open: boolean
  declare stateManager: StateManager
  declare authManager: AuthManager
  declare notification: NotificationManager
  declare classId: string
  declare _generatedUrl: string
  declare _generatedExpiry: string

  constructor() {
    super()
    this.open = false
  }

  private _onClose() {
    this.open = false
    this.dispatchEvent(new CustomEvent('gl-close', { bubbles: true, composed: true }))
  }

  private _activeTokenHint(classId: string, studentId: string): string {
    const tokens = this.stateManager.getParentTokensForStudent(classId, studentId)
      .filter(t => t.expiresAt > Date.now())
    if (!tokens.length) return 'Chưa có link còn hạn'
    const latest = tokens.sort((a, b) => b.expiresAt - a.expiresAt)[0]
    return `Hết hạn: ${new Date(latest.expiresAt).toLocaleDateString('vi-VN')}`
  }

  private _createLink(studentId: string) {
    if (!this.classId) return
    const daysEl = this.querySelector<HTMLInputElement>('#parentExpireDays')
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
    this._generatedUrl = url
    this._generatedExpiry = new Date(token.expiresAt).toLocaleString('vi-VN')
    this.notification.show('Đã tạo phiếu phụ huynh', 'success')
  }

  private async _copyUrl() {
    try {
      await navigator.clipboard.writeText(this._generatedUrl)
      this.notification.show('Đã sao chép link', 'success')
    } catch {
      const input = this.querySelector<HTMLInputElement>('#parentInviteUrl')
      input?.select()
    }
  }

  render() {
    const cls = this.classId ? this.stateManager.getClass(this.classId) : null
    const students = cls?.students || []

    return html`
      <gl-modal
        heading="Phiếu điểm phụ huynh"
        subtitle="Link chỉ xem · hết hạn sau số ngày chọn"
        size="md"
        ?open=${this.open}
        @gl-close=${this._onClose}
      >
        <label class="field-label" for="parentExpireDays">Hết hạn sau (ngày)</label>
        <input type="number" id="parentExpireDays" class="input mb-3" value="30" min="1" max="365" style="width:100px" />

        <div id="parentInviteList">
          ${students.length === 0 ? html`<p class="hint">Chưa có học viên</p>` : ''}
          ${students.map(s => html`
            <div class="d-flex items-center justify-between gap-2 px-0 py-2 border-b">
              <div>
                <strong>${displayName(s)}</strong>
                <div class="hint text-xs">${this._activeTokenHint(cls!.id, s.id)}</div>
              </div>
              <gl-button variant="secondary" size="sm" @click=${() => this._createLink(s.id)}>Tạo link</gl-button>
            </div>
          `)}
        </div>

        ${this._generatedUrl ? html`
          <div id="parentInviteResult" class="mt-3 border rounded-lg" style="padding:10px">
            <p class="m-0 mb-2" style="font-size:0.85rem">Link chỉ xem (hết hạn ${this._generatedExpiry}):</p>
            <input type="text" class="input w-full mb-2" id="parentInviteUrl" readonly .value=${this._generatedUrl} />
            <gl-button variant="secondary" size="sm" @click=${this._copyUrl}>Sao chép</gl-button>
          </div>
        ` : ''}

        <gl-button slot="footer" variant="ghost" @click=${this._onClose}>Đóng</gl-button>
      </gl-modal>
    `
  }
}

customElements.define('gl-parent-invite', GlParentInvite)

declare global {
  interface HTMLElementTagNameMap {
    'gl-parent-invite': GlParentInvite
  }
}
