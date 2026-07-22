// ============================================================
// Sổ Điểm GL — Sync Manager (Phase 2 Wrapper)
// ============================================================

import { StorageAdapter } from '../storage/StorageAdapter'
import { StateManager } from '../../ui/StateManager'
import { AuthManager } from '../../core/auth/AuthManager'
import { supabaseService } from '../SupabaseClient'
import { SyncEngine } from './SyncEngine'
import { AppState } from '../storage/StorageAdapter.types'
import { resolveClassColumns } from '../../config/constants.ts'
import { logger } from '../Logger'

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

    // Bubble up remote change events from SyncEngine
    this.syncEngine.addEventListener('remote-change', (e: any) => {
      this.dispatchEvent(new CustomEvent('remote-change', { detail: e.detail }))
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
      await this.refreshPendingCount()
      this.emitStatusChange()

      return { ok: true }
    } catch (e: any) {
      this.status.status = 'error'
      this.status.error = e.message
      await this.refreshPendingCount()
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
      // 5. Merge all into local StateManager (per-record merge to preserve local-only items)
      if (this.stateManager) {
        const sm = this.stateManager
        sm.applyFromNetwork('Tải dữ liệu từ đám mây', (draft: AppState) => {
          for (const c of (dbClasses || [])) {
            const classColumns = resolveClassColumns(c)
            const students = (dbStudents || [])
              .filter((s: any) => s.class_id === c.id)
              .map((s: any) => {
                const scoresByTerm: any = { hk1: {}, hk2: {} }
                for (const col of classColumns) {
                  scoresByTerm.hk1[col.key] = []
                  scoresByTerm.hk2[col.key] = []
                }
                const studentScores = (dbScores || []).filter((sc: any) => sc.student_id === s.id)
                for (const sc of studentScores) {
                  if (scoresByTerm[sc.term as 'hk1'|'hk2']) {
                    scoresByTerm[sc.term as 'hk1'|'hk2'][sc.col_key] = sc.values
                  }
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
                    at: Number(l.at),
                    rev: typeof l.rev === 'number' ? l.rev : 1
                  }))
                  .sort((a: any, b: any) => b.at - a.at)

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
                  rev: s.rev || 1,
                  createdAt: new Date(s.created_at).getTime(),
                  updatedAt: new Date(s.updated_at).getTime()
                }
              })

            const cIdx = draft.classes.findIndex(localC => localC.id === c.id)
            const cloudClassObj = {
              id: c.id,
              name: c.name,
              year: c.year,
              columns: Array.isArray(c.columns) && c.columns.length ? c.columns : classColumns,
              weights: c.weights,
              students,
              rev: c.rev || 1,
              createdAt: new Date(c.created_at).getTime(),
              updatedAt: new Date(c.updated_at).getTime()
            }

            if (cIdx === -1) {
              draft.classes.push(cloudClassObj)
            } else {
              const localC = draft.classes[cIdx]
              if ((c.rev || 1) >= (localC.rev || 1)) {
                localC.name = c.name
                localC.year = c.year
                localC.columns = Array.isArray(c.columns) && c.columns.length ? c.columns : classColumns
                localC.weights = c.weights
                localC.rev = c.rev || 1
                localC.updatedAt = new Date(c.updated_at).getTime()
              }
              for (const sCloud of students) {
                const sIdx = localC.students.findIndex(s => s.id === sCloud.id)
                if (sIdx === -1) {
                  localC.students.push(sCloud)
                } else {
                  const sLocal = localC.students[sIdx]
                  if ((sCloud.rev || 1) >= (sLocal.rev || 1)) {
                    const mergedLogs = mergeLearningLogs((sLocal.learningLog || []), sCloud.learningLog || [])
                    localC.students[sIdx] = {
                      ...sCloud,
                      learningLog: mergedLogs
                    }
                  }
                }
              }
            }
          }
        })
      }

      return { ok: true }
    } catch (e: any) {
      logger.error('Pull failed:', e)
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

  async refreshPendingCount(): Promise<void> {
    this.status.pendingCount = await this.syncEngine.getPendingCount()
  }

  getSupabaseUrl(): string {
    return supabaseService.getUrl()
  }

  isConfigured(): boolean {
    return supabaseService.isConfigured()
  }

  private async emitStatusChange(): Promise<void> {
    await this.refreshPendingCount()
    this.dispatchEvent(new CustomEvent('syncstatuschange', { detail: this.getStatus() }))
  }
}

// ============================================================
// Helpers
// ============================================================

function mergeLearningLogs(localLogs: any[], cloudLogs: any[]): any[] {
  const byId = new Map<string, any>()
  const add = (logs: any[]) => {
    for (const log of logs) {
      if (!log || !log.id) continue
      const existing = byId.get(log.id)
      if (!existing) {
        byId.set(log.id, log)
      } else {
        if ((typeof log.rev === 'number' ? log.rev : 0) > (typeof existing.rev === 'number' ? existing.rev : 0)) {
          byId.set(log.id, log)
        }
      }
    }
  }
  add(localLogs)
  add(cloudLogs)
  return Array.from(byId.values()).sort((a, b) => (Number(b.at) || 0) - (Number(a.at) || 0))
}