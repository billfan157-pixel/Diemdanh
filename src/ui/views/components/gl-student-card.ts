import { LitElement, html } from 'lit'
import { studentTB, classify } from '../../../core/calc'
import { displayName } from '../../../config/constants'
import { fmt, tbBarFill } from '../../../views/helpers'
import type { StudentData, ScoreColumnDef } from '../../../services/storage/StorageAdapter.types'

import './gl-score-input'

export class GlStudentCard extends LitElement {
  createRenderRoot() { return this }

  static properties = {
    student: { type: Object },
    cols: { type: Array },
    weights: { type: Object },
    term: { type: String },
    index: { type: Number },
    totalCols: { type: Number },
    selected: { type: Boolean },
  }

  declare student: StudentData
  declare cols: ScoreColumnDef[]
  declare weights: Record<string, number>
  declare term: 'hk1' | 'hk2'
  declare index: number
  declare totalCols: number
  declare selected: boolean

  constructor() {
    super()
    this.student = null as unknown as StudentData
    this.cols = []
    this.weights = {}
    this.term = 'hk1'
    this.index = 0
    this.totalCols = 0
    this.selected = false
  }

  render() {
    const st = this.student
    if (!st) return html``

    const tb = studentTB(st, this.weights, this.term, this.cols)
    const cl = classify(tb)
    const rankKey = cl.rank.replace(/^rank-/, '')

    const tenThanh = String(st.tenThanh || '').trim()
    const hoTenParts = [st.hoDem, st.ten].filter(Boolean).join(' ')
    const fallbackName = (!tenThanh && !hoTenParts && st.name) ? String(st.name).trim() : ''

    const scores = this._getScores(st, this.term, this.cols)
    const filledCols = this.cols.filter(col => (scores[col.key]?.length ?? 0) > 0).length
    const fillPct = tbBarFill(filledCols, this.cols.length)
    const tbStr = fmt(tb)

    return html`
      <article class="student score-card se-row${st.starred ? ' is-starred' : ''} stagger-enter" data-id="${st.id}" draggable="true" style="animation-delay:${this.index * 30}ms">
        <div class="se-main">
          <div class="se-who">
            <div class="se-identity">
              <input type="checkbox" class="student-select" data-select-student="${st.id}" title="Chọn học viên" aria-label="Chọn ${displayName(st)}" .checked=${this.selected} />
              <span class="stt-badge" title="STT ${this.index + 1}">${this.index + 1}</span>
              <div class="se-name-block">
                <div class="student-display-name" title="${displayName(st)}">
                  ${tenThanh ? html`<span class="se-ten-thanh">${tenThanh}</span>` : ''}
                  ${(hoTenParts || fallbackName) ? html`<span class="se-ho-ten">${hoTenParts || fallbackName}</span>` : html`<span class="se-ho-ten">—</span>`}
                </div>
                <div class="se-who-meta">
                  ${st.ghiChu ? html`<span class="se-meta-info" title="${st.ghiChu}">📝 ${st.ghiChu}</span>` : ''}
                </div>
              </div>
            </div>
          </div>
          <div class="se-scores">
            ${this.cols.map(col => {
              const colScores = scores[col.key] || []
              return html`
                <gl-score-input .studentId=${st.id} .columnKey=${col.key} .columnLabel=${col.label} .columnShort=${col.short} .weight=${this.weights[col.key] || 1} .scores=${colScores}></gl-score-input>
              `
            })}
          </div>
          <div class="se-tb se-tb--${rankKey}" title="TB ${tbStr} · ${cl.label} · ${filledCols}/${this.cols.length} cột có điểm">
            <div class="se-tb-card">
              <div class="se-tb-main">
                <span class="se-tb-kicker">TB</span>
                <span class="tb-score ${this._scoreClass(tb)}">${tbStr}</span>
              </div>
              <span class="tb-rank ${rankKey}">${cl.label}</span>
              <div class="se-tb-meta">
                <div class="se-tb-bar" aria-hidden="true"><i style="width:${fillPct}%"></i></div>
                <span class="tb-fill-hint">${filledCols}/${this.cols.length} cột</span>
              </div>
            </div>
          </div>
          <div class="student-actions se-actions">
            <button type="button" class="btn-icon btn-icon-neutral touch-ripple" data-move-student="${st.id}" title="Chuyển lớp" aria-label="Chuyển lớp">⇄</button>
            <button type="button" class="btn-icon btn-icon-neutral touch-ripple" data-journal="${st.id}" title="Nhật ký học vụ" aria-label="Nhật ký học vụ">📓</button>
            <button type="button" class="btn-icon touch-ripple" data-del-student="${st.id}" title="Xóa" aria-label="Xóa học viên">×</button>
          </div>
        </div>
        ${st.ghiChu != null ? html`
          <details class="se-more">
            <summary>Họ tên · thông tin · ghi chú</summary>
            <div class="se-more-body">
              ${this._renderInfoFields(st)}
              <div class="student-note">
                <label class="nf-label" for="note-${st.id}">Ghi chú</label>
                <textarea id="note-${st.id}" class="note-input" rows="2" placeholder="Ghi chú ngắn…" data-note data-sid="${st.id}">${st.ghiChu || ''}</textarea>
              </div>
            </div>
          </details>
        ` : ''}
      </article>
    `
  }

  private _getScores(st: StudentData, term: 'hk1' | 'hk2', cols: ScoreColumnDef[]): Record<string, number[]> {
    const result: Record<string, number[]> = {}
    for (const col of cols) {
      result[col.key] = st.scoresByTerm?.[term]?.[col.key] || []
    }
    return result
  }

  private _renderInfoFields(st: StudentData) {
    const fields: import('lit').TemplateResult[] = []
    if (st.ngaySinh) fields.push(html`<span class="nf-label">Ngày sinh</span>${st.ngaySinh}`)
    if (st.tenPhuHuynh) fields.push(html`<span class="nf-label">PH</span>${st.tenPhuHuynh}`)
    if (st.sdPhuHuynh) fields.push(html`<span class="nf-label">SĐT</span>${st.sdPhuHuynh}`)
    if (!fields.length) return html``
    return html`<div class="info-field">${fields}</div>`
  }

  private _scoreClass(tb: number | null): string {
    if (tb == null) return 'score-none'
    if (tb >= 9) return 'score-xs'
    if (tb >= 8) return 'score-g'
    if (tb >= 6.5) return 'score-k'
    if (tb >= 5) return 'score-tb'
    return 'score-y'
  }
}

customElements.define('gl-student-card', GlStudentCard)

declare global {
  interface HTMLElementTagNameMap {
    'gl-student-card': GlStudentCard
  }
}
