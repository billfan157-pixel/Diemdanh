import { LitElement, html, css } from 'lit'
import { classMap } from 'lit/directives/class-map.js'
import { ifDefined } from 'lit/directives/if-defined.js'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
export type ButtonSize = 'sm' | 'md' | 'lg'

export class GlButton extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      min-height: var(--touch-target-min);
      padding: var(--space-2) var(--space-4);
      font-family: inherit;
      font-size: var(--font-size-sm);
      font-weight: 600;
      line-height: 1.25;
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--duration-fast) var(--easing-standard);
      text-decoration: none;
      white-space: nowrap;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
      width: 100%;
    }
    .btn:active:not(:disabled) {
      transform: scale(0.98);
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Variants */
    .btn-primary {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: white;
      box-shadow: var(--shadow-sm);
    }
    .btn-primary:hover:not(:disabled) {
      background: var(--color-primary-hover);
      border-color: var(--color-primary-hover);
      box-shadow: var(--shadow-md);
    }

    .btn-secondary {
      background: var(--color-bg-elevated);
      border-color: var(--color-border);
      color: var(--color-text);
    }
    .btn-secondary:hover:not(:disabled) {
      background: var(--color-bg-hover);
      border-color: var(--color-border-strong);
    }

    .btn-ghost {
      background: transparent;
      border-color: transparent;
      color: var(--color-text-secondary);
    }
    .btn-ghost:hover:not(:disabled) {
      background: var(--color-bg-hover);
      color: var(--color-text);
    }

    .btn-danger {
      background: var(--color-danger);
      border-color: var(--color-danger);
      color: white;
    }
    .btn-danger:hover:not(:disabled) {
      background: #b91c1c;
      border-color: #b91c1c;
    }

    .btn-success {
      background: var(--color-success);
      border-color: var(--color-success);
      color: white;
    }

    /* Sizes */
    .btn-sm {
      min-height: var(--touch-target-min);
      padding: var(--space-1) var(--space-3);
      font-size: var(--font-size-xs);
    }
    .btn-lg {
      min-height: 52px;
      padding: var(--space-3) var(--space-6);
      font-size: var(--font-size-base);
    }
    .btn-block {
      width: 100%;
    }
    .btn-icon {
      width: var(--touch-target-min);
      height: var(--touch-target-min);
      padding: 0;
      justify-content: center;
    }

    @media (min-width: 1024px) {
      .btn-sm { min-height: 36px; }
    }
  `

  static properties = {
    variant: { type: String },
    size: { type: String },
    disabled: { type: Boolean },
    block: { type: Boolean, attribute: 'block' },
    icon: { type: Boolean, reflect: true },
    label: { type: String },
    type: { type: String },
  }

  declare variant: ButtonVariant
  declare size: ButtonSize
  declare disabled: boolean
  declare block: boolean
  declare icon: boolean
  declare label: string
  declare type: string

  constructor() {
    super()
    this.variant = 'secondary'
    this.size = 'md'
    this.disabled = false
    this.block = false
    this.icon = false
    this.label = ''
    this.type = 'button'
  }

  render() {
    const classes = {
      btn: true,
      [`btn-${this.variant}`]: true,
      'btn-sm': this.size === 'sm',
      'btn-lg': this.size === 'lg',
      'btn-block': this.block,
      'btn-icon': this.icon,
    }

    return html`
      <button
        class=${classMap(classes)}
        ?disabled=${this.disabled}
        type=${ifDefined(this.type)}
        aria-label=${ifDefined(this.label || undefined)}
      >
        <slot></slot>
      </button>
    `
  }
}

customElements.define('gl-button', GlButton)

declare global {
  interface HTMLElementTagNameMap {
    'gl-button': GlButton
  }
}
