// ============================================================
// Sổ Điểm GL — Excel Import Service
// Read .xlsx files and map to student scores
// ============================================================

import * as XLSX from 'xlsx'
import {
  type ScoreColumnDef,
  resolveClassColumns,
  ensureScoresMatchColumns,
} from '../../config/columns.ts'
import { parseScore } from '../../config/constants.ts'
import { type ClassData, type StudentData } from '../storage/StorageAdapter.types'
import { generateId } from '../../utils/id.ts'

export interface ImportedRow {
  tenThanh: string
  hoDem: string
  ten: string
  scores: Record<string, number[]>
  ghiChu?: string
  lop?: string
}

export interface StudentListRow {
  tenThanh: string
  hoDem: string
  ten: string
  lop?: string
  maHV?: string
  ghiChu?: string
}

export interface StudentListResult {
  rows: StudentListRow[]
  detectedClasses: string[]
  errors: string[]
  totalRows: number
  validRows: number
}

export interface ExcelImportResult {
  ok: boolean
  rows: ImportedRow[]
  errors: string[]
  totalRows: number
  validRows: number
  term: 'hk1' | 'hk2'
  matchedCols: Array<{ excelLabel: string; mappedTo: string }>
  unmatchedCols: string[]
}

/**
 * Read and parse an Excel file (.xlsx or .xls)
 */
export async function readExcelFile(file: File): Promise<{ sheets: Record<string, any[][]>; errors: string[] }> {
  const errors: string[] = []

  try {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })

    const sheets: Record<string, any[][]> = {}
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
      if (data.length > 0) {
        sheets[sheetName] = data
      }
    }

    return { sheets, errors }
  } catch (e: any) {
    errors.push(`Không thể đọc file: ${e.message || e}`)
    return { sheets: {}, errors }
  }
}

/**
 * Try to detect the term from sheet name or content.
 */
export function detectTerm(sheetName: string): 'hk1' | 'hk2' | null {
  const lower = sheetName.toLowerCase()
  if (lower.includes('hk1') || lower.includes('học kỳ 1') || lower.includes('ki 1') || lower.includes('kỳ 1')) return 'hk1'
  if (lower.includes('hk2') || lower.includes('học kỳ 2') || lower.includes('ki 2') || lower.includes('kỳ 2')) return 'hk2'
  return null
}

/**
 * Normalize header label for matching.
 */
function normalizeLabel(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .toLowerCase()
}

/**
 * Match Excel column headers to class ScoreColumnDef labels.
 */
function matchColumns(
  headers: string[],
  classCols: ScoreColumnDef[]
): { matchedCols: Array<{ excelLabel: string; mappedTo: string }>; unmatchedCols: string[]; colIndexMap: Map<number, string> } {
  const matchedCols: Array<{ excelLabel: string; mappedTo: string }> = []
  const unmatchedCols: string[] = []
  const colIndexMap = new Map<number, string>()

  // Build lookup: normalized label → column key
  const colLookup = new Map<string, string>()
  for (const col of classCols) {
    colLookup.set(normalizeLabel(col.label), col.key)
    colLookup.set(normalizeLabel(col.short), col.key)
    colLookup.set(normalizeLabel(col.key), col.key)
  }

  // Also add common Vietnamese aliases
  const aliasMap: Record<string, string> = {
    'ten thanh': 'tenThanh',
    'tên thánh': 'tenThanh',
    'ho dem': 'hoDem',
    'họ đệm': 'hoDem',
    'ho lot': 'hoDem',
    'họ lót': 'hoDem',
    'ten': 'ten',
    'tên': 'ten',
    'ho ten': 'ten',
    'họ tên': 'ten',
    'name': 'ten',
    'ghi chu': 'ghiChu',
    'ghi chú': 'ghiChu',
    'note': 'ghiChu',
    'ma hv': 'maHV',
    'mã hv': 'maHV',
    'ma hoc vien': 'maHV',
    'mã học viên': 'maHV',
    stt: 'stt',
    'so thu tu': 'stt',
    'số thứ tự': 'stt',
    lop: 'lop',
    lớp: 'lop',
    'ten lop': 'lop',
    'tên lớp': 'lop',
    class: 'lop',
  }

  for (let i = 0; i < headers.length; i++) {
    const raw = String(headers[i] || '').trim()
    if (!raw) continue

    const normal = normalizeLabel(raw)

    // Check if it's a student info column
    if (normal === 'stt' || normal === 'sothutu' || normal === 'so thu tu' || normal === 'số thứ tự' || normal === '#') {
      continue // skip STT
    }

    const mappedByAlias = aliasMap[normal]
    if (mappedByAlias === 'tenThanh' || mappedByAlias === 'hoDem' || mappedByAlias === 'ten' || mappedByAlias === 'ghiChu' || mappedByAlias === 'maHV' || mappedByAlias === 'lop') {
      continue // skip info columns, handled separately
    }

    // Try to match to a score column
    const matchedKey = colLookup.get(normal)
    if (matchedKey) {
      colIndexMap.set(i, matchedKey)
      matchedCols.push({ excelLabel: raw, mappedTo: matchedKey })
    } else {
      // Check if it could be a score column by normalized matching against label parts
      let found = false
      for (const col of classCols) {
        if (
          normalizeLabel(raw).includes(normalizeLabel(col.label)) ||
          normalizeLabel(col.label).includes(normalizeLabel(raw)) ||
          normalizeLabel(raw).includes(normalizeLabel(col.short)) ||
          normalizeLabel(col.short).includes(normalizeLabel(raw))
        ) {
          if (!colIndexMap.has(i)) {
            colIndexMap.set(i, col.key)
            matchedCols.push({ excelLabel: raw, mappedTo: col.key })
            found = true
            break
          }
        }
      }
      if (!found) {
        unmatchedCols.push(raw)
      }
    }
  }

  return { matchedCols, unmatchedCols, colIndexMap }
}

/**
 * Detect student info columns from headers.
 */
function detectInfoColumns(headers: string[]): {
  tenThanhIdx: number
  hoDemIdx: number
  tenIdx: number
  ghiChuIdx: number
  maHVIdx: number
  lopIdx: number
} {
  const result = { tenThanhIdx: -1, hoDemIdx: -1, tenIdx: -1, ghiChuIdx: -1, maHVIdx: -1, lopIdx: -1 }

  for (let i = 0; i < headers.length; i++) {
    const raw = String(headers[i] || '').trim().toLowerCase()
    const normal = normalizeLabel(raw)

    if (normal.includes('ten thanh') || normal.includes('tên thánh') || normal === 'ten thanh' || normal === 'tên thánh') {
      result.tenThanhIdx = i
    } else if (normal.includes('ho dem') || normal.includes('họ đệm') || normal.includes('ho lot') || normal.includes('họ lót')) {
      result.hoDemIdx = i
    } else if (normal === 'ten' || normal === 'tên' || normal === 'name' || normal === 'ho ten' || normal === 'họ tên') {
      // Prefer the simple 'tên' over 'họ tên' if both exist
      if (result.tenIdx === -1 || normal === 'ten' || normal === 'tên') {
        result.tenIdx = i
      }
    } else if (normal.includes('ghi chu') || normal.includes('ghi chú') || normal === 'note' || normal.includes('ghichu')) {
      result.ghiChuIdx = i
    } else if (normal.includes('ma hv') || normal.includes('ma_hv') || normal.includes('mã hv') || normal.includes('mã học viên') || normal.includes('mahocvien')) {
      result.maHVIdx = i
    } else if (normal === 'lop' || normal === 'lớp' || normal === 'class' || normal.includes('ten lop') || normal.includes('tên lớp') || normal.includes('lớp học')) {
      result.lopIdx = i
    }
  }

  // Fallback: if no separate họ đệm and tên, try to use a combined "họ tên" column
  if (result.hoDemIdx === -1 && result.tenIdx === -1) {
    for (let i = 0; i < headers.length; i++) {
      const raw = String(headers[i] || '').trim().toLowerCase()
      if (normalizeLabel(raw).includes('ho ten') || normalizeLabel(raw).includes('họ tên') || normalizeLabel(raw).includes('hovaten')) {
        result.hoDemIdx = i
        result.tenIdx = i
        break
      }
    }
  }

  return result
}

/**
 * Parse a row of data into an ImportedRow.
 */
function parseRow(
  row: any[],
  colIndexMap: Map<number, string>,
  infoCols: { tenThanhIdx: number; hoDemIdx: number; tenIdx: number; ghiChuIdx: number; maHVIdx: number; lopIdx: number },
  _term: 'hk1' | 'hk2',
  classCols: ScoreColumnDef[]
): ImportedRow | null {
  // Extract name parts
  let tenThanh = ''
  let hoDem = ''
  let ten = ''
  let ghiChu = ''
  let lop = ''

  if (infoCols.tenThanhIdx >= 0 && infoCols.tenThanhIdx < row.length) {
    tenThanh = String(row[infoCols.tenThanhIdx] || '').trim()
  }
  if (infoCols.hoDemIdx >= 0 && infoCols.hoDemIdx < row.length) {
    hoDem = String(row[infoCols.hoDemIdx] || '').trim()
  }
  if (infoCols.tenIdx >= 0 && infoCols.tenIdx < row.length) {
    ten = String(row[infoCols.tenIdx] || '').trim()
  }
  if (infoCols.ghiChuIdx >= 0 && infoCols.ghiChuIdx < row.length) {
    ghiChu = String(row[infoCols.ghiChuIdx] || '').trim()
  }
  if (infoCols.lopIdx >= 0 && infoCols.lopIdx < row.length) {
    lop = String(row[infoCols.lopIdx] || '').trim()
  }

  // Must have at least a first name or some name
  if (!ten && !hoDem && !tenThanh) return null

  // Parse scores
  const scores: Record<string, number[]> = {}
  for (const col of classCols) {
    scores[col.key] = []
  }

  for (const [colIdx, colKey] of colIndexMap.entries()) {
    if (colIdx < row.length) {
      const rawVal = row[colIdx]
      if (rawVal !== '' && rawVal !== null && rawVal !== undefined) {
        const parsed = parseExcelCell(rawVal)
        if (parsed !== null) {
          scores[colKey] = [parsed]
        }
      }
    }
  }

  return { tenThanh, hoDem, ten, scores, ghiChu, lop }
}

/**
 * Parse a single cell value to a number score.
 */
function parseExcelCell(value: any): number | null {
  if (value === '' || value === null || value === undefined) return null

  // If it's already a number
  if (typeof value === 'number' && !isNaN(value)) {
    const rounded = Math.round(value * 100) / 100
    return rounded >= 0 && rounded <= 10 ? rounded : null
  }

  // If it's a string like "8.5" or "8,5"
  const str = String(value).trim()
  return parseScore(str)
}

/**
 * Parse the entire sheet as a student list (no class context needed).
 * Detects columns, extracts student info + class info.
 */
export function parseStudentList(rows: any[][]): StudentListResult {
  const errors: string[] = []

  if (rows.length < 2) {
    return { rows: [], detectedClasses: [], errors: ['File không có dữ liệu'], totalRows: 0, validRows: 0 }
  }

  const headers = rows[0].map((h: any) => String(h || '').trim())
  const infoCols = detectInfoColumns(headers)

  if (infoCols.tenThanhIdx === -1 && infoCols.hoDemIdx === -1 && infoCols.tenIdx === -1) {
    errors.push('Không tìm thấy cột tên học viên.')
    return { rows: [], detectedClasses: [], errors, totalRows: 0, validRows: 0 }
  }

  const studentRows: StudentListRow[] = []
  const classSet = new Set<string>()
  let validRows = 0
  const totalRows = rows.length - 1

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.every((cell: any) => cell === '' || cell === null || cell === undefined)) continue

    let tenThanh = '', hoDem = '', ten = '', lop = '', maHV = '', ghiChu = ''

    if (infoCols.tenThanhIdx >= 0 && infoCols.tenThanhIdx < row.length) tenThanh = String(row[infoCols.tenThanhIdx] || '').trim()
    if (infoCols.hoDemIdx >= 0 && infoCols.hoDemIdx < row.length) hoDem = String(row[infoCols.hoDemIdx] || '').trim()
    if (infoCols.tenIdx >= 0 && infoCols.tenIdx < row.length) ten = String(row[infoCols.tenIdx] || '').trim()
    if (infoCols.lopIdx >= 0 && infoCols.lopIdx < row.length) lop = String(row[infoCols.lopIdx] || '').trim()
    if (infoCols.maHVIdx >= 0 && infoCols.maHVIdx < row.length) maHV = String(row[infoCols.maHVIdx] || '').trim()
    if (infoCols.ghiChuIdx >= 0 && infoCols.ghiChuIdx < row.length) ghiChu = String(row[infoCols.ghiChuIdx] || '').trim()

    if (!ten && !hoDem && !tenThanh) {
      errors.push(`Dòng ${i + 1}: Thiếu tên học viên, bỏ qua.`)
      continue
    }

    studentRows.push({ tenThanh, hoDem, ten, lop: lop || undefined, maHV: maHV || undefined, ghiChu: ghiChu || undefined })
    if (lop) classSet.add(lop)
    validRows++
  }

  return {
    rows: studentRows,
    detectedClasses: [...classSet].sort(),
    errors,
    totalRows,
    validRows
  }
}

/**
 * Parse the entire sheet and return structured data.
 */
export function parseExcelSheet(
  _sheetName: string,
  rows: any[][],
  cls: ClassData,
  term: 'hk1' | 'hk2'
): ExcelImportResult {
  const errors: string[] = []
  const classCols = resolveClassColumns(cls)

  if (rows.length < 2) {
    return { ok: false, rows: [], errors: ['File Excel không có dữ liệu (cần ít nhất 1 dòng header + 1 dòng dữ liệu)'], totalRows: 0, validRows: 0, term, matchedCols: [], unmatchedCols: [] }
  }

  const headers = rows[0].map((h: any) => String(h || '').trim())

  // Match columns
  const { matchedCols, unmatchedCols, colIndexMap } = matchColumns(headers, classCols)
  const infoCols = detectInfoColumns(headers)

  if (colIndexMap.size === 0 && infoCols.tenThanhIdx === -1 && infoCols.hoDemIdx === -1 && infoCols.tenIdx === -1) {
    errors.push('Không tìm thấy cột tên học viên hoặc cột điểm nào khớp với lớp hiện tại.')
    return { ok: false, rows: [], errors, totalRows: 0, validRows: 0, term, matchedCols, unmatchedCols }
  }

  // Parse data rows (skip header row)
  const importedRows: ImportedRow[] = []
  let validRows = 0
  const totalRows = rows.length - 1

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    // Skip empty rows
    if (!row || row.every((cell: any) => cell === '' || cell === null || cell === undefined)) continue

    const parsed = parseRow(row, colIndexMap, infoCols, term, classCols)
    if (parsed) {
      importedRows.push(parsed)
      validRows++
    } else {
      errors.push(`Dòng ${i + 1}: Thiếu tên học viên, bỏ qua.`)
    }
  }

  return {
    ok: validRows > 0,
    rows: importedRows,
    errors,
    totalRows,
    validRows,
    term,
    matchedCols,
    unmatchedCols
  }
}

/**
 * Convert imported rows into StudentData and apply to a class.
 * Returns the updated students array.
 */
export function applyImportedRows(
  cls: ClassData,
  rows: ImportedRow[],
  term: 'hk1' | 'hk2',
  options: { overwrite?: boolean; append?: boolean } = {}
): StudentData[] {
  const classCols = resolveClassColumns(cls)
  const { overwrite = false, append = true } = options

  // Build a map of existing students by name for matching
  const existingByName = new Map<string, StudentData>()
  for (const st of cls.students) {
    const key = [st.tenThanh, st.hoDem, st.ten].filter(Boolean).join('|').toLowerCase()
    existingByName.set(key, st)
    // Also index without tenThanh
    const key2 = [st.hoDem, st.ten].filter(Boolean).join('|').toLowerCase()
    if (!existingByName.has(key2)) {
      existingByName.set(key2, st)
    }
  }

  const result: StudentData[] = [...cls.students]

  for (const row of rows) {
    const nameKey = [row.tenThanh, row.hoDem, row.ten].filter(Boolean).join('|').toLowerCase()
    const nameKey2 = [row.hoDem, row.ten].filter(Boolean).join('|').toLowerCase()
    const existing = existingByName.get(nameKey) || existingByName.get(nameKey2)

    if (existing) {
      // Update existing student
      const idx = result.findIndex(s => s.id === existing.id)
      if (idx >= 0) {
        const st = result[idx]
        const currentScores = st.scoresByTerm[term]

        for (const col of classCols) {
          const importedScores = row.scores[col.key]
          if (importedScores && importedScores.length > 0) {
            if (overwrite) {
              // Replace all scores for this column
              st.scoresByTerm[term][col.key] = [...importedScores]
            } else if (append) {
              // Append scores that don't already exist
              const existingVals = new Set(currentScores[col.key] || [])
              for (const s of importedScores) {
                if (!existingVals.has(s)) {
                  st.scoresByTerm[term][col.key].push(s)
                  existingVals.add(s)
                }
              }
            }
          }
        }

        // Update ghiChu only if imported row has it and existing doesn't
        if (row.ghiChu && !st.ghiChu) {
          st.ghiChu = row.ghiChu
        }

        st.updatedAt = Date.now()
      }
    } else {
      // Create new student
      const newStudent: StudentData = {
        id: generateId('st'),
        tenThanh: row.tenThanh,
        hoDem: row.hoDem,
        ten: row.ten,
        name: '',
        maHV: '',
        ngaySinh: '',
        gioiTinh: '',
        tenPhuHuynh: '',
        sdPhuHuynh: '',
        diaChi: '',
        email: '',
        ghiChu: row.ghiChu || '',
        scoresByTerm: {
          hk1: ensureScoresMatchColumns(term === 'hk1' ? row.scores : undefined, classCols),
          hk2: ensureScoresMatchColumns(term === 'hk2' ? row.scores : undefined, classCols)
        },
        learningLog: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      result.push(newStudent)
    }
  }

  return result
}

