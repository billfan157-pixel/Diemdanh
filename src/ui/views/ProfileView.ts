// ============================================================
// Sổ Điểm GL — Profile View Component
// ============================================================

import { StateManager } from '../StateManager'
import { AuthManager } from '../../core/auth/AuthManager'
import { getInstallPrompt } from '../../services/PWAInstall.ts'

export class ProfileView {
  private container: HTMLElement | null = null

  constructor(
    private stateManager: StateManager,
    private authManager: AuthManager,
    private onAction: (action: string) => void
  ) {}

  render(container: HTMLElement): void {
    this.container = container
    const user = this.authManager.getCurrentUser()

    container.innerHTML = `
      <div class="me-view">
        <div class="me-hero">
          <div class="me-avatar">${this.escapeHtml(user?.displayName?.charAt(0) || '?')}</div>
          <div>
            <div class="me-name">${this.escapeHtml(user?.displayName || 'Người dùng')}</div>
            <div class="me-role">${user?.role === 'ban_gl' ? 'Ban Giáo lý' : 'Giáo lý viên'}</div>
            <div class="me-user">${this.escapeHtml(user?.username || '')}</div>
          </div>
        </div>

        <div class="me-section">
          <div class="me-section-title">Tài khoản</div>
          <button class="me-row" data-me-action="pin">
            <div class="me-row-txt">
              <strong>Đổi PIN</strong>
              <small>Thay đổi mã PIN đăng nhập</small>
            </div>
            <span class="me-row-chev">▸</span>
          </button>
          <button class="me-row" data-me-action="biometric">
            <div class="me-row-txt">
              <strong>Sinh trắc học</strong>
              <small>${user?.biometricEnabled ? 'Đã bật' : 'Chưa bật'}</small>
            </div>
            <span class="me-row-chev">▸</span>
          </button>
        </div>

        <div class="me-section">
          <div class="me-section-title">Dữ liệu</div>
          <button class="me-row" data-me-action="backup">
            <div class="me-row-txt">
              <strong>Sao lưu JSON</strong>
              <small>Tải file backup toàn bộ dữ liệu</small>
            </div>
            <span class="me-row-chev">▸</span>
          </button>
          <button class="me-row" data-me-action="restore">
            <div class="me-row-txt">
              <strong>Khôi phục backup</strong>
              <small>Chọn file để khôi phục</small>
            </div>
            <span class="me-row-chev">▸</span>
          </button>
          <button class="me-row" data-me-action="parish-report">
            <div class="me-row-txt">
              <strong>Báo cáo Ban GL</strong>
              <small>Xuất CSV / bản in họp Ban</small>
            </div>
            <span class="me-row-chev">▸</span>
          </button>
          <button class="me-row" data-me-action="year-compare">
            <div class="me-row-txt">
              <strong>So sánh năm học</strong>
              <small>TB và % đủ điểm giữa các năm</small>
            </div>
            <span class="me-row-chev">▸</span>
          </button>
          <button class="me-row" data-me-action="archive-year">
            <div class="me-row-txt">
              <strong>Lưu trữ / mở năm học</strong>
              <small>Khóa sửa điểm năm đã chọn</small>
            </div>
            <span class="me-row-chev">▸</span>
          </button>
          <button class="me-row" data-me-action="columns">
            <div class="me-row-txt">
              <strong>Cột điểm lớp</strong>
              <small>Thêm / sửa / hệ số cột điểm</small>
            </div>
            <span class="me-row-chev">▸</span>
          </button>
          <button class="me-row" data-me-action="invite">
            <div class="me-row-txt">
              <strong>Phiếu phụ huynh</strong>
              <small>Tạo link chỉ xem, có hết hạn</small>
            </div>
            <span class="me-row-chev">▸</span>
          </button>
        </div>

        <div class="me-section">
          <div class="me-section-title">Cài đặt</div>
          <button class="me-row" data-me-action="settings">
            <div class="me-row-txt">
              <strong>Cài đặt ứng dụng</strong>
              <small>Cấu hình Supabase, sao lưu tự động...</small>
            </div>
            <span class="me-row-chev">▸</span>
          </button>
          <button class="me-row" data-me-action="theme">
            <div class="me-row-txt">
              <strong>Giao diện</strong>
              <small>${this.getThemeLabel()}</small>
            </div>
            <span class="me-row-chev">▸</span>
          </button>
          <button class="me-row" data-me-action="print-settings">
            <div class="me-row-txt">
              <strong>Mẫu in / Phiếu mời</strong>
              <small>Cấu hình giáo hạt, giáo xứ, tiêu đề...</small>
            </div>
            <span class="me-row-chev">▸</span>
          </button>
          <button class="me-row hidden" data-me-action="install" id="meInstallRow">
            <div class="me-row-txt">
              <strong>Cài đặt ứng dụng</strong>
              <small>Cài Sổ Điểm GL lên màn hình chính</small>
            </div>
            <span class="me-row-chev">▸</span>
          </button>
        </div>

        <div class="me-section">
          <div class="me-section-title">Hỗ trợ</div>
          <button class="me-row" data-me-action="help">
            <div class="me-row-txt">
              <strong>Hướng dẫn</strong>
              <small>Xem cách sử dụng ứng dụng</small>
            </div>
            <span class="me-row-chev">▸</span>
          </button>
          <button class="me-row" data-me-action="feedback">
            <div class="me-row-txt">
              <strong>Góp ý / Báo lỗi</strong>
              <small>Gửi phản hồi cho nhà phát triển</small>
            </div>
            <span class="me-row-chev">▸</span>
          </button>
        </div>

        <div class="me-section">
          <div class="me-section-title">Tài khoản</div>
          <button class="me-row me-logout" data-me-action="logout">
            <div class="me-row-txt">
              <strong>Đăng xuất</strong>
              <small>Thoát khỏi tài khoản hiện tại</small>
            </div>
          </button>
        </div>
      </div>
    `

    this.updateInstallButtonVisibility()
    this.bindEvents()
  }

  private bindEvents(): void {
    if (!this.container) return
    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      const row = target.closest('[data-me-action]')
      if (!row) return
      const action = row.getAttribute('data-me-action')!
      this.onAction(action)
    })
  }

  updateInstallButtonVisibility(): void {
    if (!this.container) return
    const btn = this.container.querySelector('#meInstallRow') as HTMLElement | null
    if (!btn) return
    btn.style.display = getInstallPrompt() ? '' : 'none'
  }

  private getThemeLabel(): string {
    const theme = this.stateManager.getTheme()
    if (theme === 'light') return 'Giao diện Sáng'
    if (theme === 'dark') return 'Giao diện Tối'
    return 'Mặc định hệ thống'
  }

  private escapeHtml(s: string): string {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
}
