import { LitElement, html } from 'lit'
import { classMap } from 'lit/directives/class-map.js'
import type { AuthManager } from '../../core/auth/AuthManager'
import type { NotificationManager } from '../../services/NotificationManager'

export class GlLoginView extends LitElement {
  static properties = {
    authManager: { type: Object },
    notificationManager: { type: Object },
  }

  declare authManager: AuthManager
  declare notificationManager: NotificationManager

  private enteredPin = ''
  private mode: 'pin' | 'email' = 'pin'
  private error = ''
  private shaking = false
  private isSubmitting = false

  private readonly keypadKeys = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    'clear', '0', 'del',
  ]

  constructor() {
    super()
    this.authManager = null as unknown as AuthManager
    this.notificationManager = null as unknown as NotificationManager
  }

  createRenderRoot() {
    return this
  }

  private _onKeypadPress(key: string) {
    if (key === 'clear') {
      this.enteredPin = ''
    } else if (key === 'del') {
      this.enteredPin = this.enteredPin.slice(0, -1)
    } else if (key && this.enteredPin.length < 4) {
      this.enteredPin += key
    }
    this.requestUpdate()

    if (this.enteredPin.length === 4) {
      const form = this.querySelector<HTMLFormElement>('#loginForm')
      form?.requestSubmit()
    }
  }

  private switchMode(m: 'pin' | 'email') {
    this.mode = m
    this.error = ''
    this.requestUpdate()
  }

  private _handleBioLogin() {
    if (!this.authManager) return
    this.authManager.loginWithBiometric().then(result => {
      if (!result.ok) {
        this.error = result.error || 'Xác thực sinh trắc học thất bại'
        this.shaking = true
        setTimeout(() => { this.shaking = false; this.requestUpdate() }, 500)
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100])
        }
        this.requestUpdate()
        return
      }
      this.notificationManager?.show(
        `Xin chào ${result.user!.displayName || result.user!.username}`, 'success'
      )
      window.dispatchEvent(new CustomEvent('gl:login', { detail: result }))
    })
  }

  private async _handleLogin(e: Event) {
    e.preventDefault()
    this.error = ''

    try {
      let result
      if (this.mode === 'pin') {
        const usernameInput = this.querySelector<HTMLInputElement>('#loginUser')
        const username = usernameInput?.value.trim()
        if (!username || !this.enteredPin) return

        const remember = (this.querySelector<HTMLInputElement>('#loginRemember'))?.checked ?? true
        result = await this.authManager.login(username, this.enteredPin, remember)

        if (!result.ok) {
          this.enteredPin = ''
          this.error = result.error || 'Sai tài khoản hoặc PIN.'
          this.shaking = true
          setTimeout(() => { this.shaking = false; this.requestUpdate() }, 500)
          if ('vibrate' in navigator) {
            navigator.vibrate([100, 50, 100])
          }
          this.requestUpdate()
          return
        }
      } else {
        const emailInput = this.querySelector<HTMLInputElement>('#loginEmail')
        const passwordInput = this.querySelector<HTMLInputElement>('#loginPassword')
        const email = emailInput?.value.trim()
        const password = passwordInput?.value
        if (!email || !password) return

        const remember = (this.querySelector<HTMLInputElement>('#loginRemember'))?.checked ?? true
        this.isSubmitting = true
        this.requestUpdate()

        try {
          result = await this.authManager.loginWithEmail(email, password, remember)
        } finally {
          this.isSubmitting = false
          this.requestUpdate()
        }

        if (!result.ok) {
          this.error = result.error || 'Đăng nhập Cloud thất bại.'
          if (passwordInput) passwordInput.value = ''
          passwordInput?.focus()
          this.shaking = true
          setTimeout(() => { this.shaking = false; this.requestUpdate() }, 500)
          if ('vibrate' in navigator) {
            navigator.vibrate([100, 50, 100])
          }
          return
        }
      }

      this.notificationManager?.show(
        `Xin chào ${result.user!.displayName || result.user!.username}`, 'success'
      )
      window.dispatchEvent(new CustomEvent('gl:login', { detail: result }))
    } catch (e: any) {
      this.error = e.message || 'Lỗi đăng nhập'
      this.shaking = true
      setTimeout(() => { this.shaking = false; this.requestUpdate() }, 500)
      this.requestUpdate()
    }
  }

  render() {
    return html`
      <div class="login-screen">
        <div class="login-card ${classMap({ shake: this.shaking })}">
          <div class="login-brand">✝</div>
          <h1>Sổ Điểm Giáo Lý</h1>
          <p class="login-sub">Đăng nhập để tiếp tục</p>

          <div class="login-tabs" role="tablist" aria-label="Phương thức đăng nhập">
            <button
              type="button"
              class="tab-btn ${classMap({ active: this.mode === 'pin' })}"
              role="tab"
              aria-selected=${this.mode === 'pin'}
              aria-controls="pinFields"
              @click=${() => this.switchMode('pin')}
            >Mã PIN (Offline)</button>
            <button
              type="button"
              class="tab-btn ${classMap({ active: this.mode === 'email' })}"
              role="tab"
              aria-selected=${this.mode === 'email'}
              aria-controls="emailFields"
              @click=${() => this.switchMode('email')}
            >Email Cloud</button>
          </div>

          <form id="loginForm" @submit=${this._handleLogin} autocomplete="on">
            ${this.mode === 'pin' ? html`
              <div id="pinFields" role="tabpanel">
                <label class="field-label" for="loginUser">Tài khoản</label>
                <input id="loginUser" class="input" type="text" placeholder="admin" required autocomplete="username" />

                <input
                  id="loginPin"
                  type="password"
                  style="width: 1px; height: 1px; opacity: 0; border: none; padding: 0; margin: 0; pointer-events: none; position: absolute;"
                  .value=${this.enteredPin}
                  required
                  autocomplete="current-password"
                  readonly
                />

                <label class="field-label" style="margin-top:14px; display:block; text-align:center;">Mã PIN đăng nhập</label>
                <div class="passcode-dots-container" style="display:flex; justify-content:center; gap:16px; margin: 10px 0 18px;">
                  ${[0, 1, 2, 3].map(i => html`
                    <span
                      class="passcode-dot"
                      style=${i < this.enteredPin.length
                        ? 'width:14px; height:14px; border-radius:50%; background:var(--color-primary); border-color:var(--color-primary);'
                        : 'width:14px; height:14px; border-radius:50%; border:2px solid var(--color-border-strong);'}
                    ></span>
                  `)}
                </div>

                <div class="pin-keypad" id="pinKeypad">
                  ${this.keypadKeys.map(key => {
                      return html`
                      <button
                        type="button"
                        class="keypad-btn ${classMap({ 'btn-clear': key === 'clear', 'btn-del': key === 'del' })}"
                        data-key=${key}
                        @click=${() => this._onKeypadPress(key)}
                      >${key === 'clear' ? 'C' : key === 'del' ? '⌫' : key}</button>
                    `
                    })}
                </div>
              </div>
            ` : html`
              <div id="emailFields" role="tabpanel">
                <label class="field-label" for="loginEmail">Email</label>
                <input id="loginEmail" class="input" type="email" placeholder="giao.ly.vien@example.com" autocomplete="email" />

                <label class="field-label" for="loginPassword" style="margin-top:10px">Mật khẩu</label>
                <input id="loginPassword" class="input" type="password" placeholder="••••••••" autocomplete="current-password" />
              </div>
            `}

            <label class="check-all mt-3">
              <input type="checkbox" id="loginRemember" checked /> Ghi nhớ trên máy này
            </label>

            <button
              type="submit"
              class="btn btn-primary btn-block"
              style="margin-top:14px"
              ?disabled=${this.isSubmitting}
            >${this.isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
          </form>

          <div class="login-bio-wrap" id="loginBioWrap">
            <div class="login-divider"><span>hoặc</span></div>
            <button type="button" class="btn btn-bio btn-block" id="loginBioBtn" @click=${this._handleBioLogin}>
              <span class="btn-bio-ico" aria-hidden="true">🔐</span>
              <span id="loginBioLabel">Mở bằng Face ID / vân tay</span>
            </button>
            <p class="hint login-bio-hint mt-2 text-center" id="loginBioHint">
              Lần đầu: đăng nhập PIN → bật sinh trắc trong sidebar.
            </p>
          </div>

          ${this.authManager?.defaultPin ? html`
            <p class="hint text-center" style="margin-top:14px">
              Mặc định PIN: <strong>admin</strong> / PIN <strong>${this.authManager.defaultPin}</strong><br />
              (Vào app bấm <strong>Đổi PIN</strong> hoặc <strong>Cấu hình Cloud</strong>)
            </p>
          ` : ''}

          ${this.error ? html`
            <p id="loginError" class="login-error">${this.error}</p>
          ` : html`
            <p id="loginError" class="login-error hidden"></p>
          `}
        </div>
      </div>
    `
  }
}

customElements.define('gl-login-view', GlLoginView)

declare global {
  interface HTMLElementTagNameMap {
    'gl-login-view': GlLoginView
  }
}
