import { getScores, colAvg, studentTB, classify } from '../core/calc.ts'
import { displayName } from '../config/constants.ts'
import { escapeHtml, fmt, tbBarFill, scoreClass } from './helpers.ts'
import { type StudentData, type ScoreColumnDef } from '../services/storage/StorageAdapter.types.ts'

export interface CardsViewProps {
  students: StudentData[]
  cols: ScoreColumnDef[]
  weights: Record<string, number>
  term: 'hk1' | 'hk2'
}

export function renderSingleStudentCard(
  st: StudentData,
  i: number,
  cols: ScoreColumnDef[],
  weights: Record<string, number>,
  term: 'hk1' | 'hk2',
  totalCols: number,
  selected: boolean
): string {
  const tb = studentTB(st, weights, term, cols)
  const cl = classify(tb)
  const rankKey = cl.rank.replace(/^rank-/, '')
  const scores = getScores(st, term, cols)
  let filledCols = 0

  const colsHtml = cols.map(col => {
    const colScores = scores?.[col.key] || []
    if (colScores.length) filledCols++
    const empty = !colScores.length
    const avg = colAvg(colScores)
    const chips = colScores.map((sc, idx) =>
      `<span class="chip">${fmt(sc)}<button type="button" title="Xóa" aria-label="Xóa" data-del-score data-sid="${st.id}" data-col="${col.key}" data-idx="${idx}">×</button></span>`
    ).join('')

    return `<div class="se-cell${empty ? ' is-empty' : ''}" data-col-key="${col.key}">
      <div class="se-cell-top">
        <span class="se-cell-label">${escapeHtml(col.short)}</span>
        ${!empty
          ? `<span class="se-cell-val${colScores.length > 1 ? ' is-avg' : ''}">${fmt(avg)}</span>`
          : '<span class="se-cell-val is-miss">—</span>'}
      </div>
      ${colScores.length ? `<div class="chips se-chips">${chips}</div>` : ''}
      <div class="add-score">
        <input type="number" min="0" max="10" step="0.25" placeholder="0–10" inputmode="decimal" enterkeyhint="done" autocomplete="off" data-score-input data-sid="${st.id}" data-col="${col.key}" aria-label="${escapeHtml(col.label)}" />
        <button type="button" data-add-score data-sid="${st.id}" data-col="${col.key}" title="Thêm" aria-label="Thêm" class="touch-ripple">+</button>
      </div>
    </div>`
  }).join('')

  const tenThanh = String(st.tenThanh || '').trim()
  const hoTenParts = [st.hoDem, st.ten].filter(Boolean).join(' ')
  const fallbackName = (!tenThanh && !hoTenParts && st.name) ? String(st.name).trim() : ''
  const nameHtml = tenThanh || hoTenParts || fallbackName
    ? `${tenThanh ? `<span class="se-ten-thanh">${escapeHtml(tenThanh)}</span>` : ''}${(hoTenParts || fallbackName) ? `<span class="se-ho-ten">${escapeHtml(hoTenParts || fallbackName)}</span>` : ''}`
    : '<span class="se-ho-ten">—</span>'

  const fillPct = tbBarFill(filledCols, totalCols)
  const tbStr = fmt(tb)
  const tbTitle = `TB ${tbStr} · ${cl.label} · ${filledCols}/${totalCols} cột có điểm`

  const studentInfoHtml = (st.ngaySinh || st.tenPhuHuynh || st.sdPhuHuynh)
    ? `<div class="info-field">${st.ngaySinh ? '<span class="nf-label">Ngày sinh</span>' + escapeHtml(st.ngaySinh) : ''}</div>`
    : ''

  return `<article class="student score-card se-row${st.starred ? ' is-starred' : ''}" data-id="${st.id}" draggable="true">
    <div class="se-main">
      <div class="se-who">
        <div class="se-identity">
          <input type="checkbox" class="student-select" data-select-student="${st.id}" title="Chọn học viên" aria-label="Chọn ${escapeHtml(displayName(st))}" ${selected ? 'checked' : ''} />
          <span class="stt-badge" title="STT ${i + 1}">${i + 1}</span>
          <div class="se-name-block">
            <div class="student-display-name" title="${escapeHtml(displayName(st))}">${nameHtml}</div>
            <div class="se-who-meta">
              ${st.ghiChu ? `<span class="se-meta-info" title="${escapeHtml(st.ghiChu)}">📝 ${escapeHtml(st.ghiChu)}</span>` : ''}
            </div>
          </div>
        </div>
      </div>
      <div class="se-scores">${colsHtml}</div>
      <div class="se-tb se-tb--${rankKey}" title="${escapeHtml(tbTitle)}">
        <div class="se-tb-card">
          <div class="se-tb-main">
            <span class="se-tb-kicker">TB</span>
            <span class="tb-score ${scoreClass(tb)}">${tbStr}</span>
          </div>
          <span class="tb-rank ${rankKey}">${escapeHtml(cl.label)}</span>
          <div class="se-tb-meta">
            <div class="se-tb-bar" aria-hidden="true"><i style="width:${fillPct}%"></i></div>
            <span class="tb-fill-hint">${filledCols}/${totalCols} cột</span>
          </div>
        </div>
      </div>
      <div class="student-actions se-actions">
        <button type="button" class="btn-icon btn-icon-neutral touch-ripple" data-move-student="${st.id}" title="Chuyển lớp" aria-label="Chuyển lớp">⇄</button>
        <button type="button" class="btn-icon btn-icon-neutral touch-ripple" data-journal="${st.id}" title="Nhật ký học vụ" aria-label="Nhật ký học vụ">📓</button>
        <button type="button" class="btn-icon touch-ripple" data-del-student="${st.id}" title="Xóa" aria-label="Xóa học viên">×</button>
      </div>
    </div>
    ${st.ghiChu != null ? `<details class="se-more">
      <summary>Họ tên · thông tin · ghi chú</summary>
      <div class="se-more-body">
        ${studentInfoHtml}
        <div class="student-note">
          <label class="nf-label" for="note-${st.id}">Ghi chú</label>
          <textarea id="note-${st.id}" class="note-input" rows="2" placeholder="Ghi chú ngắn…" data-note data-sid="${st.id}">${escapeHtml(st.ghiChu || '')}</textarea>
        </div>
      </div>
    </details>` : ''}
  </article>`
}

export function renderCardsView(props: CardsViewProps, selectedSet?: Set<string>): string {
  const { students, cols, weights, term } = props
  const totalCols = cols.length

  // Legend
  const legend = `<div class="se-legend" aria-hidden="true">
    <span class="se-leg-stt">#</span>
    <span class="se-leg-name">Học viên</span>
    ${cols.map(c => `<span class="se-leg-col" title="${escapeHtml(c.label)} ×${weights[c.key] || 1}">${escapeHtml(c.short)}<small>×${weights[c.key] || 1}</small></span>`).join('')}
    <span class="se-leg-tb">TB</span>
  </div>`

  const cards = students.map((st, i) => {
    const isSelected = selectedSet?.has(st.id) || false
    const card = renderSingleStudentCard(st, i, cols, weights, term, totalCols, isSelected)
    const staggerStyle = `style="animation-delay:${Math.min(i * 30, 300)}ms"`
    return card.replace(' data-id="', ` stagger-enter ${staggerStyle} data-id="`)
  }).join('')

  return `<div class="score-entry">${legend}${cards}</div>`
}
