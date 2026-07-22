import { LitElement, html } from 'lit'
import { fmt } from '../../../views/helpers'
import type { StudentData, ScoreColumnDef } from '../../../services/storage/StorageAdapter.types'

export class GlStudentDetail extends LitElement {
  createRenderRoot() { return this }

  static properties = {
    student: { type: Object },
    cols: { type: Array },
    weights: { type: Object },
    term: { type: String },
    open: { type: Boolean },
  }

  declare student: StudentData | null
  declare cols: ScoreColumnDef[]
  declare weights: Record<string, number>
  declare term: 'hk1' | 'hk2'
  declare open: boolean

  constructor() {
    super()
    this.student = null
    this.cols = []
    this.weights = {}
    this.term = 'hk1'
    this.open = false
  }

  private _close(): void {
    this.open = false
    this.dispatchEvent(new CustomEvent('detail-close', { bubbles: true, composed: true }))
  }

  private _onEdit(): void {
    if (!this.student) return
    this.dispatchEvent(new CustomEvent('detail-edit', { detail: { studentId: this.student.id }, bubbles: true, composed: true }))
  }

  private _onJournal(): void {
    if (!this.student) return
    this.dispatchEvent(new CustomEvent('detail-journal', { detail: { studentId: this.student.id }, bubbles: true, composed: true }))
  }

  render() {
    const st = this.student
    if (!st || !this.open) return html``

    const scores = st.scoresByTerm?.[this.term] || {}
    const historyItems = this.cols.map(c => {
      const list = scores[c.key] || []
      if (!list.length) return null
      return html`<div style="background:var(--surface);padding:4px 8px;border-radius:var(--radius-sm);border:1px solid var(--border);font-size:0.8rem;"><strong>${c.short}:</strong> ${list.join(', ')}</div>`
    }).filter(Boolean)

    const tb = st.scoresByTerm?.[this.term]
      ? (() => {
          let sum = 0; let count = 0
          for (const c of this.cols) {
            const latest = st.scoresByTerm![this.term]![c.key]?.slice(-1)?.[0]
            if (latest != null) { sum += latest * (this.weights[c.key] || 1); count += (this.weights[c.key] || 1) }
          }
          return count > 0 ? sum / count : null
        })()
      : null

    return html`
      <div class="detail-overlay" @click=${this._close} style="position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:200;opacity:${this.open ? 1 : 0};transition:opacity 200ms;"></div>
      <div class="detail-panel" style="position:fixed;top:0;right:0;bottom:0;width:min(50vw,480px);max-width:100vw;background:var(--surface);z-index:201;box-shadow:-4px 0 24px rgba(0,0,0,0.12);transform:translateX(${this.open ? '0' : '100%'});transition:transform 250ms ease;overflow-y:auto;display:flex;flex-direction:column;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border);flex-shrink:0;">
          <h3 style="margin:0;font-size:1rem;font-weight:750;color:var(--color-primary);">${st.hoDem || ''} ${st.ten || st.name}</h3>
          <gl-button variant="ghost" size="sm" @click=${this._close} label="Đóng">✕</gl-button>
        </div>
        <div style="padding:16px 20px;flex:1;overflow-y:auto;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:0.85rem;">
            <div><strong>Tên thánh:</strong> ${st.tenThanh || '—'}</div>
            <div><strong>Mã HV:</strong> ${st.maHV || '—'}</div>
            <div><strong>Phụ huynh:</strong> ${st.tenPhuHuynh || '—'}</div>
            <div><strong>SĐT:</strong> ${st.sdPhuHuynh || '—'}</div>
            <div style="grid-column:1/-1;"><strong>Ghi chú:</strong> ${st.ghiChu || '—'}</div>
          </div>
          ${tb != null ? html`
            <div style="margin-top:16px;padding:12px 16px;background:var(--surface2);border-radius:var(--radius-md);text-align:center;">
              <div style="font-size:0.75rem;color:var(--color-text-secondary);margin-bottom:4px;">TRUNG BÌNH (${this.term.toUpperCase()})</div>
              <div style="font-size:1.5rem;font-weight:800;">${fmt(tb)}</div>
            </div>
          ` : ''}
          <div style="margin-top:16px;">
            <h4 style="margin:0 0 8px;font-size:0.85rem;font-weight:750;color:var(--color-text);">Lịch sử điểm số</h4>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              ${historyItems.length ? historyItems : html`<div class="hint" style="font-size:0.8rem;">Chưa có điểm</div>`}
            </div>
          </div>
        </div>
        <div style="display:flex;gap:8px;padding:12px 20px;border-top:1px solid var(--border);flex-shrink:0;">
          <gl-button variant="primary" size="sm" @click=${this._onEdit}>✏️ Sửa thông tin</gl-button>
          <gl-button variant="ghost" size="sm" @click=${this._onJournal}>📓 Nhật ký học vụ</gl-button>
        </div>
      </div>
    `
  }
}

customElements.define('gl-student-detail', GlStudentDetail)

declare global {
  interface HTMLElementTagNameMap {
    'gl-student-detail': GlStudentDetail
  }
}
