import { LitElement, html } from 'lit'
import { studentTB } from '../../../core/calc'
import { displayName } from '../../../config/constants'
import { fmt } from '../../../views/helpers'
import type { StudentData, ScoreColumnDef } from '../../../services/storage/StorageAdapter.types'

export class GlStudentList extends LitElement {
  createRenderRoot() { return this }

  static properties = {
    students: { type: Array },
    cols: { type: Array },
    weights: { type: Object },
    term: { type: String },
    activeId: { type: String },
    totalCount: { type: Number },
  }

  declare students: StudentData[]
  declare cols: ScoreColumnDef[]
  declare weights: Record<string, number>
  declare term: 'hk1' | 'hk2'
  declare activeId: string
  declare totalCount: number

  private _filterQuery = ''

  constructor() {
    super()
    this.students = []
    this.cols = []
    this.weights = {}
    this.term = 'hk1'
    this.activeId = ''
    this.totalCount = 0
  }

  setFilter(query: string): void {
    this._filterQuery = query.trim().toLowerCase()
    this.requestUpdate()
  }

  setActiveId(id: string): void {
    this.activeId = id
    this.requestUpdate()
    this._scrollToActive()
  }

  private _scrollToActive(): void {
    this.updateComplete.then(() => {
      const item = this.querySelector(`[data-cv-id="${this.activeId}"]`) as HTMLElement
      if (item && typeof item.scrollIntoView === 'function') {
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    })
  }

  private _onItemClick(e: Event): void {
    const item = (e.target as HTMLElement).closest('.cv-student-item') as HTMLElement
    if (!item) return
    const id = item.dataset.cvId
    if (!id) return
    this.dispatchEvent(new CustomEvent('student-select', { detail: { studentId: id }, bubbles: true, composed: true }))
  }

  private _onFilterInput(e: Event): void {
    const input = e.target as HTMLInputElement
    this._filterQuery = input.value.trim().toLowerCase()
    this.requestUpdate()
  }

  render() {
    const filtered = this._filterQuery
      ? this.students.filter(st => {
          const name = displayName(st).toLowerCase()
          return name.includes(this._filterQuery)
        })
      : this.students

    return html`
      <div class="cv-side-header">
        Học viên · <span id="cvStudentCount">${this.totalCount}</span>
      </div>
      <div class="cv-side-search">
        <input type="text" id="cvStudentFilter" placeholder="Tìm nhanh..." aria-label="Tìm học viên theo tên"
          .value=${this._filterQuery} @input=${this._onFilterInput} />
      </div>
      <div id="cvStudentItems" @click=${this._onItemClick}>
        ${filtered.map(st => {
          const tb = studentTB(st, this.weights, this.term, this.cols)
          const disp = displayName(st)
          const initial = (st.tenThanh || st.ten || st.name || '?')[0].toUpperCase()
          return html`
            <div class="cv-student-item${st.id === this.activeId ? ' active' : ''}" data-cv-id="${st.id}">
              <span class="cv-student-avatar">${initial}</span>
              <span class="cv-student-name">${disp}</span>
              <span class="cv-student-tb">${fmt(tb)}</span>
            </div>
          `
        })}
        ${!filtered.length ? html`<div class="hint" style="padding:12px;text-align:center;color:var(--muted);font-size:0.8rem;">Không tìm thấy học viên</div>` : ''}
      </div>
    `
  }
}

customElements.define('gl-student-list', GlStudentList)

declare global {
  interface HTMLElementTagNameMap {
    'gl-student-list': GlStudentList
  }
}
