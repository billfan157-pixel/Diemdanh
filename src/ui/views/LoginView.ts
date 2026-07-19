// ============================================================
// Sổ Điểm GL — Login View
// ============================================================

import { AuthManager } from '../../core/auth/AuthManager'
import { NotificationManager } from '../../services/NotificationManager'

export class LoginView {
  private authManager: AuthManager
  private notificationManager: NotificationManager
  private element: HTMLElement | null = null

  constructor(authManager: AuthManager, notificationManager: NotificationManager) {
    this.authManager = authManager
    this.notificationManager = notificationManager
  }

  render(): HTMLElement {
    const element = document.createElement('div')
    element.id = 'loginScreen'
    element.className = 'login-screen'
    element.innerHTML = this.getTemplate()
    this.element = element
    return element
  }

  bindEvents(): void {
    if (!this.element) return

    const form = this.element.querySelector('#loginForm') as HTMLFormElement
    const bioBtn = this.element.querySelector('#loginBioBtn') as HTMLButtonElement

    form?.addEventListener('submit', this.handleLogin.bind(this))
    bioBtn?.addEventListener('click', this.handleBioLogin.bind(this))
  }

  private getTemplate(): string {
    return `
      <div class="login-card">
        <div class="login-brand">✝</div>
        <h1>Sổ Điểm Giáo Lý</h1>
        <p class="login-sub">Đăng nhập để tiếp tục</p>

        <form id="loginForm" autocomplete="on">
          <label class="field-label" for="loginUser">Tài khoản</label>
          <input id="loginUser" class="input" type="text" placeholder="admin" required autocomplete="username" />

          <label class="field-label" for="loginPin" style="margin-top:10px">PIN</label>
          <input id="loginPin" class="input" type="password" placeholder="••••" required autocomplete="current-password" />

          <label class="check-all" style="margin-top:12px">
            <input type="checkbox" id="loginRemember" checked /> Ghi nhớ trên máy này
          </label>

          <button type="submit" class="btn btn-primary btn-block" style="margin-top:14px">Đăng nhập</button>
        </form>

        <div class="login-bio-wrap" id="loginBioWrap">
          <div class="login-divider"><span>hoặc</span></div>
          <button type="button" class="btn btn-bio btn-block" id="loginBioBtn">
            <span class="btn-bio-ico" aria-hidden="true">🔐</span>
            <span id="loginBioLabel">Mở bằng Face ID / vân tay</span>
          </button>
          <p class="hint login-bio-hint" id="loginBioHint" style="margin-top:8px;text-align:center">
            Lần đầu: đăng nhập PIN → bật sinh trắc trong sidebar.
          </p>
        </div>

        <p class="hint" style="margin-top:14px;text-align:center">
          Mặc định: <strong>admin</strong> / PIN <strong>1234</strong><br>
          (Ban Giáo lý — vào app bấm <strong>Đổi PIN</strong> ngay)
        </p>

        <p id="loginError" class="login-error hidden"></p>
      </div>
    `
  }

  private async handleLogin(e: Event): Promise<void> {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const userInput = form.querySelector('#loginUser') as HTMLInputElement
    const pinInput = form.querySelector('#loginPin') as HTMLInputElement
    const remember = (form.querySelector('#loginRemember') as HTMLInputElement).checked
    const errorEl = this.element?.querySelector('#loginError') as HTMLElement

    const username = userInput.value.trim()
    const pin = pinInput.value

    if (!username || !pin) return

    try {
      const result = await this.authManager.login(username, pin, remember)

      if (!result.ok) {
        this.showError(errorEl, result.error || 'Sai tài khoản hoặc PIN.')
        pinInput.value = ''
        pinInput.focus()
        return
      }

      this.hideError(errorEl)
      this.notificationManager.show(`Xin chào ${result.user!.displayName || result.user!.username}`, 'success')

      // Trigger app to show main view
      window.dispatchEvent(new CustomEvent('gl:login', { detail: result }))
    } catch (e: any) {
      this.showError(errorEl, e.message || 'Lỗi đăng nhập')
    }
  }

  private async handleBioLogin(): Promise<void> {
    const result = await this.authManager.loginWithBiometric()
    const errorEl = this.element?.querySelector('#loginError') as HTMLElement

    if (!result.ok) {
      this.showError(errorEl, result.error || 'Xác thực sinh trắc học thất bại')
      return
    }

    this.notificationManager.show(`Xin chào ${result.user!.displayName || result.user!.username}`, 'success')
    window.dispatchEvent(new CustomEvent('gl:login', { detail: result }))
  }

  private showError(el: HTMLElement, message: string): void {
    if (!el) return
    el.textContent = message
    el.classList.remove('hidden')
  }

  private hideError(el: HTMLElement): void {
    if (!el) return
    el.classList.add('hidden')
    el.textContent = ''
  }
}