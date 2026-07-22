import { LitElement, html, css } from 'lit'

export class GlTopBar extends LitElement {
  static styles = css`
    :host {
      display: flex;
      align-items: center;
      height: var(--topbar-height, 60px);
      padding: 0 var(--space-5);
      background: var(--glass-bg);
      backdrop-filter: var(--glass-blur);
      -webkit-backdrop-filter: var(--glass-blur);
      border-bottom: 1px solid var(--glass-border);
      box-shadow: var(--shadow-sm);
      gap: var(--space-4);
      z-index: var(--z-sticky, 100);
      position: sticky;
      top: 0;
      transition: background-color var(--duration-normal) var(--easing-standard);
    }
    .title {
      font-family: var(--font-family-display);
      font-size: var(--font-size-lg);
      font-weight: 800;
      letter-spacing: -0.02em;
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--color-text);
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .title-sub {
      font-family: var(--font-family);
      font-size: var(--font-size-xs);
      font-weight: 600;
      color: var(--color-gold);
      display: inline-block;
      margin-top: 1px;
      letter-spacing: 0.02em;
    }
    ::slotted([slot=actions]) {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }
    .menu-btn {
      display: none;
      background: var(--color-bg-hover);
      border: 1px solid var(--color-border);
      font-size: 1.2rem;
      cursor: pointer;
      padding: var(--space-2);
      color: var(--color-text);
      border-radius: var(--radius-md);
      transition: all var(--duration-fast) var(--easing-standard);
    }
    .menu-btn:hover {
      background: var(--color-primary-soft);
      color: var(--color-primary);
      border-color: color-mix(in srgb, var(--color-primary) 30%, transparent);
    }

    @media (max-width: 767px) {
      :host {
        padding: 0 var(--space-3);
        height: var(--mobile-topbar-height, 58px);
      }
      .menu-btn { display: inline-flex; }
    }
  `

  static properties = {
    title: { type: String },
    subtitle: { type: String },
    showMenu: { type: Boolean },
  }

  declare title: string
  declare subtitle: string
  declare showMenu: boolean

  constructor() {
    super()
    this.title = ''
    this.subtitle = ''
    this.showMenu = false
  }

  private _handleMenu() {
    this.dispatchEvent(new CustomEvent('gl-menu-toggle', { bubbles: true, composed: true }))
  }

  render() {
    return html`
      ${this.showMenu ? html`
        <button class="menu-btn" @click=${this._handleMenu} aria-label="Menu">
          <slot name="menu-icon">☰</slot>
        </button>
      ` : ''}
      <div class="title">
        ${this.title}
        ${this.subtitle ? html`<span class="title-sub">${this.subtitle}</span>` : ''}
      </div>
      <slot name="actions"></slot>
    `
  }
}

customElements.define('gl-topbar', GlTopBar)

declare global {
  interface HTMLElementTagNameMap {
    'gl-topbar': GlTopBar
  }
}
