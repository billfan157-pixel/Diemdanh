// ============================================================
// Parish / Ban GL report helpers (Charts + Enhanced Report)
// ============================================================

import { ClassData, ScoreColumnDef } from '../services/storage/StorageAdapter.types'
import { summarizeClass, summarizeYear, YearClassSummary } from './years.ts'
import { classifyStudent, displayName, formatScore } from '../config/constants.ts'
import { resolveClassColumns } from '../config/columns.ts'
import { studentYearTB } from '../core/calc.ts'

export interface ParishDashboardData {
  year: string | null
  classCount: number
  studentCount: number
  avgTB: number | null
  completePercent: number
  redClasses: YearClassSummary[]
  rankings: YearClassSummary[]
  topStudents: Array<{ name: string; className: string; tb: number; rank: string }>
}

export function buildParishDashboard(
  classes: ClassData[],
  yearFilter: string | null
): ParishDashboardData {
  const scoped = yearFilter ? classes.filter(c => c.year === yearFilter) : classes
  const year = yearFilter || (scoped[0]?.year ?? null)
  const yearSummary = year
    ? summarizeYear(classes, year)
    : {
        year: '',
        classCount: scoped.length,
        studentCount: scoped.reduce((n, c) => n + c.students.length, 0),
        avgTB: null as number | null,
        completePercent: 0,
        redClasses: 0,
        classes: scoped.map(summarizeClass)
      }

  if (!yearFilter && scoped.length) {
    const summaries = scoped.map(summarizeClass)
    const tbs = summaries.map(s => s.avgTB).filter((t): t is number => t !== null)
    yearSummary.classCount = summaries.length
    yearSummary.studentCount = summaries.reduce((n, s) => n + s.studentCount, 0)
    yearSummary.avgTB = tbs.length ? tbs.reduce((a, b) => a + b, 0) / tbs.length : null
    const completeWeighted = summaries.reduce((n, s) => n + s.completePercent * s.studentCount, 0)
    yearSummary.completePercent = yearSummary.studentCount
      ? Math.round(completeWeighted / yearSummary.studentCount)
      : 0
    yearSummary.classes = summaries.sort((a, b) => (b.avgTB ?? -1) - (a.avgTB ?? -1))
  }

  const rankings = yearSummary.classes
  const redClasses = rankings.filter(c => c.isRed)

  const topStudents: ParishDashboardData['topStudents'] = []
  for (const c of scoped) {
    const cols = resolveClassColumns(c)
    for (const s of c.students) {
      const tb = studentYearTB(s, c.weights, cols)
      if (tb === null) continue
      topStudents.push({
        name: displayName(s),
        className: c.name,
        tb,
        rank: classifyStudent(tb).rank
      })
    }
  }
  topStudents.sort((a, b) => b.tb - a.tb)

  return {
    year,
    classCount: yearSummary.classCount,
    studentCount: yearSummary.studentCount,
    avgTB: yearSummary.avgTB,
    completePercent: yearSummary.completePercent,
    redClasses,
    rankings,
    topStudents: topStudents.slice(0, 20)
  }
}

/** SVG horizontal bar chart of class rankings by avg TB. */
export function buildRankingChartSvg(data: ParishDashboardData): string {
  const items = data.rankings.map((c, i) => ({
    label: c.className,
    value: c.avgTB != null ? c.avgTB : 0,
    isRed: c.isRed,
    idx: i
  }))
  if (!items.length) return ''

  const maxVal = Math.max(...items.map(i => i.value), 10)
  const barHeight = 24
  const gap = 6
  const labelW = 140
  const chartH = items.length * (barHeight + gap) + 20
  const chartW = 600
  const valW = 50

  const bars = items.map((item, i) => {
    const y = i * (barHeight + gap) + 10
    const w = ((item.value / maxVal) * (chartW - labelW - valW - 30))
    const color = item.isRed ? '#ef4444' : '#3b82f6'
    return `
      <text x="${labelW - 8}" y="${y + barHeight / 2 + 4}" font-family="system-ui,sans-serif" font-size="11" fill="#333" text-anchor="end">${escapeHtml(item.label)}</text>
      <rect x="${labelW + 4}" y="${y + 2}" width="${Math.max(w, 4)}" height="${barHeight - 4}" rx="3" fill="${color}" opacity="0.85" />
      <text x="${labelW + 8 + Math.max(w, 4)}" y="${y + barHeight / 2 + 4}" font-family="system-ui,sans-serif" font-size="10" fill="#555">${item.value.toFixed(2)}</text>
    `
  }).join('')

  return `
    <svg viewBox="0 0 ${chartW} ${chartH}" style="width:100%;height:auto;max-width:600px;overflow:visible">
      ${bars}
    </svg>
  `
}

/** SVG donut chart of student classification distribution. */
export function buildClassificationChartSvg(classes: ClassData[], yearFilter: string | null): string {
  const scoped = yearFilter ? classes.filter(c => c.year === yearFilter) : classes
  const cols: ScoreColumnDef[] = []
  for (const c of scoped) {
    const resolved = resolveClassColumns(c)
    resolved.forEach(r => { if (!cols.find(x => x.key === r.key)) cols.push(r) })
  }

  const ranks = ['xs', 'g', 'k', 'tb', 'y']
  const rankLabels: Record<string, string> = { xs: 'XS', g: 'Giỏi', k: 'Khá', tb: 'TB', y: 'Yếu' }
  const rankColors: Record<string, string> = { xs: '#10b981', g: '#3b82f6', k: '#eab308', tb: '#f97316', y: '#ef4444' }
  const counts: Record<string, number> = { xs: 0, g: 0, k: 0, tb: 0, y: 0 }

  for (const c of scoped) {
    for (const s of c.students) {
      const tb = studentYearTB(s, c.weights, resolveClassColumns(c))
      if (tb === null) continue
      const rank = classifyStudent(tb).rank.replace('rank-', '')
      if (counts[rank] !== undefined) counts[rank]++
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  if (!total) return ''

  const cx = 120
  const cy = 100
  const r = 70
  const legendX = 240
  let startAngle = -Math.PI / 2

  const slices: string[] = []
  const legends: string[] = []

  ranks.forEach(key => {
    const count = counts[key] || 0
    if (!count) return
    const pct = (count / total) * 100
    const angle = (count / total) * Math.PI * 2
    const endAngle = startAngle + angle
    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle)
    const y2 = cy + r * Math.sin(endAngle)
    const largeArc = angle > Math.PI ? 1 : 0
    const color = rankColors[key]

    slices.push(`
      <path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${color}" opacity="0.85" />
    `)
    slices.push(`
      <path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="none" stroke="#fff" stroke-width="1.5" />
    `)

    const labelAngle = startAngle + angle / 2
    const lx = cx + (r + 16) * Math.cos(labelAngle)
    const ly = cy + (r + 16) * Math.sin(labelAngle)
    slices.push(`
      <text x="${lx}" y="${ly}" font-family="system-ui,sans-serif" font-size="9" fill="#555" text-anchor="middle">${pct.toFixed(0)}%</text>
    `)

    legends.push(`
      <rect x="${legendX}" y="${20 + legends.length * 22}" width="12" height="12" rx="2" fill="${color}" />
      <text x="${legendX + 18}" y="${20 + legends.length * 22 + 10}" font-family="system-ui,sans-serif" font-size="12" fill="#333">${rankLabels[key]}: ${count} (${pct.toFixed(1)}%)</text>
    `)

    startAngle = endAngle
  })

  return `
    <svg viewBox="0 0 380 200" style="width:100%;height:auto;max-width:400px;overflow:visible">
      ${slices.join('')}
      <text x="${cx}" y="${cy + 4}" font-family="system-ui,sans-serif" font-size="16" font-weight="700" fill="#333" text-anchor="middle">${total}</text>
      <text x="${cx}" y="${cy + 18}" font-family="system-ui,sans-serif" font-size="9" fill="#888" text-anchor="middle">HV</text>
      ${legends.join('')}
    </svg>
  `
}

/** Build a printable HTML report for Ban GL meeting with charts. */
export function buildParishReportHtml(data: ParishDashboardData, classes: ClassData[] = [], parishName = 'Giáo xứ'): string {
  const avg = data.avgTB != null ? formatScore(data.avgTB, 2) : '—'
  const rows = data.rankings.map((c, i) => `
    <tr class="${c.isRed ? 'red' : ''}">
      <td>${i + 1}</td>
      <td>${escapeHtml(c.className)}</td>
      <td>${c.studentCount}</td>
      <td>${c.avgTB != null ? formatScore(c.avgTB, 2) : '—'}</td>
      <td>${c.completePercent}%</td>
      <td>${c.isRed ? 'Cần quan tâm' : 'OK'}</td>
    </tr>
  `).join('')

  const rankingChart = buildRankingChartSvg(data)
  const classChart = buildClassificationChartSvg(classes, data.year)

  const topStudentsHtml = data.topStudents.length ? `
    <h2>🏆 Top học viên xuất sắc</h2>
    <table>
      <thead><tr><th>#</th><th>Họ tên</th><th>Lớp</th><th>TB</th><th>Xếp loại</th></tr></thead>
      <tbody>
        ${data.topStudents.map((s, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(s.name)}</td>
            <td>${escapeHtml(s.className)}</td>
            <td>${formatScore(s.tb, 2)}</td>
            <td>${escapeHtml(s.rank)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : ''

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8"/>
  <title>Báo cáo Ban GL — ${escapeHtml(data.year || '')}</title>
  <style>
    body { font-family: "Segoe UI", system-ui, sans-serif; padding: 24px; color: #111; }
    h1 { font-size: 1.4rem; margin: 0 0 4px; }
    h2 { font-size: 1.1rem; margin: 20px 0 8px; border-top: 2px solid #eee; padding-top: 14px; }
    .meta { color: #555; margin-bottom: 16px; }
    .stats { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
    .stat { border: 1px solid #ddd; padding: 10px 14px; border-radius: 8px; min-width: 100px; }
    .stat b { display: block; font-size: 1.2rem; }
    .chart-section { margin: 16px 0; text-align: center; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 0.9rem; }
    th { background: #f5f5f5; }
    tr.red td { background: #fff1f1; }
    tr:nth-child(even) td { background: #fafafa; }
    tr.red:nth-child(even) td { background: #fff6f6; }
    @media print { body { padding: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <h1>Báo cáo họp Ban Giáo lý — ${escapeHtml(parishName)}</h1>
  <p class="meta">Năm học: <strong>${escapeHtml(data.year || 'Tất cả')}</strong> · Xuất lúc ${new Date().toLocaleString('vi-VN')}</p>
  <div class="stats">
    <div class="stat"><span>Lớp</span><b>${data.classCount}</b></div>
    <div class="stat"><span>Học viên</span><b>${data.studentCount}</b></div>
    <div class="stat"><span>TB cả năm</span><b>${avg}</b></div>
    <div class="stat"><span>% đủ điểm</span><b>${data.completePercent}%</b></div>
    <div class="stat"><span>Lớp đỏ</span><b>${data.redClasses.length}</b></div>
  </div>

  ${rankingChart ? `
    <h2>📊 Biểu đồ xếp hạng TB liên lớp</h2>
    <div class="chart-section">${rankingChart}</div>
  ` : ''}

  ${classChart ? `
    <h2>📊 Phân bố xếp loại học viên</h2>
    <div class="chart-section">${classChart}</div>
  ` : ''}

  <h2>🏅 Bảng xếp hạng liên lớp</h2>
  <table>
    <thead>
      <tr><th scope="col">#</th><th scope="col">Lớp</th><th scope="col">HV</th><th scope="col">TB</th><th scope="col">% đủ điểm</th><th scope="col">Trạng thái</th></tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="6">Chưa có dữ liệu</td></tr>'}</tbody>
  </table>

  ${topStudentsHtml}
</body>
</html>`
}

/** CSV (Excel-friendly) parish ranking export with classification breakdown. */
export function buildParishReportCsv(data: ParishDashboardData, _classes: ClassData[] = []): string {
  const lines: string[] = []
  const bom = '\uFEFF'

  lines.push('#,Lớp,Số HV,TB cả năm,% đủ điểm,Trạng thái,XS,Giỏi,Khá,TB,Yếu')
  data.rankings.forEach((c, i) => {
    const r = c.rankCounts || {}
    lines.push([
      String(i + 1),
      csvCell(c.className),
      String(c.studentCount),
      c.avgTB != null ? c.avgTB.toFixed(2) : '',
      String(c.completePercent),
      c.isRed ? 'Can quan tam' : 'OK',
      String(r.xs || 0),
      String(r.g || 0),
      String(r.k || 0),
      String(r.tb || 0),
      String(r.y || 0)
    ].join(','))
  })

  if (data.topStudents.length) {
    lines.push('')
    lines.push('Top học viên xuất sắc')
    lines.push('#,Họ tên,Lớp,TB,Xếp loại')
    data.topStudents.forEach((s, i) => {
      lines.push([
        String(i + 1),
        csvCell(s.name),
        csvCell(s.className),
        s.tb.toFixed(2),
        csvCell(s.rank)
      ].join(','))
    })
  }

  return bom + lines.join('\n')
}

export function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function printParishReport(data: ParishDashboardData, classes: ClassData[] = [], parishName?: string): void {
  const html = buildParishReportHtml(data, classes, parishName)
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 300)
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function csvCell(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}
