import { LitElement, html, css } from 'lit'
import { classMap } from 'lit/directives/class-map.js'
import { ifDefined } from 'lit/directives/if-defined.js'

export type InputType = 'text' | 'password' | 'email' | 'number' | 'tel' | 'search' | 'url'
export type InputSize = 'sm' | 'md' | 'lg'

export class GlInput extends LitElement {
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
    .input {
      width: 100%;
      min-height: var(--touch-target-min);
      padding: var(--space-2) var(--space-3);
      font-family: inherit;
      font-size: var(--font-size-base);
      line-height: 1.5;
      color: var(--color-text);
      background: var(--color-bg-elevated);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      outline: none;
      transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
      box-sizing: border-box;
    }
    .input::placeholder { color: var(--color-text-muted-2); }
    .input:hover { border-color: var(--color-border-strong); }
    .input:focus {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
    }
    .input:disabled {
      background: var(--color-bg-hover);
      color: var(--color-text-muted);
      cursor: not-allowed;
    }
    .input-error {
      border-color: var(--color-danger);
    }
    .input-error:focus {
      box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15);
    }
    .hint {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
    }
    .hint-error {
      color: var(--color-danger);
    }
  `

  static properties = {
    label: { type: String },
    type: { type: String },
    placeholder: { type: String },
    value: { type: String },
    disabled: { type: Boolean },
    readonly: { type: Boolean },
    required: { type: Boolean },
    error: { type: String, reflect: true },
    hint: { type: String },
    name: { type: String },
    inputmode: { type: String },
    autocomplete: { type: String },
  }

  declare label: string
  declare type: InputType
  declare placeholder: string
  declare value: string
  declare disabled: boolean
  declare readonly: boolean
  declare required: boolean
  declare error: string
  declare hint: string
  declare name: string
  declare inputmode: string
  declare autocomplete: string

  constructor() {
    super()
    this.label = ''
    this.type = 'text'
    this.placeholder = ''
    this.value = ''
    this.disabled = false
    this.readonly = false
    this.required = false
    this.error = ''
    this.hint = ''
    this.name = ''
    this.inputmode = ''
    this.autocomplete = ''
  }

  private _onInput(e: Event) {
    const input = e.target as HTMLInputElement
    this.value = input.value
    this.dispatchEvent(new CustomEvent('gl-change', {
      detail: { value: input.value },
      bubbles: true,
      composed: true,
    }))
  }

  private _onFocus(e: Event) {
    this.dispatchEvent(new CustomEvent('gl-focus', {
      detail: { target: e.target },
      bubbles: true,
      composed: true,
    }))
  }

  private _onBlur(e: Event) {
    this.dispatchEvent(new CustomEvent('gl-blur', {
      detail: { target: e.target },
      bubbles: true,
      composed: true,
    }))
  }

  render() {
    const inputClasses = {
      input: true,
      'input-error': !!this.error,
    }

    return html`
      <div class="field">
        ${this.label ? html`<label class="field-label" for="input">${this.label}</label>` : ''}
        <input
          id="input"
          class=${classMap(inputClasses)}
          type=${this.type}
          .value=${this.value}
          placeholder=${ifDefined(this.placeholder || undefined)}
          ?disabled=${this.disabled}
          ?readonly=${this.readonly}
          ?required=${this.required}
          name=${ifDefined(this.name || undefined)}
          inputmode=${ifDefined(this.inputmode || undefined)}
          autocomplete=${ifDefined(this.autocomplete || undefined)}
          aria-invalid=${this.error ? 'true' : 'false'}
          aria-describedby=${this.error ? 'hint' : undefined}
          @input=${this._onInput}
          @focus=${this._onFocus}
          @blur=${this._onBlur}
        />
        ${this.error ? html`<span class="hint hint-error" id="hint">${this.error}</span>` : ''}
        ${this.hint && !this.error ? html`<span class="hint">${this.hint}</span>` : ''}
      </div>
    `
  }
}

customElements.define('gl-input', GlInput)

declare global {
  interface HTMLElementTagNameMap {
    'gl-input': GlInput
  }
}
