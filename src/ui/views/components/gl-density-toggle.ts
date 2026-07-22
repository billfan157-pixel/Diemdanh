import { LitElement, html } from 'lit'

const STORAGE_KEY = 'gl-density-preference'

export class GlDensityToggle extends LitElement {
  createRenderRoot() { return this }

  static properties = {
    density: { type: String },
  }

  declare density: 'compact' | 'comfortable'

  constructor() {
    super()
    const saved = localStorage.getItem(STORAGE_KEY)
    this.density = saved === 'compact' || saved === 'comfortable' ? saved : 'compact'
  }

  connectedCallback(): void {
    super.connectedCallback()
    this._applyDensity(this.density)
  }

  private _toggle(): void {
    const next = this.density === 'compact' ? 'comfortable' : 'compact'
    this.density = next
    localStorage.setItem(STORAGE_KEY, next)
    this._applyDensity(next)
    this.dispatchEvent(new CustomEvent('density-change', { detail: { density: next }, bubbles: true, composed: true }))
  }

  private _applyDensity(d: string): void {
    document.documentElement.classList.toggle('density-compact', d === 'compact')
    document.documentElement.classList.toggle('density-spacious', d === 'comfortable')
  }

  render() {
    const isCompact = this.density === 'compact'
    return html`
      <gl-button variant="ghost" size="sm" @click=${this._toggle} title="${isCompact ? 'Chuyển sang thoáng' : 'Chuyển sang gọn'}">
        ${isCompact ? '📏 Gọn' : '📐 Thoáng'}
      </gl-button>
    `
  }
}

customElements.define('gl-density-toggle', GlDensityToggle)

declare global {
  interface HTMLElementTagNameMap {
    'gl-density-toggle': GlDensityToggle
  }
}
