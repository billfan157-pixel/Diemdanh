import { LitElement, html, css } from 'lit'
import { classMap } from 'lit/directives/class-map.js'
import { createFocusTrap } from '../../../utils/focusTrap'

export type ModalSize = 'sm' | 'md' | 'lg'

export class GlModal extends LitElement {
  static styles = css`
    :host { display: contents; }
    .modal-overlay {
      position: fixed;
      inset: 0;
      z-index: var(--z-modal-backdrop);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-4);
      background: rgba(15, 23, 42, 0.5);
      -webkit-backdrop-filter: blur(4px);
      backdrop-filter: blur(4px);
      animation: fade-in var(--duration-fast) var(--easing-standard);
    }
    .modal-overlay.hidden { display: none; }
    .modal-panel {
      background: var(--color-bg-elevated);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-xl);
      width: 100%;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      animation: dialogPop var(--duration-normal) var(--easing-spring);
    }
    .modal-panel-sm { max-width: 400px; }
    .modal-panel-md { max-width: 520px; }
    .modal-panel-lg { max-width: 720px; }
    .modal-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-4) var(--space-5) var(--space-3);
      border-bottom: 1px solid var(--color-border);
    }
    .modal-head h3 {
      margin: 0;
      font-size: var(--font-size-lg);
      font-weight: 750;
      letter-spacing: -0.02em;
    }
    .modal-sub {
      margin: 2px 0 0;
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
    }
    .modal-body {
      padding: var(--space-4) var(--space-5);
      overflow-y: auto;
      flex: 1;
    }
    .modal-foot {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-5);
      border-top: 1px solid var(--color-border);
    }
    .modal-close {
      width: var(--touch-target-min);
      height: var(--touch-target-min);
      border: 0;
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--color-text-muted);
      font-size: 1.3rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .modal-close:hover { background: var(--color-bg-hover); }

    @media (max-width: 767px) {
      .modal-overlay { align-items: flex-end; padding: 0; padding-top: env(safe-area-inset-top); }
      .modal-panel {
        max-width: 100% !important;
        max-height: 85vh;
        border-radius: var(--radius-xl) var(--radius-xl) 0 0;
      }
    }

    @keyframes fade-in {
      from { opacity: 0; } to { opacity: 1; }
    }
    @keyframes dialogPop {
      from { opacity: 0; transform: scale(0.95) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
  `

  static properties = {
    open: { type: Boolean, reflect: true },
    size: { type: String },
    heading: { type: String },
    subtitle: { type: String },
    closable: { type: Boolean },
  }

  declare open: boolean
  declare size: ModalSize
  declare heading: string
  declare subtitle: string
  declare closable: boolean

  private _focusTrap: ReturnType<typeof createFocusTrap> | null = null
  private _boundOnKeydown: (e: KeyboardEvent) => void

  constructor() {
    super()
    this.open = false
    this.size = 'md'
    this.heading = ''
    this.subtitle = ''
    this.closable = true
    this._boundOnKeydown = this._onKeydown.bind(this)
  }

  private _onClose() {
    this.open = false
    this.dispatchEvent(new CustomEvent('gl-close', { bubbles: true, composed: true }))
  }

  private _onOverlayClick(e: MouseEvent) {
    if (this.closable && (e.target as HTMLElement).classList.contains('modal-overlay')) {
      this._onClose()
    }
  }

  private _onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && this.closable) {
      this._onClose()
    }
  }

  connectedCallback() {
    super.connectedCallback()
    document.addEventListener('keydown', this._boundOnKeydown)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    document.removeEventListener('keydown', this._boundOnKeydown)
    this._focusTrap?.destroy()
    this._focusTrap = null
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('open')) {
      if (this.open) {
        this.updateComplete.then(() => {
          this._focusTrap?.destroy()
          this._focusTrap = createFocusTrap(this)
        })
      } else {
        this._focusTrap?.destroy()
        this._focusTrap = null
      }
    }
  }

  render() {
    const panelClasses = {
      'modal-panel': true,
      'modal-panel-sm': this.size === 'sm',
      'modal-panel-md': this.size === 'md',
      'modal-panel-lg': this.size === 'lg',
    }

    return html`
      <div
        class="modal-overlay ${classMap({ hidden: !this.open })}"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        @click=${this._onOverlayClick}
      >
        <div class=${classMap(panelClasses)}>
          <div class="modal-head">
            <div>
              <h3 id="modal-title">${this.heading}</h3>
              ${this.subtitle ? html`<p class="modal-sub">${this.subtitle}</p>` : ''}
            </div>
            ${this.closable ? html`
              <button type="button" class="modal-close" @click=${this._onClose} aria-label="Đóng">×</button>
            ` : ''}
          </div>
          <div class="modal-body">
            <slot></slot>
          </div>
          <div class="modal-foot" part="footer">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    `
  }
}

customElements.define('gl-modal', GlModal)

declare global {
  interface HTMLElementTagNameMap {
    'gl-modal': GlModal
  }
}
