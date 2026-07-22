import { LitElement, html } from 'lit'
import '../../components/Button/Button'
import './gl-density-toggle'

export class GlClassToolbar extends LitElement {
  createRenderRoot() { return this }

  static properties = {
    className: { type: String },
    classYear: { type: String },
    isArchived: { type: Boolean },
    classArchived: { type: Boolean },
  }

  declare className: string
  declare classYear: string
  declare isArchived: boolean
  declare classArchived: boolean

  constructor() {
    super()
    this.className = ''
    this.classYear = ''
    this.isArchived = false
    this.classArchived = false
  }

  private _emit(eventName: string): void {
    this.dispatchEvent(new CustomEvent(eventName, { bubbles: true, composed: true }))
  }

  render() {
    const yearSuffix = this.classYear ? ` · ${this.classYear}` : ''
    const archivedSuffix = this.isArchived ? ' · lưu trữ' : ''

    return html`
      <div class="class-header">
        <h2>${this.className}${yearSuffix}${archivedSuffix}</h2>
        <div class="class-actions">
          <gl-density-toggle></gl-density-toggle>
          <gl-button variant="secondary" size="sm" @click=${() => this._emit('add-student')} ?disabled=${this.classArchived}>➕ Thêm HV</gl-button>
          <gl-button variant="ghost" size="sm" @click=${() => this._emit('columns')}>⚖️ Cột điểm</gl-button>
          <gl-button variant="ghost" size="sm" @click=${() => this._emit('invite')}>📝 Phiếu PH</gl-button>
        </div>
      </div>
    `
  }
}

customElements.define('gl-class-toolbar', GlClassToolbar)

declare global {
  interface HTMLElementTagNameMap {
    'gl-class-toolbar': GlClassToolbar
  }
}
