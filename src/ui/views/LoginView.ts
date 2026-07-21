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

    // Tab switching logic
    const tabPinBtn = this.element.querySelector('#tabPinBtn') as HTMLButtonElement
    const tabEmailBtn = this.element.querySelector('#tabEmailBtn') as HTMLButtonElement
    const pinFields = this.element.querySelector('#pinFields') as HTMLElement
    const emailFields = this.element.querySelector('#emailFields') as HTMLElement
    
    const userInput = this.element.querySelector('#loginUser') as HTMLInputElement
    const pinInput = this.element.querySelector('#loginPin') as HTMLInputElement
    const emailInput = this.element.querySelector('#loginEmail') as HTMLInputElement
    const passwordInput = this.element.querySelector('#loginPassword') as HTMLInputElement

    tabPinBtn?.addEventListener('click', () => {
      tabPinBtn.classList.add('active')
      tabEmailBtn.classList.remove('active')
      pinFields.classList.remove('hidden')
      emailFields.classList.add('hidden')
      userInput.required = true
      pinInput.required = true
      emailInput.required = false
      passwordInput.required = false
      tabPinBtn.setAttribute('aria-selected', String(tabPinBtn.classList.contains('active')))
      tabEmailBtn.setAttribute('aria-selected', String(tabEmailBtn.classList.contains('active')))
    })

    tabEmailBtn?.addEventListener('click', () => {
      tabEmailBtn.classList.add('active')
      tabPinBtn.classList.remove('active')
      emailFields.classList.remove('hidden')
      pinFields.classList.add('hidden')
      userInput.required = false
      pinInput.required = false
      emailInput.required = true
      passwordInput.required = true
      tabPinBtn.setAttribute('aria-selected', String(tabPinBtn.classList.contains('active')))
      tabEmailBtn.setAttribute('aria-selected', String(tabEmailBtn.classList.contains('active')))
    })
  }

  private getTemplate(): string {
    return `
      <div class="login-card">
        <div class="login-brand">✝</div>
        <h1>Sổ Điểm Giáo Lý</h1>
        <p class="login-sub">Đăng nhập để tiếp tục</p>

        <div class="login-tabs" role="tablist" aria-label="Phương thức đăng nhập">
          <button type="button" id="tabPinBtn" class="tab-btn active" role="tab" aria-selected="true" aria-controls="pinFields">Mã PIN (Offline)</button>
          <button type="button" id="tabEmailBtn" class="tab-btn" role="tab" aria-selected="false" aria-controls="emailFields">Email Cloud</button>
        </div>

        <form id="loginForm" autocomplete="on">
          <div id="pinFields" role="tabpanel">
            <label class="field-label" for="loginUser">Tài khoản</label>
            <input id="loginUser" class="input" type="text" placeholder="admin" required autocomplete="username" />

            <label class="field-label" for="loginPin" style="margin-top:10px">PIN</label>
            <input id="loginPin" class="input" type="password" inputmode="numeric" placeholder="••••" required autocomplete="current-password" />
          </div>

          <div id="emailFields" class="hidden" role="tabpanel" hidden>
            <label class="field-label" for="loginEmail">Email</label>
            <input id="loginEmail" class="input" type="email" placeholder="giao.ly.vien@example.com" autocomplete="email" />

            <label class="field-label" for="loginPassword" style="margin-top:10px">Mật khẩu</label>
            <input id="loginPassword" class="input" type="password" placeholder="••••••••" autocomplete="current-password" />
          </div>

          <label class="check-all mt-3">
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
          <p class="hint login-bio-hint mt-2 text-center" id="loginBioHint">
            Lần đầu: đăng nhập PIN → bật sinh trắc trong sidebar.
          </p>
        </div>

        ${this.authManager.defaultPin ? `
        <p class="hint text-center" style="margin-top:14px">
          Mặc định PIN: <strong>admin</strong> / PIN <strong>${this.authManager.defaultPin}</strong><br>
          (Vào app bấm <strong>Đổi PIN</strong> hoặc <strong>Cấu hình Cloud</strong>)
        </p>` : ''}

        <p id="loginError" class="login-error hidden"></p>
      </div>
    `
  }

  private async handleLogin(e: Event): Promise<void> {
    e.preventDefault()
    if (!this.element) return

    const tabPinBtn = this.element.querySelector('#tabPinBtn') as HTMLButtonElement
    const isPinMode = tabPinBtn.classList.contains('active')

    const remember = (this.element.querySelector('#loginRemember') as HTMLInputElement).checked
    const errorEl = this.element.querySelector('#loginError') as HTMLElement

    try {
      let result
      if (isPinMode) {
        const userInput = this.element.querySelector('#loginUser') as HTMLInputElement
        const pinInput = this.element.querySelector('#loginPin') as HTMLInputElement
        const username = userInput.value.trim()
        const pin = pinInput.value

        if (!username || !pin) return
        result = await this.authManager.login(username, pin, remember)

        if (!result.ok) {
          this.showError(errorEl, result.error || 'Sai tài khoản hoặc PIN.')
          pinInput.value = ''
          pinInput.focus()
          return
        }
      } else {
        const emailInput = this.element.querySelector('#loginEmail') as HTMLInputElement
        const passwordInput = this.element.querySelector('#loginPassword') as HTMLInputElement
        const email = emailInput.value.trim()
        const password = passwordInput.value

        if (!email || !password) return
        
        // Show loading state
        const submitBtn = this.element.querySelector('button[type="submit"]') as HTMLButtonElement
        const origText = submitBtn.textContent || ''
        submitBtn.disabled = true
        submitBtn.textContent = 'Đang đăng nhập...'
        this.hideError(errorEl)

        try {
          result = await this.authManager.loginWithEmail(email, password, remember)
        } finally {
          submitBtn.disabled = false
          submitBtn.textContent = origText
        }

        if (!result.ok) {
          this.showError(errorEl, result.error || 'Đăng nhập Cloud thất bại.')
          passwordInput.value = ''
          passwordInput.focus()
          return
        }
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