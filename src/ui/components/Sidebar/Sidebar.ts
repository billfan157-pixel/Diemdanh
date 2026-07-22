import { LitElement, html, css } from 'lit'
import { classMap } from 'lit/directives/class-map.js'

export interface SidebarItem {
  id: string
  label: string
  icon: string
  badge?: number
  children?: SidebarItem[]
}

export class GlSidebar extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      width: var(--sidebar-width, 260px);
      height: 100%;
      background: var(--glass-bg);
      backdrop-filter: var(--glass-blur);
      -webkit-backdrop-filter: var(--glass-blur);
      border-right: 1px solid var(--glass-border);
      overflow-y: auto;
      transition: width var(--duration-normal) var(--easing-standard);
    }
    .header {
      padding: var(--space-5) var(--space-4) var(--space-3);
      font-family: var(--font-family-display);
      font-size: var(--font-size-xs);
      font-weight: 800;
      color: var(--color-gold);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      border-bottom: 1px solid var(--glass-border);
    }
    .nav { flex: 1; padding: var(--space-3) var(--space-2); }
    .item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-3);
      border-radius: var(--radius-md);
      cursor: pointer;
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
      font-weight: 600;
      border: 1px solid transparent;
      background: none;
      width: 100%;
      text-align: left;
      transition: all var(--duration-fast) var(--easing-standard);
      position: relative;
    }
    .item:hover {
      background: var(--color-bg-hover);
      color: var(--color-text);
      transform: translateX(2px);
    }
    .item.active {
      background: var(--color-primary-soft);
      color: var(--color-primary);
      border-color: color-mix(in srgb, var(--color-primary) 25%, transparent);
      font-weight: 700;
    }
    .item.active::before {
      content: '';
      position: absolute;
      left: -2px;
      top: 20%;
      bottom: 20%;
      width: 4px;
      background: var(--color-primary);
      border-radius: 4px;
    }
    .item-icon { font-size: 1.15rem; flex-shrink: 0; }
    .item-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .item-badge {
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
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
    .section-label {
      padding: var(--space-4) var(--space-3) var(--space-1);
      font-size: 10px;
      font-weight: 800;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    @media (max-width: 767px) {
      :host {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        z-index: var(--z-drawer, 1000);
        box-shadow: var(--shadow-xl);
        transform: translateX(-100%);
        transition: transform var(--duration-normal) var(--easing-standard);
      }
      :host(.open) { transform: translateX(0); }
    }
  `

  static properties = {
    items: { type: Array },
    activeId: { type: String },
    header: { type: String },
  }

  declare items: SidebarItem[]
  declare activeId: string
  declare header: string

  constructor() {
    super()
    this.items = []
    this.activeId = ''
    this.header = ''
  }

  private _onItemClick(itemId: string) {
    this.dispatchEvent(new CustomEvent('gl-sidebar-select', {
      detail: { itemId },
      bubbles: true,
      composed: true,
    }))
  }

  render() {
    return html`
      ${this.header ? html`<div class="header">${this.header}</div>` : ''}
      <nav class="nav">
        ${this.items.map((item) => {
          if (item.id === '__section') {
            return html`<div class="section-label">${item.label}</div>`
          }
          return html`
            <button
              class="item ${classMap({ active: item.id === this.activeId })}"
              @click=${() => this._onItemClick(item.id)}
              ?disabled=${item.id === '__spacer'}
            >
              <span class="item-icon">${item.icon}</span>
              <span class="item-label">${item.label}</span>
              ${item.badge ? html`<span class="item-badge">${item.badge > 99 ? '99+' : item.badge}</span>` : ''}
            </button>
          `
        })}
      </nav>
      <slot name="footer"></slot>
    `
  }
}

customElements.define('gl-sidebar', GlSidebar)

declare global {
  interface HTMLElementTagNameMap {
    'gl-sidebar': GlSidebar
  }
}
