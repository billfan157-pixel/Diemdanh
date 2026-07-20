// ============================================================
// Sổ Điểm GL — Data Migrator
// ============================================================

import { supabaseService } from '../SupabaseClient'
import { StateManager } from '../../ui/StateManager'

export class DataMigrator {
  static async migrateLocalToCloud(stateManager: StateManager): Promise<{ ok: boolean; error?: string }> {
    const supabase = supabaseService.getClient()
    if (!supabase) {
      return { ok: false, error: 'Chưa cấu hình Supabase' }
    }

    try {
      const state = stateManager.getState()
      
      // 1. Prepare classes batch
      const classesBatch = state.classes.map(c => ({
        id: c.id,
        name: c.name,
        year: c.year,
        weights: c.weights,
        columns: c.columns,
        rev: c.rev || 1,
        created_at: new Date(c.createdAt || Date.now()).toISOString(),
        updated_at: new Date(c.updatedAt || Date.now()).toISOString()
      }))

      if (classesBatch.length > 0) {
        const { error } = await supabase.from('classes').upsert(classesBatch)
        if (error) throw error
      }

      // 2. Prepare students, scores, and logs batches
      const studentsBatch: any[] = []
      const scoresBatch: any[] = []
      const logsBatch: any[] = []

      for (const cls of state.classes) {
        for (const s of cls.students) {
          studentsBatch.push({
            id: s.id,
            class_id: cls.id,
            ten_thanh: s.tenThanh || '',
            ho_dem: s.hoDem || '',
            ten: s.ten || '',
            name: s.name || '',
            ma_hv: s.maHV || '',
            ngay_sinh: s.ngaySinh || '',
            gioi_tinh: s.gioiTinh || '',
            ten_phu_huynh: s.tenPhuHuynh || '',
            sd_phu_huynh: s.sdPhuHuynh || '',
            dia_chi: s.diaChi || '',
            email: s.email || '',
            ghi_chu: s.ghiChu || '',
            rev: s.rev || 1,
            created_at: new Date(s.createdAt || Date.now()).toISOString(),
            updated_at: new Date(s.updatedAt || Date.now()).toISOString()
          })

          // Scores hk1 & hk2
          for (const term of ['hk1', 'hk2'] as const) {
            const ts = s.scoresByTerm[term]
            if (ts) {
              for (const col of Object.keys(ts)) {
                const vals = ts[col as keyof typeof ts]
                if (Array.isArray(vals) && vals.length > 0) {
                  scoresBatch.push({
                    student_id: s.id,
                    term,
                    col_key: col,
                    values: vals,
                    rev: 1
                  })
                }
              }
            }
          }

          // Learning logs
          for (const log of s.learningLog || []) {
            logsBatch.push({
              id: log.id,
              student_id: s.id,
              date: log.date,
              type: log.type,
              level: log.level,
              text: log.text,
              by_user_id: log.byUserId,
              by_name: log.byName,
              at: log.at
            })
          }
        }
      }

      // Upsert students in batches of 100
      for (let i = 0; i < studentsBatch.length; i += 100) {
        const batch = studentsBatch.slice(i, i + 100)
        const { error } = await supabase.from('students').upsert(batch)
        if (error) throw error
      }

      // Upsert scores in batches of 100
      for (let i = 0; i < scoresBatch.length; i += 100) {
        const batch = scoresBatch.slice(i, i + 100)
        const { error } = await supabase.from('scores').upsert(batch)
        if (error) throw error
      }

      // Upsert logs in batches of 100
      for (let i = 0; i < logsBatch.length; i += 100) {
        const batch = logsBatch.slice(i, i + 100)
        const { error } = await supabase.from('learning_logs').upsert(batch)
        if (error) throw error
      }

      return { ok: true }
    } catch (e: any) {
      console.error('DataMigrator failed:', e)
      return { ok: false, error: e.message }
    }
  }
}
