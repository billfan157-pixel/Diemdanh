import { LitElement, html, css } from 'lit'
import { classMap } from 'lit/directives/class-map.js'

export class GlFab extends LitElement {
  static styles = css`
    :host {
      position: fixed;
      bottom: calc(var(--space-6) + env(safe-area-inset-bottom, 0px));
      right: var(--space-6);
      z-index: var(--z-fab, 800);
    }
    button {
      width: 56px;
      height: 56px;
      border-radius: var(--radius-full);
      border: none;
      background: var(--color-primary);
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
      box-shadow: var(--shadow-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform var(--duration-fast), box-shadow var(--duration-fast);
      -webkit-tap-highlight-color: transparent;
    }
    button:hover {
      transform: scale(1.08);
      box-shadow: var(--shadow-xl);
    }
    button:active {
      transform: scale(0.95);
    }
    button.small {
      width: 44px;
      height: 44px;
      font-size: 1.2rem;
    }
    button.secondary {
      background: var(--color-bg-elevated);
      color: var(--color-text);
      border: 1px solid var(--color-border);
    }

    @media (max-width: 767px) {
      :host {
        bottom: calc(var(--space-4) + 64px + env(safe-area-inset-bottom, 0px));
        right: var(--space-4);
      }
      button {
        width: 48px;
        height: 48px;
        font-size: 1.3rem;
      }
    }
  `

  static properties = {
    small: { type: Boolean },
    secondary: { type: Boolean },
    label: { type: String },
  }

  declare small: boolean
  declare secondary: boolean
  declare label: string

  constructor() {
    super()
    this.small = false
    this.secondary = false
    this.label = ''
  }

  render() {
    return html`
      <button
        class=${classMap({ small: this.small, secondary: this.secondary })}
        @click=${() => this.dispatchEvent(new CustomEvent('gl-fab-click', { bubbles: true, composed: true }))}
        aria-label=${this.label || 'Thêm'}
      >
        <slot>+</slot>
      </button>
    `
  }
}

customElements.define('gl-fab', GlFab)

declare global {
  interface HTMLElementTagNameMap {
    'gl-fab': GlFab
  }
}
