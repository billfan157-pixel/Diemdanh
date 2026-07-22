import { LitElement, html, css } from 'lit'

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right'

export class GlTooltip extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
      position: relative;
    }
    .trigger { cursor: pointer; }
    .tooltip {
      position: absolute;
      padding: var(--space-1) var(--space-2);
      background: var(--color-text);
      color: var(--color-bg);
      font-size: var(--font-size-xs);
      font-weight: 600;
      border-radius: var(--radius-sm);
      white-space: nowrap;
      pointer-events: none;
      z-index: var(--z-tooltip, 900);
      opacity: 0;
      transition: opacity var(--duration-fast);
    }
    :host(:hover) .tooltip,
    :host(:focus-within) .tooltip { opacity: 1; }
    .tooltip-top { bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%); }
    .tooltip-bottom { top: calc(100% + 6px); left: 50%; transform: translateX(-50%); }
    .tooltip-left { right: calc(100% + 6px); top: 50%; transform: translateY(-50%); }
    .tooltip-right { left: calc(100% + 6px); top: 50%; transform: translateY(-50%); }

    .tooltip::after {
      content: '';
      position: absolute;
      width: 0;
      height: 0;
      border: 4px solid transparent;
    }
    .tooltip-top::after { top: 100%; left: 50%; margin-left: -4px; border-top-color: var(--color-text); }
    .tooltip-bottom::after { bottom: 100%; left: 50%; margin-left: -4px; border-bottom-color: var(--color-text); }
    .tooltip-left::after { left: 100%; top: 50%; margin-top: -4px; border-left-color: var(--color-text); }
    .tooltip-right::after { right: 100%; top: 50%; margin-top: -4px; border-right-color: var(--color-text); }

    @media (hover: none) {
      .tooltip { display: none; }
    }
  `

  static properties = {
    text: { type: String },
    position: { type: String },
  }

  declare text: string
  declare position: TooltipPosition

  constructor() {
    super()
    this.text = ''
    this.position = 'top'
  }

  render() {
    return html`
      <span class="trigger" tabindex="0" aria-describedby="tooltip">
        <slot></slot>
      </span>
      <span class="tooltip tooltip-${this.position}" id="tooltip" role="tooltip">${this.text}</span>
    `
  }
}

customElements.define('gl-tooltip', GlTooltip)

declare global {
  interface HTMLElementTagNameMap {
    'gl-tooltip': GlTooltip
  }
}
