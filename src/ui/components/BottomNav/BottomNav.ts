import { LitElement, html, css } from 'lit'
import { classMap } from 'lit/directives/class-map.js'

export interface NavTab {
  id: string
  label: string
  icon: string
  badge?: number
}

export class GlBottomNav extends LitElement {
  static styles = css`
    :host {
      display: flex;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--glass-bg);
      backdrop-filter: var(--glass-blur);
      -webkit-backdrop-filter: var(--glass-blur);
      border-top: 1px solid var(--glass-border);
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
      z-index: var(--z-fixed, 900);
      padding-bottom: env(safe-area-inset-bottom, 0);
      height: calc(var(--mobile-bottombar-height, 66px) + env(safe-area-inset-bottom, 0px));
    }
    .tab {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      padding: var(--space-1) 0;
      border: none;
      background: none;
      cursor: pointer;
      color: var(--color-text-muted);
      font-family: var(--font-family-display);
      font-size: 11px;
      font-weight: 600;
      position: relative;
      transition: all var(--duration-fast) var(--easing-standard);
      -webkit-tap-highlight-color: transparent;
      min-height: 48px;
    }
    .tab:active {
      transform: scale(0.92);
    }
    .tab.active {
      color: var(--color-primary);
      font-weight: 800;
    }
    .tab.active::after {
      content: '';
      position: absolute;
      top: 0;
      width: 32px;
      height: 3px;
      background: var(--color-primary);
      border-radius: 0 0 4px 4px;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.5);
    }
    .tab-icon {
      font-size: 1.35rem;
      line-height: 1;
      transition: transform var(--duration-fast) var(--easing-spring);
    }
    .tab.active .tab-icon {
      transform: translateY(-2px) scale(1.1);
    }
    .tab-badge {
      position: absolute;
      top: 4px;
      right: 50%;
      margin-right: -14px;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      background: var(--color-danger);
      color: white;
      font-size: 10px;
      font-weight: 800;
      border-radius: var(--radius-full);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
    }

    @media (min-width: 768px) {
      :host { display: none; }
    }
  `

  static properties = {
    tabs: { type: Array },
    activeTab: { type: String },
  }

  declare tabs: NavTab[]
  declare activeTab: string

  constructor() {
    super()
    this.tabs = []
    this.activeTab = ''
  }

  private _onTabClick(tabId: string) {
    this.dispatchEvent(new CustomEvent('gl-nav-change', {
      detail: { tabId },
      bubbles: true,
      composed: true,
    }))
  }

  render() {
    return html`
      ${this.tabs.map(tab => html`
        <button
          class="tab ${classMap({ active: tab.id === this.activeTab })}"
          @click=${() => this._onTabClick(tab.id)}
          aria-label=${tab.label}
          aria-current=${tab.id === this.activeTab ? 'page' : ''}
        >
          <span class="tab-icon">${tab.icon}</span>
          <span>${tab.label}</span>
          ${tab.badge ? html`<span class="tab-badge">${tab.badge > 99 ? '99+' : tab.badge}</span>` : ''}
        </button>
      `)}
    `
  }
}

customElements.define('gl-bottom-nav', GlBottomNav)

declare global {
  interface HTMLElementTagNameMap {
    'gl-bottom-nav': GlBottomNav
  }
}
