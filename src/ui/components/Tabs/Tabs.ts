import { LitElement, html, css } from 'lit'
import { classMap } from 'lit/directives/class-map.js'

export interface TabItem {
  id: string
  label: string
}

export class GlTabs extends LitElement {
  static styles = css`
    :host { display: block; }
    .tabs {
      display: flex;
      gap: var(--space-1);
      padding: var(--space-1);
      background: var(--color-bg-active);
      border-radius: var(--radius-md);
    }
    .tab {
      flex: 1;
      min-height: var(--touch-target-min);
      padding: var(--space-2) var(--space-3);
      border: none;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--color-text-secondary);
      font-family: inherit;
      font-size: var(--font-size-sm);
      font-weight: 700;
      cursor: pointer;
      transition: all var(--duration-fast);
      white-space: nowrap;
    }
    .tab:hover { color: var(--color-text); }
    .tab.active {
      background: var(--color-bg-elevated);
      color: var(--color-primary);
      box-shadow: var(--shadow-sm);
    }

    @media (max-width: 767px) {
      .tabs { overflow-x: auto; }
      .tab { flex: 0 0 auto; }
    }
  `

  static properties = {
    tabs: { type: Array },
    activeTab: { type: String },
  }

  declare tabs: TabItem[]
  declare activeTab: string

  constructor() {
    super()
    this.tabs = []
    this.activeTab = ''
  }

  private _onTabClick(tabId: string) {
    this.activeTab = tabId
    this.dispatchEvent(new CustomEvent('gl-tab-change', {
      detail: { tabId },
      bubbles: true,
      composed: true,
    }))
  }

  render() {
    return html`
      <div class="tabs" role="tablist">
        ${this.tabs.map(tab => html`
          <button
            type="button"
            class="tab ${classMap({ active: tab.id === this.activeTab })}"
            role="tab"
            aria-selected=${tab.id === this.activeTab}
            @click=${() => this._onTabClick(tab.id)}
          >${tab.label}</button>
        `)}
      </div>
    `
  }
}

customElements.define('gl-tabs', GlTabs)

declare global {
  interface HTMLElementTagNameMap {
    'gl-tabs': GlTabs
  }
}
