import { ScoreColumnDef } from '../services/storage/StorageAdapter.types'

const STORAGE_KEY = 'gl-column-presets'

export interface ColumnPreset {
  name: string
  columns: ScoreColumnDef[]
}

export function saveColumnPreset(name: string, columns: ScoreColumnDef[]): void {
  const presets = loadColumnPresets()
  const idx = presets.findIndex(p => p.name === name)
  const entry: ColumnPreset = { name, columns: columns.map(c => ({ ...c })) }
  if (idx >= 0) {
    presets[idx] = entry
  } else {
    presets.push(entry)
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
  } catch {}
}

export function loadColumnPresets(): ColumnPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return getBuiltinPresets()
    const parsed: ColumnPreset[] = JSON.parse(raw)
    const builtin = getBuiltinPresets()
    for (const b of builtin) {
      if (!parsed.find(p => p.name === b.name)) {
        parsed.unshift(b)
      }
    }
    return parsed
  } catch {
    return getBuiltinPresets()
  }
}

export function deleteColumnPreset(name: string): void {
  const builtinNames = getBuiltinPresets().map(p => p.name)
  if (builtinNames.includes(name)) return
  const presets = loadColumnPresets().filter(p => p.name !== name)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
  } catch {}
}

function getBuiltinPresets(): ColumnPreset[] {
  return [
    {
      name: 'Mặc định (Giáo lý)',
      columns: [
        { key: 'khaoKinh', short: 'KK', label: 'Khảo kinh', defaultWeight: 1 },
        { key: 'thuocBai', short: 'TB', label: 'Thuộc bài', defaultWeight: 1 },
        { key: 'chuyenCan', short: 'CC', label: 'Chuyên cần', defaultWeight: 1 },
        { key: 'baiTap', short: 'BT', label: 'Bài tập', defaultWeight: 1 },
        { key: 'thaiDo', short: 'TĐ', label: 'Thái độ', defaultWeight: 1 },
        { key: 'kiemTra', short: 'KT', label: 'Kiểm tra', defaultWeight: 1 }
      ]
    },
    {
      name: 'Cổ điển (ĐG/15\'/1T/Thi)',
      columns: [
        { key: 'dauGio', short: 'ĐG', label: 'Đầu giờ', defaultWeight: 1 },
        { key: 'phut15', short: '15\'', label: '15 phút', defaultWeight: 1 },
        { key: 'motTiet', short: '1T', label: '1 tiết', defaultWeight: 2 },
        { key: 'khaoKinh', short: 'KK', label: 'Khảo kinh', defaultWeight: 1 },
        { key: 'daoDuc', short: 'ĐĐ', label: 'Đạo đức', defaultWeight: 1 },
        { key: 'thi', short: 'Thi', label: 'Thi', defaultWeight: 3 }
      ]
    },
    {
      name: 'Tối giản (3 cột)',
      columns: [
        { key: 'chuyenCan', short: 'CC', label: 'Chuyên cần', defaultWeight: 1 },
        { key: 'baiTap', short: 'BT', label: 'Bài tập', defaultWeight: 1 },
        { key: 'kiemTra', short: 'KT', label: 'Kiểm tra', defaultWeight: 2 }
      ]
    }
  ]
}
