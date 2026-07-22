import { LitElement, html, css } from 'lit'
import { classMap } from 'lit/directives/class-map.js'
import { ref, createRef } from 'lit/directives/ref.js'

export interface DropdownItem {
  id: string
  label: string
  icon?: string
  danger?: boolean
  divider?: boolean
  disabled?: boolean
}

export class GlDropdown extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
      position: relative;
    }
    .trigger { cursor: pointer; }
    .menu {
      position: absolute;
      top: calc(100% + 4px);
      right: 0;
      min-width: 180px;
      background: var(--color-bg-elevated);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      z-index: var(--z-dropdown, 950);
      padding: var(--space-1);
      display: none;
      animation: drop-in 0.12s ease-out;
    }
    .menu.open { display: block; }
    .item {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--color-text);
      border: none;
      background: none;
      width: 100%;
      text-align: left;
    }
    .item:hover { background: var(--color-bg-hover); }
    .item.danger { color: var(--color-danger); }
    .item.danger:hover { background: var(--color-danger-soft); }
    .item:disabled { opacity: 0.5; cursor: default; }
    .item-icon { font-size: 1rem; flex-shrink: 0; }
    .divider {
      height: 1px;
      background: var(--color-border);
      margin: var(--space-1) 0;
    }

    @keyframes drop-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
  `

  static properties = {
    items: { type: Array },
    open: { type: Boolean },
  }

  declare items: DropdownItem[]
  declare open: boolean

  private _menuRef = createRef<HTMLDivElement>()

  constructor() {
    super()
    this.items = []
    this.open = false
  }

  connectedCallback() {
    super.connectedCallback()
    document.addEventListener('click', this._onDocClick)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    document.removeEventListener('click', this._onDocClick)
  }

  private _onDocClick = (e: MouseEvent) => {
    if (!this.contains(e.target as Node)) {
      this.open = false
    }
  }

  private _toggle() {
    this.open = !this.open
  }

  private _onItemClick(item: DropdownItem) {
    if (item.disabled) return
    this.open = false
    this.dispatchEvent(new CustomEvent('gl-dropdown-select', {
      detail: { itemId: item.id },
      bubbles: true,
      composed: true,
    }))
  }

  render() {
    return html`
      <span class="trigger" @click=${this._toggle}>
        <slot></slot>
      </span>
      <div class="menu ${classMap({ open: this.open })}" ${ref(this._menuRef)} role="menu">
        ${this.items.map(item => {
          if (item.divider) return html`<div class="divider"></div>`
          return html`
            <button class="item ${classMap({ danger: !!item.danger })}" ?disabled=${item.disabled} @click=${() => this._onItemClick(item)} role="menuitem">
              ${item.icon ? html`<span class="item-icon">${item.icon}</span>` : ''}
              ${item.label}
            </button>
          `
        })}
      </div>
    `
  }
}

customElements.define('gl-dropdown', GlDropdown)

declare global {
  interface HTMLElementTagNameMap {
    'gl-dropdown': GlDropdown
  }
}
