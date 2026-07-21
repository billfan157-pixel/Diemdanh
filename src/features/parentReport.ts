// ============================================================
// Parent read-only report card HTML & SVG Chart (Phase 3)
// ============================================================

import { ClassData, StudentData, ParentToken } from '../services/storage/StorageAdapter.types'
import { resolveClassColumns } from '../config/columns.ts'
import { studentTB, studentYearTB, classify, colAvg } from '../core/calc.ts'
import { formatScore, formatRank } from '../config/constants.ts'

export function buildProgressionChartSvg(cls: ClassData, student: StudentData): string {
  const cols = resolveClassColumns(cls)
  if (!cols.length) return ''

  const width = 480
  const height = 220
  const padLeft = 40
  const padRight = 20
  const padTop = 25
  const padBottom = 30

  const chartW = width - padLeft - padRight
  const chartH = height - padTop - padBottom

  const getX = (i: number) => {
    if (cols.length <= 1) return padLeft + chartW / 2
    return padLeft + i * (chartW / (cols.length - 1))
  }

  const getY = (val: number) => {
    return padTop + (10 - val) * (chartH / 10)
  }

  // Grid lines Y (10, 8, 6, 4, 2, 0)
  let gridY = ''
  for (let s = 0; s <= 10; s += 2) {
    const y = getY(s)
    gridY += `
      <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="var(--border-color)" stroke-width="1" stroke-dasharray="3,3" opacity="0.5" />
      <text x="${padLeft - 10}" y="${y + 4}" font-family="system-ui,sans-serif" font-size="10" fill="var(--text-muted)" text-anchor="end">${s}</text>
    `
  }

  // Grid columns & Labels X
  let gridX = ''
  cols.forEach((col, i) => {
    const x = getX(i)
    gridX += `
      <line x1="${x}" y1="${padTop}" x2="${x}" y2="${height - padBottom}" stroke="var(--border-color)" stroke-width="1" stroke-dasharray="3,3" opacity="0.3" />
      <text x="${x}" y="${height - padBottom + 18}" font-family="system-ui,sans-serif" font-size="9" fill="var(--text-muted)" text-anchor="middle">${escapeHtml(col.short)}</text>
    `
  })

  // Helper to calculate averages and collect points
  const getTermPoints = (term: 'hk1' | 'hk2') => {
    const pts: Array<{ x: number; y: number; val: number }> = []
    cols.forEach((col, i) => {
      const scores = student.scoresByTerm?.[term]?.[col.key] || []
      if (scores.length > 0) {
        const sum = scores.reduce((a, b) => a + b, 0)
        const avg = sum / scores.length
        pts.push({ x: getX(i), y: getY(avg), val: avg })
      }
    })
    return pts
  }

  const pts1 = getTermPoints('hk1')
  const pts2 = getTermPoints('hk2')

  const drawPath = (pts: typeof pts1, stroke: string) => {
    if (pts.length === 0) return ''
    let d = `M ${pts[0].x} ${pts[0].y}`
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${pts[i].x} ${pts[i].y}`
    }

    const line = `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />`
    
    const circles = pts.map(p => `
      <circle cx="${p.x}" cy="${p.y}" r="4.5" fill="${stroke}" stroke="var(--card-bg)" stroke-width="1.8" />
      <rect x="${p.x - 14}" y="${p.y - 19}" width="28" height="13" rx="3" fill="${stroke}" opacity="0.15" />
      <text x="${p.x}" y="${p.y - 9}" font-family="system-ui,sans-serif" font-size="9" font-weight="700" fill="${stroke}" text-anchor="middle">${p.val.toFixed(1)}</text>
    `).join('')

    return line + circles
  }

  const path1 = drawPath(pts1, '#2563eb')
  const path2 = drawPath(pts2, '#10b981')

  return `
    <svg viewBox="0 0 ${width} ${height}" class="progression-svg" style="width:100%;height:auto;overflow:visible">
      ${gridY}
      ${gridX}
      ${path1}
      ${path2}
    </svg>
  `
}

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
  const rankKey = yearCls.rank.replace('rank-', '')

  const colRows = cols.map(c => {
    const a1 = colAvg(student.scoresByTerm?.hk1?.[c.key])
    const a2 = colAvg(student.scoresByTerm?.hk2?.[c.key])
    return `
      <tr>
        <td class="col-name-cell"><strong>${escapeHtml(c.label)}</strong><small>Hệ số ×${cls.weights[c.key] || 1}</small></td>
        <td class="score-cell">${formatScore(a1, 1)}</td>
        <td class="score-cell">${formatScore(a2, 1)}</td>
      </tr>
    `
  }).join('')

  const expires = new Date(token.expiresAt).toLocaleDateString('vi-VN', {
    day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
  const chartSvg = buildProgressionChartSvg(cls, student)

  const tenThanh = String(student.tenThanh || '').trim()
  const hoTenParts = [student.hoDem, student.ten].filter(Boolean).join(' ')
  const fallbackName = (!tenThanh && !hoTenParts && student.name) ? String(student.name).trim() : ''

  return `
    <div class="parent-report-card">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        
        :root {
          --bg-color: #f8fafc;
          --card-bg: #ffffff;
          --text-main: #0f172a;
          --text-muted: #64748b;
          --border-color: #e2e8f0;
          --primary: #2563eb;
          --success: #10b981;
          --warning: #f59e0b;
          --danger: #ef4444;
          --accent-bg: #eef2ff;
          --card-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.04), 0 4px 6px -4px rgb(0 0 0 / 0.04);
        }
        
        @media (prefers-color-scheme: dark) {
          :root {
            --bg-color: #0f172a;
            --card-bg: #1e293b;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --border-color: #334155;
            --primary: #3b82f6;
            --accent-bg: #1e1b4b;
            --card-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.2);
          }
        }
        
        .parent-report-card {
          min-height: 100vh;
          background: var(--bg-color);
          color: var(--text-main);
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          padding: 32px 16px 64px;
          display: flex;
          justify-content: center;
          box-sizing: border-box;
        }

        .card-wrap {
          width: 100%;
          max-width: 540px;
        }

        .crest-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 24px;
        }

        .crest-icon {
          font-size: 1.8rem;
          color: var(--primary);
        }

        .crest-title {
          font-family: 'Outfit', sans-serif;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin: 0;
        }

        .student-hero {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          box-shadow: var(--card-shadow);
          margin-bottom: 20px;
          position: relative;
          overflow: hidden;
        }

        .hero-badge {
          display: inline-block;
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--primary);
          background: var(--accent-bg);
          padding: 6px 12px;
          border-radius: 99px;
          margin-bottom: 12px;
        }

        .student-name {
          font-size: 1.6rem;
          font-weight: 700;
          margin: 0 0 6px;
          color: var(--text-main);
        }

        .student-class {
          font-size: 0.88rem;
          color: var(--text-muted);
          margin: 0;
        }

        .score-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }

        .score-pill {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 14px 8px;
          text-align: center;
          box-shadow: var(--card-shadow);
        }

        .score-pill span {
          display: block;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          margin-bottom: 4px;
        }

        .score-pill strong {
          display: block;
          font-size: 1.35rem;
          font-weight: 700;
        }

        .score-pill.primary strong { color: var(--primary); }
        .score-pill.success strong { color: var(--success); }
        .score-pill.highlight {
          border-color: var(--primary);
          background: var(--accent-bg);
        }

        .score-pill.highlight strong {
          font-size: 1.55rem;
        }

        .rank-lbl {
          font-size: 0.68rem;
          font-weight: 700;
          margin-top: 2px;
          display: inline-block;
          padding: 1px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .rank-lbl.xs { background: #dcfce7; color: #15803d; }
        .rank-lbl.g { background: #dbeafe; color: #1d4ed8; }
        .rank-lbl.k { background: #fef9c3; color: #a16207; }
        .rank-lbl.tb { background: #ffedd5; color: #c2410c; }
        .rank-lbl.y { background: #fee2e2; color: #b91c1c; }

        .section-box {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 20px;
          box-shadow: var(--card-shadow);
          margin-bottom: 20px;
        }

        .section-box h3 {
          font-size: 0.95rem;
          font-weight: 700;
          margin: 0 0 16px;
          color: var(--text-main);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .chart-legend {
          display: flex;
          justify-content: center;
          gap: 16px;
          font-size: 0.75rem;
          font-weight: 500;
          margin-top: 10px;
          color: var(--text-muted);
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 99px;
        }
        .legend-dot.hk1 { background: #2563eb; }
        .legend-dot.hk2 { background: #10b981; }

        table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }

        th, td {
          padding: 12px;
          border-bottom: 1px solid var(--border-color);
          text-align: left;
        }

        th {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
        }

        td {
          font-size: 0.88rem;
        }

        tr:last-child td {
          border-bottom: none;
        }

        .col-name-cell strong {
          display: block;
          color: var(--text-main);
        }
        .col-name-cell small {
          display: block;
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        .score-cell {
          font-weight: 600;
          text-align: center;
        }

        .footer-note {
          text-align: center;
          font-size: 0.75rem;
          color: var(--text-muted);
          line-height: 1.5;
          margin-top: 24px;
          padding: 0 16px;
        }

        .print-btn-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }

        .btn-print {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-main);
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-print:hover {
          background: var(--border-color);
        }

        /* Printable area styles */
        @media print {
          body {
            background: #fff !important;
            color: #000 !important;
          }
          .parent-report-card {
            padding: 0 !important;
            background: none !important;
          }
          .btn-print {
            display: none !important;
          }
          .student-hero, .score-pill, .section-box {
            box-shadow: none !important;
            border-color: #ccc !important;
          }
        }
      </style>
      
      <div class="card-wrap">
        <div class="print-btn-wrap">
          <button type="button" class="btn-print" id="btnParentPrint">🖨️ Bản in / Xuất PDF</button>
        </div>

        <div class="crest-header">
          <span class="crest-icon">✝</span>
          <h2 class="crest-title">GIÁO XỨ TRẢNG BOM · BAN GIÁO LÝ</h2>
        </div>

        <div class="student-hero">
          <span class="hero-badge">Phiếu điểm học viên</span>
          <h1 class="student-name">
            ${tenThanh ? `<span class="se-ten-thanh" style="font-size:1.1rem;display:block;font-weight:400;color:var(--text-muted)">${escapeHtml(tenThanh)}</span>` : ''}
            ${hoTenParts ? `<span class="se-ho-ten block">${escapeHtml(hoTenParts)}</span>` : ''}
            ${fallbackName ? `<span class="se-ho-ten block">${escapeHtml(fallbackName)}</span>` : ''}
          </h1>
          <p class="student-class">${escapeHtml(cls.name)}${cls.year ? ` · Năm học ${escapeHtml(cls.year)}` : ''}</p>
        </div>

        <div class="score-row">
          <div class="score-pill primary">
            <span>Học Kỳ 1</span>
            <strong>${formatScore(hk1, 2)}</strong>
          </div>
          <div class="score-pill success">
            <span>Học Kỳ 2</span>
            <strong>${formatScore(hk2, 2)}</strong>
          </div>
          <div class="score-pill highlight">
            <span>Cả Năm</span>
            <strong>${formatScore(year, 2)}</strong>
            <span class="rank-lbl ${rankKey}">${escapeHtml(formatRank(rankKey))}</span>
          </div>
        </div>

        ${chartSvg ? `
          <div class="section-box">
            <h3>📈 Tiến trình học tập</h3>
            ${chartSvg}
            <div class="chart-legend">
              <div class="legend-item"><span class="legend-dot hk1"></span>Học kỳ 1</div>
              <div class="legend-item"><span class="legend-dot hk2"></span>Học kỳ 2</div>
            </div>
          </div>
        ` : ''}

        <div class="section-box">
          <h3>📊 Điểm số chi tiết</h3>
          <table>
            <thead>
              <tr>
                <th scope="col" class="text-left">Cột Điểm</th>
                <th scope="col" class="text-center" style="width:80px">HK1</th>
                <th scope="col" class="text-center" style="width:80px">HK2</th>
              </tr>
            </thead>
            <tbody>
              ${colRows}
            </tbody>
          </table>
        </div>

        <div class="footer-note">
          <p>Phiếu điểm điện tử chỉ hiển thị dưới dạng chỉ đọc.</p>
          <p style="font-size:0.7rem;margin-top:6px">Liên kết hết hạn: ${escapeHtml(expires)}</p>
        </div>
      </div>
    </div>
  `
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
