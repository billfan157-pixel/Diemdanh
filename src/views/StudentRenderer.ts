import { resolveClassColumns } from '../config/columns.ts'
import { type ViewMode } from '../config/constants.ts'
import { type ClassData, type StudentData, type ScoreColumnDef } from '../services/storage/StorageAdapter.types.ts'
import { studentTB, studentYearTB, classify, colAvg } from '../core/calc.ts'
import { renderCardsView } from './cardsView.ts'
import { fmt, scoreClass } from './helpers.ts'
export type ActiveTerm = 'hk1' | 'hk2' | 'year'

export interface StudentFilter {
  classification?: string
  completion?: 'all' | 'complete' | 'incomplete' | 'none'
}

export function applyFilters(students: StudentData[], cls: ClassData, term: ActiveTerm, filter?: StudentFilter): StudentData[] {
  if (!filter) return students
  const actualTerm = term === 'year' ? 'hk1' : term
  const cols = resolveClassColumns(cls)
  return students.filter(st => {
    // Classification filter
    if (filter.classification && filter.classification !== 'all') {
      const tb = studentTB(st, cls.weights, actualTerm, cols)
      const cl = classify(tb)
      if (cl.rank !== filter.classification) return false
    }
    // Completion filter
    if (filter.completion && filter.completion !== 'all') {
      const filled = cols.filter(c => (st.scoresByTerm?.[actualTerm]?.[c.key]?.length ?? 0) > 0).length
      if (filter.completion === 'complete' && filled < cols.length) return false
      if (filter.completion === 'incomplete' && filled === cols.length) return false
      if (filter.completion === 'none' && filled > 0) return false
    }
    return true
  })
}

export function renderStudents(
  cls: ClassData,
  term: ActiveTerm,
  viewMode: ViewMode,
  searchQuery?: string,
  filter?: StudentFilter
): string {
  let students = filterStudents(cls.students, searchQuery)
  students = applyFilters(students, cls, term, filter)

  if (!cls.students.length) {
    return emptyState('✏️', 'Lớp chưa có học viên', 'Thêm học viên mới từ nút "➕ Thêm HV" ở trên.')
  }
  if (!students.length) {
    if (searchQuery) return emptyState('🔍', 'Không tìm thấy học viên', 'Thử tìm với từ khóa khác.')
    return emptyState('🔍', 'Không có học viên phù hợp', 'Thử điều chỉnh bộ lọc hoặc tìm kiếm.')
  }

  const cols = resolveClassColumns(cls)
  const actualTerm = term === 'year' ? 'hk1' : term

  switch (viewMode) {
    case 'year': {
      if (term !== 'year') {
        return renderCardsView({ students, cols, weights: cls.weights, term: actualTerm })
      }
      return renderYearView(cls, students, cols)
    }
    case 'stats': {
      if (term !== 'year') {
        return renderStatsView(cls, students, cols, cls.weights, actualTerm)
      }
      return renderYearView(cls, students, cols) + '<div style="margin-top:14px">' + renderStatsView(cls, students, cols, cls.weights, actualTerm) + '</div>'
    }
    case 'cards':
      return renderCardsView({ students, cols, weights: cls.weights, term: actualTerm })
    case 'table':
      return renderTableView(cls, students, actualTerm)
    case 'rank':
      return renderRankView(cls, students, cls.weights, actualTerm, cols)
    default:
      return renderCardsView({ students, cols, weights: cls.weights, term: actualTerm })
  }
}

function filterStudents(all: StudentData[], query?: string): StudentData[] {
  if (!query) return all
  const q = query.toLowerCase()
  return all.filter(st => {
    const name = [st.tenThanh, st.hoDem, st.ten, st.name, st.maHV]
      .filter(Boolean).join(' ').toLowerCase()
    return name.includes(q)
  })
}

function emptyState(icon: string, title: string, hint: string): string {
  return `<div class="dash-empty" style="text-align:center;padding:40px 16px">
    <div class="empty-icon">${icon}</div>
    <strong>${title}</strong>
    <p class="hint" style="margin-top:8px;line-height:1.4">${hint}</p>
  </div>`
}

export function renderTableView(cls: ClassData, students: StudentData[], term: 'hk1' | 'hk2' = 'hk1'): string {
  const cols = resolveClassColumns(cls)
  const headerCols = cols.map(c =>
    `<th title="${c.label}×${cls.weights[c.key] || 1}">${c.short}<br><span>×${cls.weights[c.key] || 1}</span></th>`
  ).join('')
  const rows = students.map((st, i) => {
    const headerCells = `<td class="sel-col"><input type="checkbox" class="student-select" data-select-student="${st.id}" title="Chọn học viên" /></td><td>${i + 1}</td><td class="name-col">${st.hoDem || ''}</td><td class="name-col">${st.ten || st.name || ''}</td>`
    const scoreCells = cols.map(c => {
      const scores = st.scoresByTerm?.[term]?.[c.key] || []
      return `<td><input class="cell-score" type="number" min="0" max="10" step="0.25" value="${scores.length ? scores[scores.length - 1] : ''}" data-table-score data-sid="${st.id}" data-col="${c.key}" /></td>`
    }).join('')
    const tb = studentTB(st, cls.weights, term, cols)
    return `<tr data-id="${st.id}">${headerCells}${scoreCells}<td class="tb-cell">${fmt(tb)}</td><td class="name-col">${st.ghiChu || ''}</td></tr>`
  }).join('')
  return `<div class="table-wrap">
    <table class="score-table">
      <thead><tr><th class="sel-col"><input type="checkbox" id="selectAllTable" data-select-all aria-label="Chọn tất cả" /></th><th>STT</th><th class="name-col">Họ đệm</th><th class="name-col">Tên</th>${headerCols}<th>TB</th><th>Ghi chú</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <p class="hint" style="margin-top:8px">Gõ điểm vào ô — Enter hoặc Tab để sang ô kế tiếp.</p>`
}

export function renderRankView(
  _cls: ClassData,
  students: StudentData[],
  weights: Record<string, number>,
  term: 'hk1' | 'hk2' = 'hk1',
  cols: ScoreColumnDef[]
): string {

  const ranked = students
    .map(st => {
      const tb = studentTB(st, weights, term, cols)
      const filled = cols.filter(c => (st.scoresByTerm?.[term]?.[c.key]?.length ?? 0) > 0).length
      return { ...st, tb, filled }
    })
    .sort((a, b) => {
      const tbA = a.tb ?? -1
      const tbB = b.tb ?? -1
      return tbB - tbA
    })

  const rows = ranked.map((st, i) => {
    const tb = st.tb
    const cl = classify(tb)
    const rankLabel = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`
      return `<tr>
        <td class="rank-badge">${rankLabel}</td>
        <td class="name-col">${[st.tenThanh, st.hoDem, st.ten].filter(Boolean).join(' ') || st.name || '—'}</td>
        <td class="tb-cell ${cl.score}">${fmt(tb)}</td>
        <td><span class="tag ${cl.rank.replace(/^rank-/, '')}">${cl.label}</span></td>
        <td>${st.filled}/${cols.length}</td>
        <td class="name-col">${st.ghiChu || ''}</td>
      </tr>`
  }).join('')

  return `<div class="table-wrap">
    <table class="rank-table">
      <thead><tr><th>#</th><th class="name-col">Học viên</th><th>TB</th><th>Xếp loại</th><th>Điểm đủ</th><th>Ghi chú</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <p class="hint" style="margin-top:8px">Xếp hạng theo TB — từ cao xuống thấp.</p>`
}

// ========== Year view (combined HK1+HK2) ==========

export function renderYearView(cls: ClassData, students: StudentData[], cols: ScoreColumnDef[]): string {
  const weights = cls.weights
  let tySum = 0
  let tyCount = 0
  let both = 0
  let only1 = 0
  let only2 = 0
  let none = 0

  const ranked = students
    .map(st => {
      const t1 = studentTB(st, weights, 'hk1', cols)
      const t2 = studentTB(st, weights, 'hk2', cols)
      const tYr = studentYearTB(st, weights, cols)
      if (t1 != null && t2 != null) both++
      else if (t1 != null) only1++
      else if (t2 != null) only2++
      else none++
      if (tYr != null) { tySum += tYr; tyCount++ }
      const c1 = t1 != null ? classify(t1) : null
      const c2 = t2 != null ? classify(t2) : null
      const cYr = tYr != null ? classify(tYr) : null
      return { st, t1, t2, tYr, c1, c2, cYr }
    })
    .sort((a, b) => {
      const ta = a.tYr ?? -1
      const tb = b.tYr ?? -1
      return tb - ta
    })

  const classAvg = tyCount > 0 ? fmt(tySum / tyCount) : '—'

  const rows = ranked.map((item, i) => {
    const { st, t1, t2, tYr, c1, c2, cYr } = item
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`
    return `<tr>
      <td class="tb-cell">${medal}</td>
      <td class="name-col">${st.hoDem || ''}</td>
      <td class="name-col">${st.ten || st.name || ''}</td>
      <td class="tb-cell ${c1?.score || 'score-none'}">${fmt(t1)}</td>
      <td>${c1 ? `<span class="tag ${c1.rank.replace(/^rank-/, '')}">${c1.label}</span>` : '—'}</td>
      <td class="tb-cell ${c2?.score || 'score-none'}">${fmt(t2)}</td>
      <td>${c2 ? `<span class="tag ${c2.rank.replace(/^rank-/, '')}">${c2.label}</span>` : '—'}</td>
      <td class="tb-cell ${cYr?.score || 'score-none'}" style="font-weight:800">${fmt(tYr)}</td>
      <td>${cYr ? `<span class="tag ${cYr.rank.replace(/^rank-/, '')}">${cYr.label}</span>` : '—'}</td>
      <td class="name-col">${st.ghiChu || ''}</td>
    </tr>`
  }).join('')

  return `<div class="year-board">
    <div class="year-hero">
      <div class="year-hero-score">
        <div class="year-hero-n score-${classAvg === '—' ? 'none' : 'g'}">${classAvg}</div>
        <div class="year-hero-meta">
          <div class="year-hero-label">TB lớp cả năm</div>
          <div class="year-hero-sub">${tyCount}/${students.length} HV có điểm</div>
        </div>
      </div>
      <div class="year-chips">
        <span class="year-chip year-chip-ok"><strong>${both}</strong> đủ 2 HK</span>
        <span class="year-chip year-chip-warn"><strong>${only1}</strong> chỉ HK1</span>
        <span class="year-chip year-chip-warn"><strong>${only2}</strong> chỉ HK2</span>
        <span class="year-chip year-chip-bad"><strong>${none}</strong> chưa điểm</span>
      </div>
    </div>
    <div class="table-wrap">
      <table class="score-table year-table">
        <thead><tr>
          <th>Hạng</th><th class="name-col">Họ đệm</th><th class="name-col">Tên</th>
          <th>TB HK1</th><th>XL HK1</th><th>TB HK2</th><th>XL HK2</th>
          <th>TB cả năm</th><th>XL năm</th><th>Ghi chú</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`
}

// ========== Stats view ==========

export function renderStatsView(
  _cls: ClassData,
  students: StudentData[],
  cols: ScoreColumnDef[],
  weights: Record<string, number>,
  term: 'hk1' | 'hk2'
): string {
  const buckets: Record<string, { label: string; n: number; color: string }> = {
    xs: { label: 'Xuất sắc (≥9)', n: 0, color: '#16a34a' },
    g: { label: 'Giỏi (8–9)', n: 0, color: '#2563eb' },
    k: { label: 'Khá (6.5–8)', n: 0, color: '#7c3aed' },
    tb: { label: 'TB (5–6.5)', n: 0, color: '#d97706' },
    y: { label: 'Yếu (<5)', n: 0, color: '#dc2626' },
    none: { label: 'Chưa có TB', n: 0, color: '#94a3b8' },
  }

  let tbs: number[] = []
  for (const st of students) {
    const tb = studentTB(st, weights, term, cols)
    if (tb == null) {
      buckets.none.n++
    } else {
      tbs.push(tb)
      const key = tb >= 9 ? 'xs' : tb >= 8 ? 'g' : tb >= 6.5 ? 'k' : tb >= 5 ? 'tb' : 'y'
      buckets[key].n++
    }
  }

  const maxCount = Math.max(...Object.values(buckets).map(b => b.n), 1)
  const avg = tbs.length ? fmt(tbs.reduce((a, b) => a + b, 0) / tbs.length) : '—'
  const maxTb = tbs.length ? fmt(Math.max(...tbs)) : '—'
  const minTb = tbs.length ? fmt(Math.min(...tbs)) : '—'

  const barRows = Object.values(buckets).map(b =>
    `<div class="bar-row">
      <div class="bl">${b.label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round((b.n / maxCount) * 100)}%;background:${b.color}"></div></div>
      <div class="bn" style="min-width:24px;text-align:right">${b.n}</div>
    </div>`
  ).join('')

  // Per-column averages
  const colRows = cols.map(c => {
    const scores = students
      .map(st => colAvg(st.scoresByTerm?.[term]?.[c.key]))
      .filter((s): s is number => s != null)
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
    return `<div class="col-avg-row">
      <span class="ca-label">${c.label} (${scores.length}/${students.length})</span>
      <span class="ca-val ${scoreClass(avg)}">${fmt(avg)}</span>
    </div>`
  }).join('')

  return `<div class="stats-grid">
    <div class="stats-panel">
      <h4>Phân bố xếp loại (theo TB)</h4>
      ${barRows}
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;margin-top:10px">
        <div>TB lớp</div><div style="font-weight:800;font-size:1.2rem;color:var(--gold,#d97706)">${avg}</div>
        <div>Cao nhất</div><div style="font-weight:800;font-size:1.2rem;color:var(--success,#16a34a)">${maxTb}</div>
        <div>Thấp nhất</div><div style="font-weight:800;font-size:1.2rem;color:var(--danger,#dc2626)">${minTb}</div>
      </div>
    </div>
    <div class="stats-panel">
      <h4>Trung bình từng cột điểm</h4>
      ${colRows}
    </div>
  </div>`
}
