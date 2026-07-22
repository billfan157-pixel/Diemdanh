import { LitElement, html } from 'lit'
import type { AuthManager } from '../../core/auth/AuthManager'
import type { StateManager } from '../StateManager'
import { getInstallPrompt } from '../../services/PWAInstall'

export class GlProfileView extends LitElement {
  static properties = {
    stateManager: { type: Object },
    authManager: { type: Object },
  }

  declare stateManager: StateManager
  declare authManager: AuthManager

  constructor() {
    super()
    this.stateManager = null as unknown as StateManager
    this.authManager = null as unknown as AuthManager
  }

  createRenderRoot() {
    return this
  }

  connectedCallback() {
    super.connectedCallback()
  }

  private _onAction(action: string) {
    this.dispatchEvent(new CustomEvent('gl-profile-action', {
      detail: { action },
      bubbles: true,
      composed: true,
    }))
  }

  private _getThemeLabel(): string {
    if (!this.stateManager) return ''
    const theme = this.stateManager.getTheme()
    if (theme === 'light') return 'Giao diện Sáng'
    if (theme === 'dark') return 'Giao diện Tối'
    return 'Mặc định hệ thống'
  }

  private _getNotificationStatus(): string {
    if ('Notification' in window && Notification.permission === 'granted') return 'Đã bật'
    if (Notification.permission === 'denied') return 'Đã tắt'
    return 'Chưa thiết lập'
  }

  private _hasInstallPrompt(): boolean {
    return !!getInstallPrompt()
  }

  render() {
    const user = this.authManager?.getCurrentUser()

    return html`
      <div class="me-view">
        <div class="me-hero">
          <div class="me-avatar">${this._escape(user?.displayName?.charAt(0) || '?')}</div>
          <div>
            <div class="me-name">${this._escape(user?.displayName || 'Người dùng')}</div>
            <div class="me-role">${user?.role === 'ban_gl' ? 'Ban Giáo lý' : 'Giáo lý viên'}</div>
            <div class="me-user">${this._escape(user?.username || '')}</div>
          </div>
        </div>

        <details class="me-section" open>
          <summary class="me-section-title">👤 Tài khoản</summary>
          <div class="me-section-content">
            <button class="me-row" @click=${() => this._onAction('pin')}>
              <div class="me-row-txt">
                <strong>Đổi PIN</strong>
                <small>Thay đổi mã PIN đăng nhập</small>
              </div>
              <span class="me-row-chev">▸</span>
            </button>
            <button class="me-row" @click=${() => this._onAction('biometric')}>
              <div class="me-row-txt">
                <strong>Sinh trắc học</strong>
                <small>${user?.biometricEnabled ? 'Đã bật' : 'Chưa bật'}</small>
              </div>
              <span class="me-row-chev">▸</span>
            </button>
          </div>
        </details>

        <details class="me-section">
          <summary class="me-section-title">📂 Dữ liệu học vụ</summary>
          <div class="me-section-content">
            <button class="me-row" @click=${() => this._onAction('backup')}>
              <div class="me-row-txt">
                <strong>Sao lưu JSON</strong>
                <small>Tải file backup toàn bộ dữ liệu</small>
              </div>
              <span class="me-row-chev">▸</span>
            </button>
            <button class="me-row" @click=${() => this._onAction('restore')}>
              <div class="me-row-txt">
                <strong>Khôi phục backup</strong>
                <small>Chọn file để khôi phục</small>
              </div>
              <span class="me-row-chev">▸</span>
            </button>
            <button class="me-row" @click=${() => this._onAction('parish-report')}>
              <div class="me-row-txt">
                <strong>Báo cáo Ban GL</strong>
                <small>Xuất CSV / bản in họp Ban</small>
              </div>
              <span class="me-row-chev">▸</span>
            </button>
            <button class="me-row" @click=${() => this._onAction('year-compare')}>
              <div class="me-row-txt">
                <strong>So sánh năm học</strong>
                <small>TB và % đủ điểm giữa các năm</small>
              </div>
              <span class="me-row-chev">▸</span>
            </button>
            <button class="me-row" @click=${() => this._onAction('archive-year')}>
              <div class="me-row-txt">
                <strong>Lưu trữ / mở năm học</strong>
                <small>Khóa sửa điểm năm đã chọn</small>
              </div>
              <span class="me-row-chev">▸</span>
            </button>
            <button class="me-row" @click=${() => this._onAction('columns')}>
              <div class="me-row-txt">
                <strong>Cột điểm lớp</strong>
                <small>Thêm / sửa / hệ số cột điểm</small>
              </div>
              <span class="me-row-chev">▸</span>
            </button>
            <button class="me-row" @click=${() => this._onAction('invite')}>
              <div class="me-row-txt">
                <strong>Phiếu phụ huynh</strong>
                <small>Tạo link chỉ xem, có hết hạn</small>
              </div>
              <span class="me-row-chev">▸</span>
            </button>
          </div>
        </details>

        <details class="me-section">
          <summary class="me-section-title">⚙️ Cài đặt hệ thống</summary>
          <div class="me-section-content">
            <button class="me-row" @click=${() => this._onAction('settings')}>
              <div class="me-row-txt">
                <strong>Cài đặt ứng dụng</strong>
                <small>Cấu hình Supabase, sao lưu tự động...</small>
              </div>
              <span class="me-row-chev">▸</span>
            </button>
            <button class="me-row" @click=${() => this._onAction('theme')}>
              <div class="me-row-txt">
                <strong>Giao diện</strong>
                <small>${this._getThemeLabel()}</small>
              </div>
              <span class="me-row-chev">▸</span>
            </button>
            <button class="me-row" @click=${() => this._onAction('print-settings')}>
              <div class="me-row-txt">
                <strong>Mẫu in / Phiếu mời</strong>
                <small>Cấu hình giáo hạt, giáo xứ, tiêu đề...</small>
              </div>
              <span class="me-row-chev">▸</span>
            </button>
            <button class="me-row" @click=${() => this._onAction('notification-permission')}>
              <div class="me-row-txt">
                <strong>Thông báo</strong>
                <small id="meNotifStatus">${this._getNotificationStatus()}</small>
              </div>
              <span class="me-row-chev">▸</span>
            </button>
            <button
              class="me-row ${this._hasInstallPrompt() ? '' : 'hidden'}"
              @click=${() => this._onAction('install')}
              id="meInstallRow"
            >
              <div class="me-row-txt">
                <strong>Cài đặt ứng dụng</strong>
                <small>Cài Sổ Điểm GL lên màn hình chính</small>
              </div>
              <span class="me-row-chev">▸</span>
            </button>
          </div>
        </details>

        <details class="me-section">
          <summary class="me-section-title">💬 Hỗ trợ & Phản hồi</summary>
          <div class="me-section-content">
            <button class="me-row" @click=${() => this._onAction('help')}>
              <div class="me-row-txt">
                <strong>Hướng dẫn</strong>
                <small>Xem cách sử dụng ứng dụng</small>
              </div>
              <span class="me-row-chev">▸</span>
            </button>
            <button class="me-row" @click=${() => this._onAction('feedback')}>
              <div class="me-row-txt">
                <strong>Góp ý / Báo lỗi</strong>
                <small>Gửi phản hồi cho nhà phát triển</small>
              </div>
              <span class="me-row-chev">▸</span>
            </button>
          </div>
        </details>

        <div class="me-section">
          <button class="me-row me-logout" @click=${() => this._onAction('logout')}>
            <div class="me-row-txt">
              <strong>Đăng xuất</strong>
              <small>Thoát khỏi tài khoản hiện tại</small>
            </div>
          </button>
        </div>
      </div>
    `
  }

  private _escape(s: string): string {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
}

customElements.define('gl-profile-view', GlProfileView)

declare global {
  interface HTMLElementTagNameMap {
    'gl-profile-view': GlProfileView
  }
}
