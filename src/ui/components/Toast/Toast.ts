import { LitElement, html, css } from 'lit'

export type ToastType = 'info' | 'success' | 'warning' | 'error'

export class GlToast extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: fixed;
      bottom: var(--space-4);
      right: var(--space-4);
      z-index: var(--z-toast);
      max-width: 360px;
      animation: toast-in var(--duration-normal) var(--easing-standard);
    }
    .toast {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
      font-weight: 600;
      box-shadow: var(--shadow-lg);
      color: white;
    }
    .toast-info { background: var(--color-primary); }
    .toast-success { background: var(--color-success); }
    .toast-warning { background: var(--color-warning); }
    .toast-error { background: var(--color-danger); }
    .toast-close {
      margin-left: auto;
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      padding: 2px 4px;
      font-size: 1rem;
      opacity: 0.8;
    }
    .toast-close:hover { opacity: 1; }

    @keyframes toast-in {
      from { opacity: 0; transform: translateY(100%); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes toast-out {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(100%); }
    }
    .hiding { animation: toast-out var(--duration-fast) forwards; }
  `

  static properties = {
    type: { type: String },
    message: { type: String },
    closable: { type: Boolean },
    duration: { type: Number },
  }

  declare type: ToastType
  declare message: string
  declare closable: boolean
  declare duration: number

  private _hideTimer: ReturnType<typeof setTimeout> | null = null
  private _hiding = false

  constructor() {
    super()
    this.type = 'info'
    this.message = ''
    this.closable = true
    this.duration = 4000
  }

  connectedCallback() {
    super.connectedCallback()
    if (this.duration > 0) {
      this._hideTimer = setTimeout(() => this.hide(), this.duration)
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    if (this._hideTimer) clearTimeout(this._hideTimer)
  }

  hide() {
    if (this._hiding) return
    this._hiding = true
    const el = this.shadowRoot!.querySelector('.toast')!
    el.classList.add('hiding')
    setTimeout(() => {
      this.dispatchEvent(new CustomEvent('gl-toast-end', { bubbles: true, composed: true }))
      this.remove()
    }, 200)
  }

  render() {
    const icons: Record<ToastType, string> = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
    }

    return html`
      <div class="toast toast-${this.type}">
        <span>${icons[this.type]}</span>
        <span>${this.message}</span>
        ${this.closable ? html`<button class="toast-close" @click=${this.hide} aria-label="Đóng">×</button>` : ''}
      </div>
    `
  }
}

customElements.define('gl-toast', GlToast)

declare global {
  interface HTMLElementTagNameMap {
    'gl-toast': GlToast
  }
}
