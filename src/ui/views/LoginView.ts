// ============================================================
// Sổ Điểm GL — Login View
// ============================================================

import { AuthManager } from '../../core/auth/AuthManager'
import { NotificationManager } from '../../services/NotificationManager'

export class LoginView {
  private authManager: AuthManager
  private notificationManager: NotificationManager
  private element: HTMLElement | null = null
  private enteredPin: string = ''

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

    // Listen to changes on the hidden input field (essential for Playwright E2E compatibility)
    pinInput?.addEventListener('input', () => {
      this.enteredPin = pinInput.value
      this.updatePinIndicators()
    })

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

    // Keypad click handlers
    this.element.querySelectorAll('.keypad-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = (btn as HTMLElement).dataset.key
        if (key === 'clear') {
          this.enteredPin = ''
        } else if (key === 'del') {
          this.enteredPin = this.enteredPin.slice(0, -1)
        } else if (key && this.enteredPin.length < 4) {
          this.enteredPin += key
        }
        this.updatePinIndicators()

        // Auto submit on 4 digits
        if (this.enteredPin.length === 4) {
          form.requestSubmit()
        }
      })
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

            <input id="loginPin" type="password" style="width: 1px; height: 1px; opacity: 0; border: none; padding: 0; margin: 0; pointer-events: none; position: absolute;" required autocomplete="current-password" />
            
            <label class="field-label" style="margin-top:14px; display:block; text-align:center;">Mã PIN đăng nhập</label>
            <div class="passcode-dots-container" style="display:flex; justify-content:center; gap:16px; margin: 10px 0 18px;">
              <span class="passcode-dot" style="width:14px; height:14px; border-radius:50%; border:2px solid var(--color-border-strong); transition: background 150ms, border-color 150ms;"></span>
              <span class="passcode-dot" style="width:14px; height:14px; border-radius:50%; border:2px solid var(--color-border-strong); transition: background 150ms, border-color 150ms;"></span>
              <span class="passcode-dot" style="width:14px; height:14px; border-radius:50%; border:2px solid var(--color-border-strong); transition: background 150ms, border-color 150ms;"></span>
              <span class="passcode-dot" style="width:14px; height:14px; border-radius:50%; border:2px solid var(--color-border-strong); transition: background 150ms, border-color 150ms;"></span>
            </div>

            <div class="pin-keypad" id="pinKeypad">
              <button type="button" class="keypad-btn" data-key="1">1</button>
              <button type="button" class="keypad-btn" data-key="2">2</button>
              <button type="button" class="keypad-btn" data-key="3">3</button>
              <button type="button" class="keypad-btn" data-key="4">4</button>
              <button type="button" class="keypad-btn" data-key="5">5</button>
              <button type="button" class="keypad-btn" data-key="6">6</button>
              <button type="button" class="keypad-btn" data-key="7">7</button>
              <button type="button" class="keypad-btn" data-key="8">8</button>
              <button type="button" class="keypad-btn" data-key="9">9</button>
              <button type="button" class="keypad-btn btn-clear" data-key="clear">C</button>
              <button type="button" class="keypad-btn" data-key="0">0</button>
              <button type="button" class="keypad-btn btn-del" data-key="del">⌫</button>
            </div>
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
          this.enteredPin = ''
          this.updatePinIndicators()
          this.triggerErrorEffects()
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
          this.triggerErrorEffects()
          return
        }
      }

      this.hideError(errorEl)
      this.notificationManager.show(`Xin chào ${result.user!.displayName || result.user!.username}`, 'success')

      // Trigger app to show main view
      window.dispatchEvent(new CustomEvent('gl:login', { detail: result }))
    } catch (e: any) {
      this.showError(errorEl, e.message || 'Lỗi đăng nhập')
      this.triggerErrorEffects()
    }
  }

  private async handleBioLogin(): Promise<void> {
    const result = await this.authManager.loginWithBiometric()
    const errorEl = this.element?.querySelector('#loginError') as HTMLElement

    if (!result.ok) {
      this.showError(errorEl, result.error || 'Xác thực sinh trắc học thất bại')
      this.triggerErrorEffects()
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

  private updatePinIndicators(): void {
    if (!this.element) return
    const dots = this.element.querySelectorAll('.passcode-dot')
    dots.forEach((dot, idx) => {
      if (idx < this.enteredPin.length) {
        dot.classList.add('active')
        dot.setAttribute('style', 'width:14px; height:14px; border-radius:50%; background:var(--color-primary); border-color:var(--color-primary);')
      } else {
        dot.classList.remove('active')
        dot.setAttribute('style', 'width:14px; height:14px; border-radius:50%; border:2px solid var(--color-border-strong);')
      }
    })
    const pinInput = this.element.querySelector('#loginPin') as HTMLInputElement
    if (pinInput) pinInput.value = this.enteredPin
  }

  private triggerErrorEffects(): void {
    if (!this.element) return
    const card = this.element.querySelector('.login-card')
    if (card) {
      card.classList.remove('shake')
      void (card as HTMLElement).offsetWidth // trigger reflow
      card.classList.add('shake')
    }
    
    // Vibrate device
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100])
    }
  }
}