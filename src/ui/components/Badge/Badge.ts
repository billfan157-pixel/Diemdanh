import { LitElement, html, css } from 'lit'
import { classMap } from 'lit/directives/class-map.js'

export type BadgeColor = 'primary' | 'success' | 'danger' | 'warn' | 'gold' | 'neutral'

export class GlBadge extends LitElement {
  static styles = css`
    :host { display: inline-flex; }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      font-size: var(--font-size-xs);
      font-weight: 700;
      border-radius: var(--radius-full);
      white-space: nowrap;
    }
    .badge-xs { padding: 1px 6px; font-size: 10px; }
    .badge-primary { background: var(--color-primary-soft); color: var(--color-primary); }
    .badge-success { background: var(--color-success-soft); color: var(--color-success); }
    .badge-danger { background: var(--color-danger-soft); color: var(--color-danger); }
    .badge-warn { background: #fff7ed; color: #ea580c; }
    .badge-gold { background: var(--color-gold-soft); color: var(--color-gold); }
    .badge-neutral { background: var(--color-bg-hover); color: var(--color-text-secondary); }
  `

  static properties = {
    color: { type: String },
    small: { type: Boolean },
  }

  declare color: BadgeColor
  declare small: boolean

  constructor() {
    super()
    this.color = 'neutral'
    this.small = false
  }

  render() {
    return html`
      <span class="badge ${classMap({ ['badge-' + this.color]: true, 'badge-xs': this.small })}">
        <slot></slot>
      </span>
    `
  }
}

customElements.define('gl-badge', GlBadge)

declare global {
  interface HTMLElementTagNameMap {
    'gl-badge': GlBadge
  }
}
