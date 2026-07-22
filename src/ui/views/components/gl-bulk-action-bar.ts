import { LitElement, html } from 'lit'

export class GlBulkActionBar extends LitElement {
  createRenderRoot() { return this }

  static properties = {
    count: { type: Number },
  }

  declare count: number

  constructor() {
    super()
    this.count = 0
  }

  private _onEdit(): void {
    this.dispatchEvent(new CustomEvent('bulk-edit', { bubbles: true, composed: true }))
  }

  private _onClear(): void {
    this.dispatchEvent(new CustomEvent('bulk-clear', { bubbles: true, composed: true }))
  }

  render() {
    if (this.count <= 0) return html``

    return html`
      <div id="bulkActionBar" class="visible">
        <span class="bulk-count">Đã chọn ${this.count} học viên</span>
        <div class="bulk-actions">
          <gl-button variant="primary" size="sm" id="bulkEditBtn" @click=${this._onEdit}>✏️ Sửa điểm</gl-button>
          <gl-button variant="ghost" size="sm" id="clearSelectionBtn" @click=${this._onClear}>Bỏ chọn</gl-button>
        </div>
      </div>
    `
  }
}

customElements.define('gl-bulk-action-bar', GlBulkActionBar)

declare global {
  interface HTMLElementTagNameMap {
    'gl-bulk-action-bar': GlBulkActionBar
  }
}
