// ============================================================
// Sổ Điểm GL — Sync Manager
// Supabase sync with offline queue
// ============================================================

import { StorageAdapter } from '../storage/StorageAdapter'
import { StateManager } from '../../ui/StateManager'
import { AuthManager } from '../../core/auth/AuthManager'

export interface SyncStatus {
  status: 'idle' | 'syncing' | 'error' | 'offline'
  lastSync: number | null
  pendingCount: number
  error?: string
}

export class SyncManager extends EventTarget {
  private storage: StorageAdapter
  private stateManager: StateManager | null = null
  private authManager: AuthManager | null = null
  private supabase: any = null
  private supabaseUrl = ''
  private supabaseKey = ''

  private status: SyncStatus = {
    status: 'idle',
    lastSync: null,
    pendingCount: 0
  }

  private syncInProgress = false
  private syncInterval: ReturnType<typeof setInterval> | null = null
  private retryTimeout: ReturnType<typeof setTimeout> | null = null

  constructor(storage: StorageAdapter) {
    super()
    this.storage = storage
  }

  setStateManager(sm: StateManager): void {
    this.stateManager = sm
  }

  setAuthManager(am: AuthManager): void {
    this.authManager = am
  }

  async init(): Promise<void> {
    // Load saved supabase config
    const settings = await this.storage.getSettings()
    if (settings.supabaseUrl && settings.supabaseKey) {
      this.supabaseUrl = settings.supabaseUrl
      this.supabaseKey = settings.supabaseKey
      await this.initSupabase()
    }

    // Load last sync time
    const lastSync = localStorage.getItem('so-diem-gl-last-sync')
    if (lastSync) {
      this.status.lastSync = parseInt(lastSync, 10)
    }

    // Start auto-sync if configured
    if (localStorage.getItem('so-diem-gl-auto-sync') === 'true') {
      this.startAutoSync()
    }

    // Process pending sync queue
    this.processSyncQueue()
  }

  private async initSupabase(): Promise<void> {
    if (!this.supabaseUrl || !this.supabaseKey) return

    try {
      const { createClient } = await import('@supabase/supabase-js')
      this.supabase = createClient(this.supabaseUrl, this.supabaseKey)
      this.status.status = 'idle'
      this.emitStatusChange()
    } catch (e) {
      console.warn('Supabase init failed:', e)
      this.supabase = null
    }
  }

  configureSupabase(url: string, key: string): void {
    this.supabaseUrl = url
    this.supabaseKey = key
    localStorage.setItem('so-diem-gl-supabase', JSON.stringify({ url, key }))
    this.initSupabase()
  }

  private async processSyncQueue(): Promise<void> {
    if (!this.supabase) return

    const pending = await this.storage.getPendingSyncItems()
    if (pending.length === 0) return

    for (const item of pending) {
      await this.processSyncItem(item)
    }
  }

  private async processSyncItem(item: any): Promise<void> {
    if (!this.supabase) return

    await this.storage.updateSyncStatus(item.id, 'syncing')

    try {
      if (item.type === 'state') {
        await this.supabase
          .from('app_cloud')
          .upsert({
            id: 'main',
            state: item.data,
            updated_at: new Date().toISOString()
          })
      } else if (item.type === 'auth') {
        await this.supabase
          .from('app_cloud')
          .upsert({
            id: 'auth',
            auth: item.data,
            updated_at: new Date().toISOString()
          })
      }

      await this.storage.markSyncItemCompleted(item.id)
    } catch (e: any) {
      console.warn('Sync item failed:', e)
      await this.storage.markSyncItemFailed(item.id)
      this.scheduleRetry()
    }
  }

  async sync(): Promise<{ ok: boolean; error?: string }> {
    if (!this.supabase) {
      this.status.status = 'offline'
      this.emitStatusChange()
      return { ok: false, error: 'Chưa cấu hình Supabase' }
    }

    if (this.syncInProgress) return { ok: false, error: 'Đang đồng bộ' }

    this.syncInProgress = true
    this.status.status = 'syncing'
    this.emitStatusChange()

    try {
      const stateManager = this.stateManager
      const authManager = this.authManager

      if (!stateManager || !authManager) {
        throw new Error('Managers not initialized')
      }

      // Push state
      const state = stateManager.getState()
      await this.supabase
        .from('app_cloud')
        .upsert({
          id: 'main',
          state,
          updated_at: new Date().toISOString()
        })

      // Push auth
      const authStore = await this.storage.getAuthStore()
      await this.supabase
        .from('app_cloud')
        .upsert({
          id: 'auth',
          auth: authStore,
          updated_at: new Date().toISOString()
        })

      // Pull latest (in case of conflicts)
      const { data: stateData } = await this.supabase
        .from('app_cloud')
        .select('state')
        .eq('id', 'main')
        .single()

      if (stateData?.state) {
        await this.storage.setState(stateData.state)
      }

      const { data: authData } = await this.supabase
        .from('app_cloud')
        .select('auth')
        .eq('id', 'auth')
        .single()

      if (authData?.auth) {
        await this.storage.setAuthStore(authData.auth)
      }

      this.status.lastSync = Date.now()
      this.status.status = 'idle'
      this.status.error = undefined
      localStorage.setItem('so-diem-gl-last-sync', String(this.status.lastSync))

      this.emitStatusChange()
      return { ok: true }
    } catch (e: any) {
      console.error('Sync failed:', e)
      this.status.status = 'error'
      this.status.error = e.message
      this.emitStatusChange()
      return { ok: false, error: e.message }
    } finally {
      this.syncInProgress = false
    }
  }

  async pull(): Promise<{ ok: boolean; error?: string }> {
    if (!this.supabase) return { ok: false, error: 'Chưa cấu hình Supabase' }

    try {
      const { data: stateData } = await this.supabase
        .from('app_cloud')
        .select('state')
        .eq('id', 'main')
        .single()

      if (stateData?.state) {
        await this.storage.setState(stateData.state)
      }

      const { data: authData } = await this.supabase
        .from('app_cloud')
        .select('auth')
        .eq('id', 'auth')
        .single()

      if (authData?.auth) {
        await this.storage.setAuthStore(authData.auth)
      }

      return { ok: true }
    } catch (e: any) {
      console.error('Pull failed:', e)
      return { ok: false, error: e.message }
    }
  }

  async push(): Promise<{ ok: boolean; error?: string }> {
    if (!this.supabase) return { ok: false, error: 'Chưa cấu hình Supabase' }

    try {
      const state = this.stateManager?.getState()
      const authStore = await this.storage.getAuthStore()

      if (state) {
        await this.supabase
          .from('app_cloud')
          .upsert({
            id: 'main',
            state,
            updated_at: new Date().toISOString()
          })
      }

      await this.supabase
        .from('app_cloud')
        .upsert({
          id: 'auth',
          auth: authStore,
          updated_at: new Date().toISOString()
        })

      return { ok: true }
    } catch (e: any) {
      console.error('Push failed:', e)
      return { ok: false, error: e.message }
    }
  }

  private scheduleRetry(): void {
    if (this.retryTimeout) return
    this.retryTimeout = setTimeout(() => {
      this.retryTimeout = null
      this.processSyncQueue()
    }, 30000) // 30s retry
  }

  startAutoSync(intervalMs = 300000): void { // 5 minutes default
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
    return this.supabaseUrl
  }

  isConfigured(): boolean {
    return !!this.supabaseUrl && !!this.supabaseKey
  }

  private emitStatusChange(): void {
    this.dispatchEvent(new CustomEvent('syncstatuschange', { detail: this.getStatus() }))
  }
}