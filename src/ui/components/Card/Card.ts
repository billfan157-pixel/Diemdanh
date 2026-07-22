import { LitElement, html, css } from 'lit'
import { classMap } from 'lit/directives/class-map.js'

export class GlCard extends LitElement {
  static styles = css`
    :host { display: block; }
    .card {
      background: var(--glass-bg);
      backdrop-filter: var(--glass-blur);
      -webkit-backdrop-filter: var(--glass-blur);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-xl);
      padding: var(--space-5);
      box-shadow: var(--shadow-md);
      transition: all var(--duration-normal) var(--easing-standard);
    }
    .card:hover {
      border-color: color-mix(in srgb, var(--color-primary) 30%, var(--glass-border));
      box-shadow: var(--shadow-lg);
    }
    .card-clickable { cursor: pointer; }
    .card-clickable:hover {
      transform: translateY(-3px);
    }
    .card-clickable:active { transform: translateY(-1px) scale(0.99); }
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--space-3);
      gap: var(--space-3);
    }
    .card-title {
      font-family: var(--font-family-display);
      font-size: var(--font-size-lg);
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0;
      color: var(--color-text);
    }
  `

  static properties = {
    clickable: { type: Boolean },
    padding: { type: String },
  }

  declare clickable: boolean
  declare padding: string

  constructor() {
    super()
    this.clickable = false
    this.padding = ''
  }

  render() {
    return html`
      <div class="card ${classMap({ 'card-clickable': this.clickable })}" style=${this.padding ? `padding:${this.padding}` : ''}>
        <slot name="header"></slot>
        <slot></slot>
      </div>
    `
  }
}

customElements.define('gl-card', GlCard)

declare global {
  interface HTMLElementTagNameMap {
    'gl-card': GlCard
  }
}
