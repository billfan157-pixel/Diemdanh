import { LitElement, html } from 'lit'
import { fmt } from '../../../views/helpers'

export class GlScoreInput extends LitElement {
  createRenderRoot() { return this }

  static properties = {
    studentId: { type: String },
    columnKey: { type: String },
    columnLabel: { type: String },
    columnShort: { type: String },
    weight: { type: Number },
    scores: { type: Array },
  }

  declare studentId: string
  declare columnKey: string
  declare columnLabel: string
  declare columnShort: string
  declare weight: number
  declare scores: number[]

  constructor() {
    super()
    this.studentId = ''
    this.columnKey = ''
    this.columnLabel = ''
    this.columnShort = ''
    this.weight = 1
    this.scores = []
  }

  render() {
    const hasScores = this.scores.length > 0
    const empty = !hasScores
    const avg = hasScores
      ? this.scores.reduce((a, b) => a + b, 0) / this.scores.length
      : null

    return html`
      <div class="se-cell${empty ? ' is-empty' : ''}">
        <div class="se-cell-top">
          <span class="se-cell-label">${this.columnShort}</span>
          ${!empty
            ? html`<span class="se-cell-val${this.scores.length > 1 ? ' is-avg' : ''}">${avg !== null ? fmt(avg) : ''}</span>`
            : html`<span class="se-cell-val is-miss">—</span>`}
        </div>
        ${hasScores ? html`
          <div class="chips se-chips">
            ${this.scores.map((sc, idx) => html`
              <span class="chip">${fmt(sc)}<button type="button" title="Xóa" aria-label="Xóa" data-del-score data-sid="${this.studentId}" data-col="${this.columnKey}" data-idx="${idx}">×</button></span>
            `)}
          </div>
        ` : ''}
        <div class="add-score">
          <input type="number" min="0" max="10" step="0.25" placeholder="0–10" inputmode="decimal" enterkeyhint="done" autocomplete="off" data-score-input data-sid="${this.studentId}" data-col="${this.columnKey}" aria-label="${this.columnLabel}" />
          <button type="button" data-add-score data-sid="${this.studentId}" data-col="${this.columnKey}" title="Thêm" aria-label="Thêm" class="touch-ripple">+</button>
        </div>
      </div>
    `
  }
}

customElements.define('gl-score-input', GlScoreInput)

declare global {
  interface HTMLElementTagNameMap {
    'gl-score-input': GlScoreInput
  }
}
