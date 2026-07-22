import { LitElement, html, css } from 'lit'

export type ChipColor = 'default' | 'primary' | 'success' | 'danger' | 'warn'

export class GlChip extends LitElement {
  static styles = css`
    :host { display: inline-flex; }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      padding: 2px 10px;
      font-size: var(--font-size-xs);
      font-weight: 700;
      border-radius: var(--radius-full);
      white-space: nowrap;
      cursor: default;
      border: 1px solid transparent;
    }
    .chip-default { background: var(--color-bg-hover); color: var(--color-text-secondary); border-color: var(--color-border); }
    .chip-primary { background: var(--color-primary-soft); color: var(--color-primary); }
    .chip-success { background: var(--color-success-soft); color: var(--color-success); }
    .chip-danger { background: var(--color-danger-soft); color: var(--color-danger); }
    .chip-warn { background: #fff7ed; color: #ea580c; }
    .remove-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      border-radius: var(--radius-full);
      border: none;
      background: none;
      cursor: pointer;
      font-size: 12px;
      line-height: 1;
      padding: 0;
      color: inherit;
      opacity: 0.6;
    }
    .remove-btn:hover { opacity: 1; }
    .clickable { cursor: pointer; }
    .clickable:hover { filter: brightness(0.92); }
  `

  static properties = {
    color: { type: String },
    removable: { type: Boolean },
  }

  declare color: ChipColor
  declare removable: boolean

  constructor() {
    super()
    this.color = 'default'
    this.removable = false
  }

  private _onRemove(e: MouseEvent) {
    e.stopPropagation()
    this.dispatchEvent(new CustomEvent('gl-chip-remove', { bubbles: true, composed: true }))
  }

  render() {
    return html`
      <span class="chip chip-${this.color}" @click=${() => this.dispatchEvent(new CustomEvent('gl-chip-click', { bubbles: true, composed: true }))}>
        <slot></slot>
        ${this.removable ? html`<button class="remove-btn" @click=${this._onRemove} aria-label="Xoá">×</button>` : ''}
      </span>
    `
  }
}

customElements.define('gl-chip', GlChip)

declare global {
  interface HTMLElementTagNameMap {
    'gl-chip': GlChip
  }
}
