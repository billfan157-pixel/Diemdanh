import { LitElement, html, css } from 'lit'

export interface SelectOption {
  value: string
  label: string
}

export class GlSelect extends LitElement {
  static styles = css`
    :host { display: block; }
    .field {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }
    .field-label {
      font-size: var(--font-size-xs);
      font-weight: 600;
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .select-wrap { position: relative; }
    .select {
      width: 100%;
      min-height: var(--touch-target-min);
      padding: var(--space-2) var(--space-10) var(--space-2) var(--space-3);
      font-family: inherit;
      font-size: var(--font-size-base);
      color: var(--color-text);
      background: var(--color-bg-elevated);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      appearance: none;
      outline: none;
      cursor: pointer;
      transition: border-color var(--duration-fast);
      box-sizing: border-box;
    }
    .select:hover { border-color: var(--color-border-strong); }
    .select:focus {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
    }
    .select-arrow {
      position: absolute;
      right: var(--space-3);
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      color: var(--color-text-muted);
    }
  `

  static properties = {
    label: { type: String },
    value: { type: String },
    placeholder: { type: String },
    disabled: { type: Boolean },
    options: { type: Array },
  }

  declare label: string
  declare value: string
  declare placeholder: string
  declare disabled: boolean
  declare options: SelectOption[]

  constructor() {
    super()
    this.label = ''
    this.value = ''
    this.placeholder = 'Chọn...'
    this.disabled = false
    this.options = []
  }

  private _onChange(e: Event) {
    const select = e.target as HTMLSelectElement
    this.value = select.value
    this.dispatchEvent(new CustomEvent('gl-change', {
      detail: { value: select.value },
      bubbles: true,
      composed: true,
    }))
  }

  render() {
    return html`
      <div class="field">
        ${this.label ? html`<label class="field-label">${this.label}</label>` : ''}
        <div class="select-wrap">
          <select
            class="select"
            .value=${this.value}
            ?disabled=${this.disabled}
            @change=${this._onChange}
          >
            ${this.placeholder ? html`<option value="">${this.placeholder}</option>` : ''}
            ${this.options.map(o => html`
              <option value=${o.value} ?selected=${o.value === this.value}>${o.label}</option>
            `)}
          </select>
          <span class="select-arrow">▼</span>
        </div>
      </div>
    `
  }
}

customElements.define('gl-select', GlSelect)

declare global {
  interface HTMLElementTagNameMap {
    'gl-select': GlSelect
  }
}
