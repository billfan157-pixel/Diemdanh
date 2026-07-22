import { LitElement, html } from 'lit'
import { studentTB, classify } from '../../../core/calc'
import { fmt } from '../../../views/helpers'
import type { StudentData, ScoreColumnDef } from '../../../services/storage/StorageAdapter.types'

export class GlStudentRow extends LitElement {
  createRenderRoot() { return this }

  static properties = {
    student: { type: Object },
    cols: { type: Array },
    weights: { type: Object },
    term: { type: String },
    index: { type: Number },
    selected: { type: Boolean },
    expanded: { type: Boolean },
  }

  declare student: StudentData
  declare cols: ScoreColumnDef[]
  declare weights: Record<string, number>
  declare term: 'hk1' | 'hk2'
  declare index: number
  declare selected: boolean
  declare expanded: boolean

  constructor() {
    super()
    this.student = null as unknown as StudentData
    this.cols = []
    this.weights = {}
    this.term = 'hk1'
    this.index = 0
    this.selected = false
    this.expanded = false
  }

  connectedCallback(): void {
    super.connectedCallback()
    this.style.display = 'contents'
  }

  toggleExpand(): void {
    this.expanded = !this.expanded
  }

  render() {
    const st = this.student
    if (!st) return html``

    const delay = Math.min(this.index * 30, 300)
    const tb = studentTB(st, this.weights, this.term, this.cols)
    const cl = classify(tb)
    const rankKey = cl.rank.replace(/^rank-/, '')

    const colspan = 4 + this.cols.length + 2

    return html`
      <tr data-id="${st.id}" draggable="true"
        class="${st.starred ? 'is-starred' : ''} ${this.selected ? 'is-selected' : ''} stagger-enter"
        style="animation-delay:${delay}ms;transition:background 150ms ease;">
        <td class="sel-col col-hide-xs">
          <input type="checkbox" class="student-select" data-select-student="${st.id}" title="Chọn học viên" aria-label="Chọn học viên" .checked=${this.selected} />
        </td>
        <td style="text-align:center;font-weight:bold;color:var(--color-text-secondary);opacity:0.85;">${this.index + 1}</td>
        <td class="name-col col-hide-xs">${st.hoDem}</td>
        <td class="name-col" style="font-weight:750;color:var(--color-primary);">${st.ten || st.name}</td>
        ${this.cols.map((c, ci) => {
          const priorityClass = ci >= 4 ? 'col-hide-sm' : ci >= 2 ? 'col-hide-xs' : ''
          const scores = st.scoresByTerm?.[this.term]?.[c.key] || []
          return html`
            <td class="${priorityClass}" data-colkey="${c.key}">
              <input class="cell-score" type="number" min="0" max="10" step="0.25" inputmode="decimal" enterkeyhint="next" autocomplete="off"
                value="${scores.length ? scores[scores.length - 1] : ''}"
                data-table-score data-sid="${st.id}" data-col="${c.key}" aria-label="${c.label}" />
            </td>
          `
        })}
        <td class="tb-cell ${cl.score}"><span class="rank-pill ${rankKey}">${fmt(tb)}</span></td>
        <td class="name-col col-hide-xs">${st.ghiChu}</td>
      </tr>
      ${this.expanded ? this._renderDetail(st, colspan) : ''}
    `
  }

  private _renderDetail(st: StudentData, colspan: number) {
    const scores = st.scoresByTerm?.[this.term] || {}
    const historyItems = this.cols.map(c => {
      const list = scores[c.key] || []
      if (!list.length) return null
      return html`<div style="background:var(--surface);padding:4px 8px;border-radius:var(--radius-sm);border:1px solid var(--border);"><strong>${c.short}:</strong> ${list.join(', ')}</div>`
    }).filter(Boolean)

    return html`
      <tr class="detail-row" data-detail-for="${st.id}">
        <td colspan="${colspan}" style="background:var(--surface2);padding:12px 16px;border-bottom:1px solid var(--border);">
          <div class="detail-row-content" style="display:flex;gap:24px;flex-wrap:wrap;text-align:left;font-size:0.85rem;">
            <div style="flex:1;min-width:200px;">
              <h4 style="margin:0 0 8px;color:var(--color-primary);font-weight:750;">Thông tin học viên</h4>
              <p style="margin:4px 0;"><strong>Họ và tên:</strong> ${st.hoDem || ''} ${st.ten || st.name}</p>
              <p style="margin:4px 0;"><strong>Mã HV:</strong> ${st.maHV || '—'}</p>
              <p style="margin:4px 0;"><strong>Ghi chú:</strong> ${st.ghiChu || '—'}</p>
            </div>
            <div style="flex:1;min-width:200px;">
              <h4 style="margin:0 0 8px;color:var(--color-primary);font-weight:750;">Liên hệ phụ huynh</h4>
              <p style="margin:4px 0;"><strong>Phụ huynh:</strong> ${st.tenPhuHuynh || '—'}</p>
              <p style="margin:4px 0;"><strong>Số điện thoại:</strong> ${st.sdPhuHuynh || '—'}</p>
            </div>
            <div style="flex:1.5;min-width:250px;">
              <h4 style="margin:0 0 8px;color:var(--color-primary);font-weight:750;">Lịch sử điểm số (${this.term.toUpperCase()})</h4>
              <div style="display:flex;flex-wrap:wrap;gap:6px;">
                ${historyItems.length ? historyItems : html`<div class="hint">Chưa có điểm</div>`}
              </div>
              <div style="margin-top:12px;display:flex;gap:8px;">
                <gl-button variant="ghost" size="sm" class="btn-detail-journal" data-sid="${st.id}">📓 Nhật ký học vụ</gl-button>
                <gl-button variant="ghost" size="sm" class="btn-detail-edit" data-sid="${st.id}">✏️ Sửa thông tin</gl-button>
              </div>
            </div>
          </div>
        </td>
      </tr>
    `
  }
}

customElements.define('gl-student-row', GlStudentRow)

declare global {
  interface HTMLElementTagNameMap {
    'gl-student-row': GlStudentRow
  }
}
