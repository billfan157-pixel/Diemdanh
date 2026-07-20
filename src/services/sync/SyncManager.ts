// ============================================================
// Sổ Điểm GL — Sync Manager (Phase 2 Wrapper)
// ============================================================

import { StorageAdapter } from '../storage/StorageAdapter'
import { StateManager } from '../../ui/StateManager'
import { AuthManager } from '../../core/auth/AuthManager'
import { supabaseService } from '../SupabaseClient'
import { SyncEngine } from './SyncEngine'
import { AppState } from '../storage/StorageAdapter.types'

export interface SyncStatus {
  status: 'idle' | 'syncing' | 'error' | 'offline'
  lastSync: number | null
  pendingCount: number
  error?: string
}

export class SyncManager extends EventTarget {
  private stateManager: StateManager | null = null
  private syncEngine: SyncEngine
  private syncInterval: ReturnType<typeof setInterval> | null = null
  private status: SyncStatus = {
    status: 'idle',
    lastSync: null,
    pendingCount: 0
  }

  constructor(storage: StorageAdapter) {
    super()
    this.syncEngine = new SyncEngine(storage)

    // Bubble up status change events from SyncEngine
    this.syncEngine.addEventListener('statuschange', (e: any) => {
      this.status.status = e.detail.status
      this.emitStatusChange()
    })

    // Handle conflict resolution
    this.syncEngine.addEventListener('conflict', (e: any) => {
      this.dispatchEvent(new CustomEvent('conflict', { detail: e.detail }))
    })
  }

  setStateManager(sm: StateManager): void {
    this.stateManager = sm
    this.syncEngine.setStateManager(sm)
  }

  setAuthManager(_am: AuthManager): void {
    // Left for backward compatibility
  }

  async init(): Promise<void> {
    // Configure client
    supabaseService.loadSettings()

    // Restore last sync time
    const lastSync = localStorage.getItem('so-diem-gl-last-sync')
    if (lastSync) {
      this.status.lastSync = parseInt(lastSync, 10)
    }

    // Start auto-sync if configured
    if (localStorage.getItem('so-diem-gl-auto-sync') === 'true') {
      this.startAutoSync()
    }

    await this.syncEngine.init()
  }

  configureSupabase(url: string, key: string): void {
    supabaseService.configure(url, key)
    localStorage.setItem('so-diem-gl-supabase', JSON.stringify({ url, key }))
  }

  async sync(): Promise<{ ok: boolean; error?: string }> {
    if (!supabaseService.isConfigured()) {
      this.status.status = 'offline'
      this.emitStatusChange()
      return { ok: false, error: 'Chưa cấu hình Supabase' }
    }

    this.status.status = 'syncing'
    this.emitStatusChange()

    try {
      // 1. Process all pending queue items first
      await this.syncEngine.processQueue()

      // 2. Pull all relational data from the cloud
      const res = await this.pull()
      if (!res.ok) throw new Error(res.error)

      this.status.lastSync = Date.now()
      this.status.status = 'idle'
      this.status.error = undefined
      localStorage.setItem('so-diem-gl-last-sync', String(this.status.lastSync))
      this.emitStatusChange()

      return { ok: true }
    } catch (e: any) {
      this.status.status = 'error'
      this.status.error = e.message
      this.emitStatusChange()
      return { ok: false, error: e.message }
    }
  }

  async pull(): Promise<{ ok: boolean; error?: string }> {
    const supabase = supabaseService.getClient()
    if (!supabase) return { ok: false, error: 'Chưa cấu hình Supabase' }

    try {
      // 1. Fetch classes
      const { data: dbClasses, error: errC } = await supabase.from('classes').select('*')
      if (errC) throw errC

      // 2. Fetch students
      const { data: dbStudents, error: errS } = await supabase.from('students').select('*')
      if (errS) throw errS

      // 3. Fetch scores
      const { data: dbScores, error: errSc } = await supabase.from('scores').select('*')
      if (errSc) throw errSc

      // 4. Fetch logs
      const { data: dbLogs, error: errL } = await supabase.from('learning_logs').select('*')
      if (errL) throw errL

      // 5. Merge all into local StateManager
      if (this.stateManager) {
        const sm = this.stateManager
        ;(sm as any).mutate('Tải dữ liệu từ đám mây', (draft: AppState) => {
          draft.classes = (dbClasses || []).map((c: any) => {
            const students = (dbStudents || [])
              .filter((s: any) => s.class_id === c.id)
              .map((s: any) => {
                const scoresByTerm: any = {
                  hk1: { khaoKinh: [], thuocBai: [], chuyenCan: [], baiTap: [], thaiDo: [], kiemTra: [] },
                  hk2: { khaoKinh: [], thuocBai: [], chuyenCan: [], baiTap: [], thaiDo: [], kiemTra: [] }
                }

                const studentScores = (dbScores || []).filter((sc: any) => sc.student_id === s.id)
                for (const sc of studentScores) {
                  scoresByTerm[sc.term as 'hk1'|'hk2'][sc.col_key] = sc.values
                }

                const logs = (dbLogs || [])
                  .filter((l: any) => l.student_id === s.id)
                  .map((l: any) => ({
                    id: l.id,
                    date: l.date,
                    type: l.type,
                    level: l.level,
                    text: l.text,
                    byUserId: l.by_user_id,
                    byName: l.by_name,
                    at: Number(l.at)
                  }))
                  .sort((a, b) => b.at - a.at)

                return {
                  id: s.id,
                  tenThanh: s.ten_thanh || '',
                  hoDem: s.ho_dem || '',
                  ten: s.ten || '',
                  name: s.name || '',
                  maHV: s.ma_hv || '',
                  ngaySinh: s.ngay_sinh || '',
                  gioiTinh: s.gioi_tinh || '',
                  tenPhuHuynh: s.ten_phu_huynh || '',
                  sdPhuHuynh: s.sd_phu_huynh || '',
                  diaChi: s.dia_chi || '',
                  email: s.email || '',
                  ghiChu: s.ghi_chu || '',
                  scoresByTerm,
                  learningLog: logs,
                  createdAt: new Date(s.created_at).getTime(),
                  updatedAt: new Date(s.updated_at).getTime()
                }
              })

            return {
              id: c.id,
              name: c.name,
              year: c.year,
              columns: c.columns,
              weights: c.weights,
              students,
              createdAt: new Date(c.created_at).getTime(),
              updatedAt: new Date(c.updated_at).getTime()
            }
          })
        }, { fromNetwork: true })
      }

      return { ok: true }
    } catch (e: any) {
      console.error('Pull failed:', e)
      return { ok: false, error: e.message }
    }
  }

  async push(): Promise<{ ok: boolean; error?: string }> {
    if (!supabaseService.isConfigured()) return { ok: false, error: 'Chưa cấu hình Supabase' }
    
    // per-record model pushes mutation logs automatically in background.
    // Manual push calls processQueue.
    try {
      await this.syncEngine.processQueue()
      return { ok: true }
    } catch (e: any) {
      return { ok: false, error: e.message }
    }
  }

  startAutoSync(intervalMs = 300000): void {
    if (this.syncInterval) return
    this.syncInterval = setInterval(() => this.sync(), intervalMs)
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  getStatus(): SyncStatus {
    return { ...this.status }
  }

  getSupabaseUrl(): string {
    return supabaseService.getUrl()
  }

  isConfigured(): boolean {
    return supabaseService.isConfigured()
  }

  private emitStatusChange(): void {
    this.dispatchEvent(new CustomEvent('syncstatuschange', { detail: this.getStatus() }))
  }
}