export function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

export function fmt(n: number | null, decimals = 2): string {
  if (n == null || isNaN(n)) return '—'
  return n.toFixed(decimals)
}

export function tbBarFill(filledCols: number, totalCols: number): number {
  return Math.round((filledCols / Math.max(1, totalCols)) * 100)
}

export function scoreClass(tb: number | null): string {
  if (tb == null) return 'score-none'
  if (tb >= 9) return 'score-xs'
  if (tb >= 8) return 'score-g'
  if (tb >= 6.5) return 'score-k'
  if (tb >= 5) return 'score-tb'
  return 'score-y'
}

/** RFC 4180 CSV parser — returns array of row arrays (skips BOM, handles quoted fields) */
export function parseCSV(text: string): string[][] {
  const lines: string[][] = []
  let current: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0
  if (text.charCodeAt(0) === 0xFEFF) i = 1
  while (i < text.length) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
      } else {
        field += ch
      }
      i++
    } else {
      if (ch === '"') {
        inQuotes = true
        i++
      } else if (ch === ',') {
        current.push(field)
        field = ''
        i++
      } else if (ch === '\n') {
        current.push(field)
        if (current.length > 1 || current[0] !== '') lines.push(current)
        current = []
        field = ''
        i++
      } else if (ch === '\r') {
        current.push(field)
        if (current.length > 1 || current[0] !== '') lines.push(current)
        current = []
        field = ''
        i++
        if (i < text.length && text[i] === '\n') i++
      } else {
        field += ch
        i++
      }
    }
  }
  if (field || current.length) {
    current.push(field)
    if (current.length > 1 || current[0] !== '') lines.push(current)
  }
  return lines
}

