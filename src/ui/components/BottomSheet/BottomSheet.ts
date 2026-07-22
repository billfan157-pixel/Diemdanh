import { LitElement, html, css } from 'lit'
import { classMap } from 'lit/directives/class-map.js'

export class GlBottomSheet extends LitElement {
  static styles = css`
    :host { display: contents; }
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.4);
      z-index: var(--z-modal, 1000);
      display: flex;
      align-items: flex-end;
      justify-content: center;
      animation: fade-in 0.15s ease-out;
    }
    .sheet {
      width: 100%;
      max-width: 480px;
      max-height: 80vh;
      background: var(--color-bg-elevated);
      border-radius: var(--radius-xl) var(--radius-xl) 0 0;
      display: flex;
      flex-direction: column;
      animation: slide-up 0.25s var(--easing-standard);
      overflow: hidden;
    }
    .handle {
      width: 36px;
      height: 4px;
      border-radius: 2px;
      background: var(--color-border);
      margin: var(--space-2) auto;
      flex-shrink: 0;
    }
    .header {
      display: flex;
      align-items: center;
      padding: var(--space-2) var(--space-4) var(--space-3);
      border-bottom: 1px solid var(--color-border);
      gap: var(--space-2);
    }
    .title {
      flex: 1;
      font-size: var(--font-size-base);
      font-weight: 750;
    }
    .close-btn {
      background: none;
      border: none;
      font-size: 1.25rem;
      cursor: pointer;
      color: var(--color-text-secondary);
      padding: var(--space-1);
      border-radius: var(--radius-sm);
    }
    .close-btn:hover { background: var(--color-bg-hover); }
    .body {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-4);
    }
    .hidden { display: none; }

    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
  `

  static properties = {
    open: { type: Boolean },
    heading: { type: String },
  }

  declare open: boolean
  declare heading: string

  constructor() {
    super()
    this.open = false
    this.heading = ''
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('gl-close', { bubbles: true, composed: true }))
  }

  private _onOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) this._close()
  }

  render() {
    return html`
      <div class="overlay ${classMap({ hidden: !this.open })}" @click=${this._onOverlayClick}>
        <div class="sheet">
          <div class="handle"></div>
          ${this.heading ? html`
            <div class="header">
              <span class="title">${this.heading}</span>
              <button class="close-btn" @click=${this._close} aria-label="Đóng">×</button>
            </div>
          ` : ''}
          <div class="body">
            <slot></slot>
          </div>
        </div>
      </div>
    `
  }
}

customElements.define('gl-bottom-sheet', GlBottomSheet)

declare global {
  interface HTMLElementTagNameMap {
    'gl-bottom-sheet': GlBottomSheet
  }
}
