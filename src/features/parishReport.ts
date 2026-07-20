// ============================================================
// Parish / Ban GL report helpers (Phase 3.3)
// ============================================================

import { ClassData } from '../services/storage/StorageAdapter.types'
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

/** Build a printable HTML report for Ban GL meeting. */
export function buildParishReportHtml(data: ParishDashboardData, parishName = 'Giáo xứ'): string {
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

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8"/>
  <title>Báo cáo Ban GL — ${escapeHtml(data.year || '')}</title>
  <style>
    body { font-family: "Segoe UI", system-ui, sans-serif; padding: 24px; color: #111; }
    h1 { font-size: 1.4rem; margin: 0 0 4px; }
    .meta { color: #555; margin-bottom: 16px; }
    .stats { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
    .stat { border: 1px solid #ddd; padding: 10px 14px; border-radius: 8px; min-width: 100px; }
    .stat b { display: block; font-size: 1.2rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 0.9rem; }
    th { background: #f5f5f5; }
    tr.red td { background: #fff1f1; }
    @media print { body { padding: 0; } }
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
  <h2>Bảng xếp hạng liên lớp</h2>
  <table>
    <thead>
      <tr><th>#</th><th>Lớp</th><th>HV</th><th>TB</th><th>% đủ điểm</th><th>Trạng thái</th></tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="6">Chưa có dữ liệu</td></tr>'}</tbody>
  </table>
</body>
</html>`
}

/** CSV (Excel-friendly) parish ranking export. */
export function buildParishReportCsv(data: ParishDashboardData): string {
  const lines = [
    ['#', 'Lớp', 'Số HV', 'TB cả năm', '% đủ điểm', 'Trạng thái'].join(',')
  ]
  data.rankings.forEach((c, i) => {
    lines.push([
      String(i + 1),
      csvCell(c.className),
      String(c.studentCount),
      c.avgTB != null ? c.avgTB.toFixed(2) : '',
      String(c.completePercent),
      c.isRed ? 'Can quan tam' : 'OK'
    ].join(','))
  })
  return '\uFEFF' + lines.join('\n')
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

export function printParishReport(data: ParishDashboardData, parishName?: string): void {
  const html = buildParishReportHtml(data, parishName)
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
