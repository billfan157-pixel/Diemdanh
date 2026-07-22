import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DataMigrator } from '../../src/services/sync/DataMigrator'

vi.mock('../../src/services/SupabaseClient', () => ({
  supabaseService: {
    getClient: vi.fn()
  }
}))

import { supabaseService } from '../../src/services/SupabaseClient'

function makeMockSupabase() {
  const upsert = vi.fn().mockResolvedValue({ error: null })
  const from = vi.fn().mockReturnValue({ upsert })
  return { from }
}

function makeMockState(overrides = {}) {
  return {
    classes: [],
    yearFilter: '',
    activeClassId: '',
    activeTerm: 'hk1',
    viewMode: 'cards',
    theme: 'light',
    ...overrides
  }
}

function makeMockStateManager(state: any) {
  return { getState: () => state }
}

describe('DataMigrator', () => {

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return error when supabase is not configured', async () => {
    vi.mocked(supabaseService.getClient).mockReturnValue(null)
    const stateManager = makeMockStateManager(makeMockState())
    const result = await DataMigrator.migrateLocalToCloud(stateManager as any)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Chưa cấu hình Supabase')
  })

  it('should upsert classes', async () => {
    const mock = makeMockSupabase()
    vi.mocked(supabaseService.getClient).mockReturnValue(mock as any)

    const cls = {
      id: 'cls-1',
      name: 'Lớp 1',
      year: '2025-2026',
      weights: { cc: 1 },
      columns: [],
      rev: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      students: []
    }

    const state = makeMockState({ classes: [cls] })
    const result = await DataMigrator.migrateLocalToCloud(makeMockStateManager(state) as any)

    expect(result.ok).toBe(true)
    expect(mock.from).toHaveBeenCalledWith('classes')
    expect(mock.from().upsert).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'cls-1', name: 'Lớp 1', year: '2025-2026' })
    ])
  })

  it('should upsert students, scores, and logs', async () => {
    const mock = makeMockSupabase()
    vi.mocked(supabaseService.getClient).mockReturnValue(mock as any)

    const student = {
      id: 'st-1',
      tenThanh: 'Maria',
      hoDem: 'Nguyễn',
      ten: 'An',
      name: '',
      maHV: 'HV001',
      scoresByTerm: {
        hk1: { cc: [8, 9], khaoKinh: [7] } as any,
        hk2: {} as any
      },
      learningLog: [
        { id: 'log-1', date: '2025-09-01', type: 'note', level: 'info', text: 'Chăm chỉ', byUserId: 'u1', byName: 'Admin', at: Date.now() }
      ],
      rev: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    const cls = { id: 'cls-1', name: 'Lớp 1', year: '2025-2026', weights: { cc: 1 }, columns: [], rev: 1, createdAt: Date.now(), updatedAt: Date.now(), students: [student] }
    const state = makeMockState({ classes: [cls] })
    const result = await DataMigrator.migrateLocalToCloud(makeMockStateManager(state) as any)

    expect(result.ok).toBe(true)

    // Students upsert called
    expect(mock.from).toHaveBeenCalledWith('students')
    expect(mock.from().upsert).toHaveBeenCalled()
    const studentCall = mock.from().upsert.mock.calls.find((c: any) => c[0]?.[0]?.id === 'st-1')
    expect(studentCall).toBeDefined()
    expect(studentCall[0][0].ten_thanh).toBe('Maria')

    // Scores upsert called
    expect(mock.from).toHaveBeenCalledWith('scores')
    const scoreCall = mock.from().upsert.mock.calls.find((c: any) => c[0]?.[0]?.col_key === 'cc')
    expect(scoreCall).toBeDefined()
    expect(scoreCall[0][0].values).toEqual([8, 9])

    // Logs upsert called
    expect(mock.from).toHaveBeenCalledWith('learning_logs')
  })

  it('should handle supabase error gracefully', async () => {
    const mock = makeMockSupabase()
    mock.from().upsert.mockRejectedValue(new Error('Network error'))
    vi.mocked(supabaseService.getClient).mockReturnValue(mock as any)

    const cls = { id: 'cls-1', name: 'Lớp 1', year: '2025-2026', weights: {}, columns: [], rev: 1, createdAt: Date.now(), updatedAt: Date.now(), students: [] }
    const state = makeMockState({ classes: [cls] })
    const result = await DataMigrator.migrateLocalToCloud(makeMockStateManager(state) as any)

    expect(result.ok).toBe(false)
    expect(result.error).toContain('Network error')
  })

  it('should handle empty state with no classes', async () => {
    const mock = makeMockSupabase()
    vi.mocked(supabaseService.getClient).mockReturnValue(mock as any)

    const result = await DataMigrator.migrateLocalToCloud(makeMockStateManager(makeMockState()) as any)
    expect(result.ok).toBe(true)
    expect(mock.from().upsert).not.toHaveBeenCalledWith(expect.arrayContaining([expect.anything()]))
  })

  it('should batch upsert students in groups of 100', async () => {
    const mock = makeMockSupabase()
    vi.mocked(supabaseService.getClient).mockReturnValue(mock as any)

    const students = Array.from({ length: 150 }, (_, i) => ({
      id: `st-${i}`,
      tenThanh: '',
      hoDem: 'Nguyễn',
      ten: `HS${i}`,
      scoresByTerm: { hk1: {} as any, hk2: {} as any },
      learningLog: [],
      rev: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }))

    const cls = { id: 'cls-1', name: 'Lớp 1', year: '2025-2026', weights: {}, columns: [], rev: 1, createdAt: Date.now(), updatedAt: Date.now(), students }
    const state = makeMockState({ classes: [cls] })
    await DataMigrator.migrateLocalToCloud(makeMockStateManager(state) as any)

    const studentCalls = mock.from().upsert.mock.calls.filter((c: any) => c[0]?.[0]?.id?.startsWith?.('st-'))
    expect(studentCalls.length).toBeGreaterThanOrEqual(2)
    // First batch has 100 items, second has 50
    expect(studentCalls[0][0].length).toBe(100)
    expect(studentCalls[1][0].length).toBe(50)
  })

})
