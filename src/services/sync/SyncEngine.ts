// ============================================================
// Sổ Điểm GL — Sync Engine
// ============================================================

import { supabaseService } from '../SupabaseClient'
import { StorageAdapter } from '../storage/StorageAdapter'
import { StateManager } from '../../ui/StateManager'
import { parsePatchesToOps, SyncOp } from './PatchSyncParser'
import { AppState } from '../storage/StorageAdapter.types'
import { cloneDefaultCols, resolveClassColumns } from '../../config/columns.ts'
import { logger } from '../Logger'

export interface ConflictData {
  op: SyncOp
  cloudRecord: any
  resolve: (choice: 'keep_local' | 'take_cloud' | 'merge', mergedData?: any) => void
}

export class SyncEngine extends EventTarget {
  private storage: StorageAdapter
  private stateManager: StateManager | null = null
  private processingQueue = false
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private realtimeChannel: any = null
  private onMutationAttached = false

  constructor(storage: StorageAdapter) {
    super()
    this.storage = storage
  }

  setStateManager(sm: StateManager): void {
    this.stateManager = sm

    if (!this.onMutationAttached) {
      // Use event-based tracking instead of intercepting private methods
      sm.onMutation((_label: string, fromNetwork: boolean) => {
        // If this mutation was loaded from sync/network, do not loop-sync it
        if (fromNetwork) return

        // Parse changes into sync ops and enqueue them
        const undoStack = sm.getUndoStack()
        const latestEntry = undoStack[undoStack.length - 1]
        if (latestEntry && latestEntry.patches) {
          const newState = sm.getState()
          // Reconstruct old state by applying inverse patches to new state
          const oldState = JSON.parse(JSON.stringify(newState))
          for (const p of latestEntry.inversePatches) {
            (applyPatch as any)(oldState, p)
          }
          const ops = parsePatchesToOps(oldState, newState, latestEntry.patches)
          for (const op of ops) {
            this.enqueueOp(op)
          }
        }
      })
      this.onMutationAttached = true
    }
  }

  async init(): Promise<void> {
    // Process queue on start
    this.processQueue()

    // Listen to Supabase connection events to start Realtime
    supabaseService.addEventListener('initialized', () => {
      this.setupRealtimeSubscription()
      this.processQueue()
    })

    if (supabaseService.isConfigured()) {
      this.setupRealtimeSubscription()
    }
  }

  private async enqueueOp(op: SyncOp): Promise<void> {
    await this.storage.enqueueSync({
      type: 'sync_op',
      data: { op },
      timestamp: Date.now()
    })
    this.processQueue()
  }

  async processQueue(): Promise<void> {
    if (this.processingQueue) return
    const supabase = supabaseService.getClient()
    if (!supabase) return

    this.processingQueue = true
    this.dispatchEvent(new CustomEvent('statuschange', { detail: { status: 'syncing' } }))

    try {
      while (true) {
        const items = await this.storage.getPendingSyncItems(1)
        if (items.length === 0) break

        const item = items[0]
        await this.storage.updateSyncStatus(item.id!, 'syncing')

        try {
          if (item.type === 'sync_op') {
            await this.processSyncOp(item.data.op)
          } else {
            // Legacy fallback if any
            await this.processLegacySync(item)
          }
          await this.storage.markSyncItemCompleted(item.id!)
        } catch (e: any) {
          logger.warn('Sync item failed:', e)
          await this.storage.markSyncItemFailed(item.id!)
          this.scheduleRetry()
          break
        }
      }

      const remaining = await this.storage.getPendingSyncItems(1)
      this.dispatchEvent(new CustomEvent('statuschange', { 
        detail: { status: remaining.length > 0 ? 'error' : 'idle' } 
      }))
    } finally {
      this.processingQueue = false
    }
  }

  async getPendingCount(): Promise<number> {
    return this.storage.getPendingSyncCount()
  }

  private async processSyncOp(op: SyncOp): Promise<void> {
    const supabase = supabaseService.getClient()
    if (!supabase) throw new Error('Supabase client not initialized')

    if (op.action === 'insert') {
      const { error } = await supabase.from(op.table).insert(op.data)
      if (error) throw error
    } else if (op.action === 'update') {
      // 1. Check revision for conflict detection
      if (op.table === 'classes' || op.table === 'students' || op.table === 'scores') {
        const { data: cloudRec, error: fetchErr } = await supabase
          .from(op.table)
          .select('rev')
          .eq('id', op.id)
          .single()

        if (!fetchErr && cloudRec && cloudRec.rev > (op.data.rev - 1)) {
          // Cloud has a newer revision! Stop queue and wait for conflict resolution
          let settled = false
          const CONFLICT_TIMEOUT = 30_000

          return new Promise<void>((resolve, reject) => {
            const resolveOnce = async (choice: 'keep_local' | 'take_cloud' | 'merge', mergedData?: any) => {
              if (settled) return
              settled = true
              clearTimeout(fallbackTimer)
              try {
                if (choice === 'keep_local') {
                  op.data.rev = cloudRec.rev + 1
                  const { error } = await supabase.from(op.table).upsert(op.data)
                  if (error) throw error
                } else if (choice === 'take_cloud') {
                  const { data: fullCloud } = await supabase
                    .from(op.table)
                    .select('*')
                    .eq('id', op.id)
                    .single()
                  if (fullCloud) {
                    this.mergeRecordLocally(op.table, fullCloud)
                  }
                } else if (choice === 'merge' && mergedData) {
                  mergedData.rev = cloudRec.rev + 1
                  const { error } = await supabase.from(op.table).upsert(mergedData)
                  if (error) throw error
                  this.mergeRecordLocally(op.table, mergedData)
                }
                resolve()
              } catch (err) {
                reject(err)
              }
            }

            // Auto-resolve with keep_local after timeout to prevent queue deadlock
            const fallbackTimer = setTimeout(() => {
              resolveOnce('keep_local').catch((e) => {
              console.warn('Conflict resolution failed:', e)
            })
            }, CONFLICT_TIMEOUT)

            const conflictEvent = new CustomEvent('conflict', {
              detail: {
                op,
                cloudRecord: cloudRec,
                resolve: resolveOnce
              } as ConflictData
            })
            this.dispatchEvent(conflictEvent)
          })
        }
      }

      // 2. Normal upsert
      const { error } = await supabase.from(op.table).upsert({ id: op.id, ...op.data })
      if (error) throw error
    } else if (op.action === 'delete') {
      const { error } = await supabase.from(op.table).delete().eq('id', op.id)
      if (error) throw error
    }
  }

  private async processLegacySync(item: any): Promise<void> {
    const supabase = supabaseService.getClient()
    if (!supabase) return

    // Migration 003 renames app_cloud → app_cloud_legacy.
    // Try legacy table first, fall back to app_cloud for fresh deployments.
    const tables = ['app_cloud_legacy', 'app_cloud']
    let payload: Record<string, any> = { updated_at: new Date().toISOString() }

    if (item.type === 'state') {
      payload = { id: 'main', state: item.data, ...payload }
    } else if (item.type === 'auth') {
      payload = { id: 'auth', auth: item.data, ...payload }
    } else {
      return
    }

    for (const table of tables) {
      const { error } = await supabase.from(table).upsert(payload)
      if (!error || !error.message?.includes('relation') || !error.message?.includes('does not exist')) {
        if (!error) return // success
        // Non-relation error, try next table
      }
    }
  }

  private scheduleRetry(): void {
    if (this.retryTimer) return
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      this.processQueue()
    }, 15000) // Retry in 15 seconds
  }

  // ============================================================
  // Supabase Realtime Subscriptions
  // ============================================================

  private setupRealtimeSubscription(): void {
    const supabase = supabaseService.getClient()
    if (!supabase) return

    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel)
    }

    this.realtimeChannel = supabase
      .channel('schema-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'classes' },
        (payload) => this.handleCloudChange('classes', payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'students' },
        (payload) => this.handleCloudChange('students', payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scores' },
        (payload) => this.handleCloudChange('scores', payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'learning_logs' },
        (payload) => this.handleCloudChange('learning_logs', payload)
      )
      .subscribe()
  }

  private handleCloudChange(table: string, payload: any): void {
    // Self-initiated changes are already filtered: mergeRecordLocally uses
    // applyFromNetwork which sets fromNetwork=true, preventing re-sync loops.
    const { eventType, new: newRec, old: oldRec } = payload

    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      this.mergeRecordLocally(table, newRec)
    } else if (eventType === 'DELETE') {
      this.deleteRecordLocally(table, oldRec.id)
    }
  }

  private mergeRecordLocally(table: string, record: any): void {
    if (!this.stateManager) return

    const sm = this.stateManager
    const label = `Đồng bộ đám mây (${table})`

    if (table === 'classes') {
      const idx = sm.getState().classes.findIndex(c => c.id === record.id)
      if (idx !== -1) {
        const existing = sm.getState().classes[idx]
        if (existing && (existing.rev || 0) >= (record.rev || 0)) return
      }

      if (idx === -1) {
        // Class not found locally, create it
        sm.applyFromNetwork(label, (draft: AppState) => {
          draft.classes.push({
            id: record.id,
            name: record.name,
            year: record.year,
            columns: Array.isArray(record.columns) && record.columns.length
              ? record.columns
              : cloneDefaultCols(),
            weights: record.weights,
            students: [],
            rev: record.rev || 1,
            createdAt: new Date(record.created_at).getTime(),
            updatedAt: new Date(record.updated_at).getTime()
          })
        })
      } else {
        // Update class properties
        sm.applyFromNetwork(label, (draft: AppState) => {
          draft.classes[idx].name = record.name
          draft.classes[idx].year = record.year
          if (Array.isArray(record.columns) && record.columns.length) {
            draft.classes[idx].columns = record.columns
          }
          draft.classes[idx].weights = record.weights
          draft.classes[idx].rev = record.rev || 1
          draft.classes[idx].updatedAt = new Date(record.updated_at).getTime()
        })
      }
    } else if (table === 'students') {
      // Find class
      const classIdx = sm.getState().classes.findIndex(c => c.id === record.class_id)
      if (classIdx === -1) return // Can't add student to non-existent class yet

      const sIdx = sm.getState().classes[classIdx].students.findIndex(s => s.id === record.id)
      if (sIdx !== -1) {
        const existing = sm.getState().classes[classIdx].students[sIdx]
        if (existing && (existing.rev || 0) >= (record.rev || 0)) return
      }

      if (sIdx === -1) {
        const classColumns = resolveClassColumns(sm.getState().classes[classIdx])
        sm.applyFromNetwork(label, (draft: AppState) => {
          // Initialize scoresByTerm with dynamic columns from class
          const scoresByTerm: any = {
            hk1: {} as any,
            hk2: {} as any
          }

          // Initialize empty arrays for each column
          for (const col of classColumns) {
            scoresByTerm.hk1[col.key] = []
            scoresByTerm.hk2[col.key] = []
          }

          draft.classes[classIdx].students.push({
            id: record.id,
            tenThanh: record.ten_thanh || '',
            hoDem: record.ho_dem || '',
            ten: record.ten || '',
            name: record.name || '',
            maHV: record.ma_hv || '',
            ngaySinh: record.ngay_sinh || '',
            gioiTinh: record.gioi_tinh || '',
            tenPhuHuynh: record.ten_phu_huynh || '',
            sdPhuHuynh: record.sd_phu_huynh || '',
            diaChi: record.dia_chi || '',
            email: record.email || '',
            ghiChu: record.ghi_chu || '',
            scoresByTerm,
            learningLog: [],
            rev: record.rev || 1,
            createdAt: new Date(record.created_at).getTime(),
            updatedAt: new Date(record.updated_at).getTime()
          })
        })
      } else {
        sm.applyFromNetwork(label, (draft: AppState) => {
          const s = draft.classes[classIdx].students[sIdx]
          s.tenThanh = record.ten_thanh || ''
          s.hoDem = record.ho_dem || ''
          s.ten = record.ten || ''
          s.name = record.name || ''
          s.maHV = record.ma_hv || ''
          s.ngaySinh = record.ngay_sinh || ''
          s.gioiTinh = record.gioi_tinh || ''
          s.tenPhuHuynh = record.ten_phu_huynh || ''
          s.sdPhuHuynh = record.sd_phu_huynh || ''
          s.diaChi = record.dia_chi || ''
          s.email = record.email || ''
          s.ghiChu = record.ghi_chu || ''
          s.rev = record.rev || 1
          s.updatedAt = new Date(record.updated_at).getTime()
        })
      }
    } else if (table === 'scores') {
      // Find the class and student
      for (let cIdx = 0; cIdx < sm.getState().classes.length; cIdx++) {
        const sIdx = sm.getState().classes[cIdx].students.findIndex(s => s.id === record.student_id)
        if (sIdx !== -1) {
          const classColumns = resolveClassColumns(sm.getState().classes[cIdx])
          sm.applyFromNetwork(label, (draft: AppState) => {
            const termScores = draft.classes[cIdx].students[sIdx].scoresByTerm[record.term as 'hk1'|'hk2']
            // Only set if the column exists in this class
            if (classColumns.some(col => col.key === record.col_key)) {
              termScores[record.col_key as keyof typeof termScores] = record.values
            }
          })
          break
        }
      }
    } else if (table === 'learning_logs') {
      for (let cIdx = 0; cIdx < sm.getState().classes.length; cIdx++) {
        const sIdx = sm.getState().classes[cIdx].students.findIndex(s => s.id === record.student_id)
        if (sIdx !== -1) {
          sm.applyFromNetwork(label, (draft: AppState) => {
            const logs = draft.classes[cIdx].students[sIdx].learningLog
            const logIdx = logs.findIndex(l => l.id === record.id)
            const logItem = {
              id: record.id,
              date: record.date,
              type: record.type,
              level: record.level,
              text: record.text,
              byUserId: record.by_user_id,
              byName: record.by_name,
              at: Number(record.at)
            }
            if (logIdx === -1) {
              logs.unshift(logItem)
              logs.sort((a, b) => b.at - a.at)
            } else {
              logs[logIdx] = logItem
            }
          })
          break
        }
      }
    }
  }

  private deleteRecordLocally(table: string, id: string): void {
    if (!this.stateManager) return

    const sm = this.stateManager
    const label = `Xóa từ đám mây (${table})`

    if (table === 'classes') {
      const idx = sm.getState().classes.findIndex(c => c.id === id)
      if (idx !== -1) {
        sm.applyFromNetwork(label, (draft: AppState) => {
          draft.classes.splice(idx, 1)
          if (draft.activeClassId === id) {
            draft.activeClassId = draft.classes[0]?.id || null
          }
        })
      }
    } else if (table === 'students') {
      for (let cIdx = 0; cIdx < sm.getState().classes.length; cIdx++) {
        const sIdx = sm.getState().classes[cIdx].students.findIndex(s => s.id === id)
        if (sIdx !== -1) {
          sm.applyFromNetwork(label, (draft: AppState) => {
            draft.classes[cIdx].students.splice(sIdx, 1)
          })
          break
        }
      }
    }
  }
}

// ============================================================
// Helper: Apply JSON Patch to object
// ============================================================

function applyPatch(obj: any, patch: { op: string; path: string[]; value?: any }): void {
  const { op, path, value } = patch
  if (path.length === 0) return

  let target = obj
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]
    if (!(key in target)) {
      // Create missing path
      target[key] = isNaN(Number(path[i + 1])) ? {} : []
    }
    target = target[key]
  }

  const lastKey = path[path.length - 1]

  switch (op) {
    case 'add':
      if (Array.isArray(target)) {
        const idx = parseInt(String(lastKey), 10)
        if (idx >= 0 && idx <= target.length) {
          target.splice(idx, 0, value)
        }
      } else {
        target[lastKey] = value
      }
      break

    case 'remove':
      if (Array.isArray(target)) {
        const idx = parseInt(String(lastKey), 10)
        if (idx >= 0 && idx < target.length) {
          target.splice(idx, 1)
        }
      } else {
        delete target[lastKey]
      }
      break

    case 'replace':
      target[lastKey] = value
      break
  }
}