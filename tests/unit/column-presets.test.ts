import { describe, it, expect, vi, beforeEach } from 'vitest'
import { saveColumnPreset, loadColumnPresets, deleteColumnPreset } from '../../src/features/columnPresets'

let store: Record<string, string> = {}

beforeEach(() => {
  store = {}
  global.localStorage = {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = String(value) }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    length: 0,
    key: vi.fn()
  } as any
})

describe('columnPresets', () => {
  it('should load builtin presets when nothing saved', () => {
    const presets = loadColumnPresets()
    expect(presets).toHaveLength(3)
    expect(presets[0].name).toBe('Mặc định (Giáo lý)')
    expect(presets[1].name).toBe('Cổ điển (ĐG/15\'/1T/Thi)')
    expect(presets[2].name).toBe('Tối giản (3 cột)')
  })

  it('should save a new custom preset', () => {
    saveColumnPreset('Custom', [{ key: 'test', short: 'T', label: 'Test', defaultWeight: 1 }])
    const presets = loadColumnPresets()
    expect(presets).toHaveLength(4)
    expect(presets[3].name).toBe('Custom')
  })

  it('should update an existing preset with same name', () => {
    saveColumnPreset('Custom', [{ key: 'a', short: 'A', label: 'A', defaultWeight: 1 }])
    saveColumnPreset('Custom', [{ key: 'b', short: 'B', label: 'B', defaultWeight: 2 }])
    const presets = loadColumnPresets()
    const custom = presets.find(p => p.name === 'Custom')
    expect(custom?.columns[0].key).toBe('b')
    expect(custom?.columns[0].defaultWeight).toBe(2)
  })

  it('should not delete builtin presets', () => {
    deleteColumnPreset('Mặc định (Giáo lý)')
    const presets = loadColumnPresets()
    expect(presets.find(p => p.name === 'Mặc định (Giáo lý)')).toBeDefined()
  })

  it('should delete custom preset', () => {
    saveColumnPreset('TempPreset', [{ key: 'x', short: 'X', label: 'X', defaultWeight: 1 }])
    expect(loadColumnPresets()).toHaveLength(4)
    deleteColumnPreset('TempPreset')
    expect(loadColumnPresets()).toHaveLength(3)
  })

  it('should fallback to builtins when stored data is corrupt', () => {
    store['gl-column-presets'] = 'not-json'
    const presets = loadColumnPresets()
    expect(presets).toHaveLength(3)
  })

  it('should merge builtins with saved presets', () => {
    store['gl-column-presets'] = JSON.stringify([{ name: 'My Preset', columns: [] }])
    const presets = loadColumnPresets()
    expect(presets).toHaveLength(4)
    expect(presets.find(p => p.name === 'Mặc định (Giáo lý)')).toBeDefined()
    expect(presets.find(p => p.name === 'My Preset')).toBeDefined()
  })
})
