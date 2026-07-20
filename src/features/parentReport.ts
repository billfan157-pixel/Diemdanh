// ============================================================
// Parent read-only report card HTML (Phase 3.4)
// ============================================================

import { ClassData, StudentData, ParentToken } from '../services/storage/StorageAdapter.types'
import { resolveClassColumns } from '../config/columns.ts'
import { studentTB, studentYearTB, classify, colAvg } from '../core/calc.ts'
import { displayName, formatScore, formatRank } from '../config/constants.ts'

export function buildParentReportCardHtml(
  cls: ClassData,
  student: StudentData,
  token: ParentToken
): string {
  const cols = resolveClassColumns(cls)
  const hk1 = studentTB(student, cls.weights, 'hk1', cols)
  const hk2 = studentTB(student, cls.weights, 'hk2', cols)
  const year = studentYearTB(student, cls.weights, cols)
  const yearCls = classify(year)

  const colRows = cols.map(c => {
    const a1 = colAvg(student.scoresByTerm?.hk1?.[c.key])
    const a2 = colAvg(student.scoresByTerm?.hk2?.[c.key])
    return `<tr>
      <td>${escapeHtml(c.label)}</td>
      <td>${formatScore(a1, 1)}</td>
      <td>${formatScore(a2, 1)}</td>
    </tr>`
  }).join('')

  const expires = new Date(token.expiresAt).toLocaleString('vi-VN')

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Phiếu điểm — ${escapeHtml(displayName(student))}</title>
  <style>
    :root { --ink:#1a1a1a; --muted:#666; --line:#e5e5e5; --bg:#faf8f5; --accent:#1d4e3e; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: "Source Serif 4", "Times New Roman", Georgia, serif; background: var(--bg); color: var(--ink); }
    .wrap { max-width: 560px; margin: 0 auto; padding: 28px 20px 48px; }
    .badge { display:inline-block; font-family: system-ui, sans-serif; font-size: 0.7rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--accent); border: 1px solid var(--accent); padding: 4px 8px; margin-bottom: 16px; }
    h1 { font-size: 1.55rem; font-weight: 600; margin: 0 0 6px; line-height: 1.25; }
    .sub { color: var(--muted); margin: 0 0 24px; font-family: system-ui, sans-serif; font-size: 0.9rem; }
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 24px; }
    .pill { background: #fff; border: 1px solid var(--line); padding: 12px; text-align: center; }
    .pill span { display:block; font-family: system-ui, sans-serif; font-size: 0.75rem; color: var(--muted); }
    .pill strong { font-size: 1.35rem; }
    table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid var(--line); }
    th, td { padding: 10px 12px; border-bottom: 1px solid var(--line); text-align: left; font-size: 0.95rem; }
    th { font-family: system-ui, sans-serif; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); background: #f3f1ed; }
    .note { margin-top: 20px; font-family: system-ui, sans-serif; font-size: 0.8rem; color: var(--muted); line-height: 1.5; }
    .ro { margin-top: 12px; padding: 10px 12px; background: #eef6f2; border-left: 3px solid var(--accent); font-family: system-ui, sans-serif; font-size: 0.85rem; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="badge">Phiếu điểm · Chỉ xem</div>
    <h1>${escapeHtml(displayName(student))}</h1>
    <p class="sub">${escapeHtml(cls.name)}${cls.year ? ` · ${escapeHtml(cls.year)}` : ''}</p>
    <div class="summary">
      <div class="pill"><span>HK1</span><strong>${formatScore(hk1, 2)}</strong></div>
      <div class="pill"><span>HK2</span><strong>${formatScore(hk2, 2)}</strong></div>
      <div class="pill"><span>Cả năm · ${escapeHtml(formatRank(yearCls.rank.replace('rank-', '')))}</span><strong>${formatScore(year, 2)}</strong></div>
    </div>
    <table>
      <thead><tr><th>Cột điểm</th><th>HK1</th><th>HK2</th></tr></thead>
      <tbody>${colRows}</tbody>
    </table>
    <div class="ro">Đây là phiếu xem điểm dành cho phụ huynh. Không thể sửa điểm từ liên kết này.</div>
    <p class="note">Link hết hạn: ${escapeHtml(expires)}</p>
  </div>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function parentReportUrl(token: string): string {
  const base = `${location.origin}${location.pathname}`
  return `${base}#/ph/${encodeURIComponent(token)}`
}

export function parseParentTokenFromHash(hash = location.hash): string | null {
  const m = hash.match(/^#\/ph\/([^/?#]+)/)
  return m ? decodeURIComponent(m[1]) : null
}
