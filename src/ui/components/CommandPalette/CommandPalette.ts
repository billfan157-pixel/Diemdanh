import { LitElement, html, css } from 'lit'
import { classMap } from 'lit/directives/class-map.js'
import { ref, createRef } from 'lit/directives/ref.js'

export interface PaletteCommand {
  id: string
  label: string
  description?: string
  icon?: string
  keywords?: string[]
}

export class GlCommandPalette extends LitElement {
  static styles = css`
    :host { display: contents; }
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: var(--z-modal, 1000);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 10vh;
    }
    .dialog {
      width: 100%;
      max-width: 520px;
      background: var(--color-bg-elevated);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-xl);
      overflow: hidden;
      animation: drop-in 0.15s ease-out;
    }
    .search-wrap {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--color-border);
    }
    .search-icon { font-size: 1.1rem; color: var(--color-text-secondary); flex-shrink: 0; }
    .search-input {
      flex: 1;
      border: none;
      background: none;
      font-size: var(--font-size-base);
      font-weight: 600;
      outline: none;
      color: var(--color-text);
    }
    .search-input::placeholder { color: var(--color-text-tertiary); }
    .shortcut-hint {
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
      background: var(--color-bg-hover);
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      flex-shrink: 0;
    }
    .results { max-height: 360px; overflow-y: auto; padding: var(--space-1); }
    .empty {
      text-align: center;
      padding: var(--space-6);
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
    }
    .result-item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-md);
      cursor: pointer;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
    }
    .result-item:hover,
    .result-item.active { background: var(--color-bg-hover); }
    .result-icon { font-size: 1.1rem; flex-shrink: 0; }
    .result-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); }
    .result-desc { font-size: var(--font-size-xs); color: var(--color-text-secondary); }

    @keyframes drop-in { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }

    @media (max-width: 767px) {
      .overlay { padding-top: 0; align-items: center; }
      .dialog { max-width: 100%; margin: var(--space-4); border-radius: var(--radius-lg); }
    }
  `

  static properties = {
    open: { type: Boolean },
    commands: { type: Array },
  }

  declare open: boolean
  declare commands: PaletteCommand[]

  private _inputRef = createRef<HTMLInputElement>()
  private _search = ''
  private _activeIdx = 0

  constructor() {
    super()
    this.open = false
    this.commands = []
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('open') && this.open) {
      this._search = ''
      this._activeIdx = 0
      requestAnimationFrame(() => {
        this._inputRef.value?.focus()
      })
    }
  }

  private _filtered(): PaletteCommand[] {
    if (!this._search.trim()) return this.commands
    const q = this._search.toLowerCase().trim()
    return this.commands.filter(c =>
      c.label.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.keywords?.some(k => k.toLowerCase().includes(q))
    )
  }

  private _onInput(e: InputEvent) {
    this._search = (e.target as HTMLInputElement).value
    this._activeIdx = 0
  }

  private _onKeyDown(e: KeyboardEvent) {
    const items = this._filtered()
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      this._activeIdx = Math.min(this._activeIdx + 1, items.length - 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      this._activeIdx = Math.max(this._activeIdx - 1, 0)
    } else if (e.key === 'Enter' && items[this._activeIdx]) {
      this._select(items[this._activeIdx])
    } else if (e.key === 'Escape') {
      this._close()
    }
  }

  private _select(cmd: PaletteCommand) {
    this._close()
    this.dispatchEvent(new CustomEvent('gl-palette-select', {
      detail: { commandId: cmd.id },
      bubbles: true,
      composed: true,
    }))
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('gl-close', { bubbles: true, composed: true }))
  }

  private _onOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) this._close()
  }

  render() {
    if (!this.open) return html``
    const results = this._filtered()
    return html`
      <div class="overlay" @click=${this._onOverlayClick}>
        <div class="dialog" role="dialog" aria-label="Command palette">
          <div class="search-wrap">
            <span class="search-icon">🔍</span>
            <input
              class="search-input"
              placeholder="Tìm lệnh, lớp, học viên..."
              ${ref(this._inputRef)}
              @input=${this._onInput}
              @keydown=${this._onKeyDown}
            >
            <span class="shortcut-hint">Esc</span>
          </div>
          <div class="results">
            ${results.length === 0 ? html`<div class="empty">Không tìm thấy kết quả</div>` : results.map((cmd, i) => html`
              <button
                class="result-item ${classMap({ active: i === this._activeIdx })}"
                @click=${() => this._select(cmd)}
                @mouseenter=${() => { this._activeIdx = i }}
              >
                <span class="result-icon">${cmd.icon || '📌'}</span>
                <div>
                  <div class="result-label">${cmd.label}</div>
                  ${cmd.description ? html`<div class="result-desc">${cmd.description}</div>` : ''}
                </div>
              </button>
            `)}
          </div>
        </div>
      </div>
    `
  }
}

customElements.define('gl-command-palette', GlCommandPalette)

declare global {
  interface HTMLElementTagNameMap {
    'gl-command-palette': GlCommandPalette
  }
}
