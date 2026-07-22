import { LitElement, html, css } from 'lit'

export class GlKpiCard extends LitElement {
  static styles = css`
    :host {
      display: block;
      min-width: 0;
      padding: var(--space-4);
      background: var(--color-bg-elevated);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-sm);
      transition: transform var(--duration-fast), box-shadow var(--duration-fast), border-color var(--duration-fast);
      position: relative;
      overflow: hidden;
      height: 105px;
      box-sizing: border-box;
    }
    :host(:hover) {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
      border-color: var(--color-border-strong);
    }
    .label {
      font-size: 0.72rem;
      color: var(--color-text-secondary);
      font-weight: 750;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .value {
      font-size: clamp(1.2rem, 4vw, 1.7rem);
      font-weight: 850;
      color: var(--color-text);
      letter-spacing: -0.03em;
      margin-top: 4px;
      line-height: 1.1;
    }
    .icon {
      position: absolute;
      right: 12px;
      bottom: 12px;
      font-size: 2rem;
      opacity: 0.1;
      pointer-events: none;
    }
    .bar {
      width: 100%;
      height: 4px;
      background: var(--color-border);
      border-radius: 2px;
      margin-top: 6px;
      overflow: hidden;
      opacity: 0.7;
    }
    .bar-fill {
      height: 100%;
      border-radius: 2px;
      transition: width 0.6s ease;
    }
  `

  static properties = {
    label: { type: String },
    value: { type: String },
    icon: { type: String },
    barPercent: { type: Number },
    barColor: { type: String },
  }

  declare label: string
  declare value: string
  declare icon: string
  declare barPercent: number
  declare barColor: string

  constructor() {
    super()
    this.label = ''
    this.value = ''
    this.icon = ''
    this.barPercent = 0
    this.barColor = 'var(--color-primary)'
  }

  render() {
    return html`
      <div class="label">${this.label}</div>
      <div class="value">${this.value}</div>
      <div class="icon">${this.icon}</div>
      <div class="bar">
        <div class="bar-fill" style="width: ${this.barPercent}%; background: ${this.barColor}"></div>
      </div>
    `
  }
}

customElements.define('gl-kpi-card', GlKpiCard)

declare global {
  interface HTMLElementTagNameMap {
    'gl-kpi-card': GlKpiCard
  }
}
