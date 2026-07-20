// ============================================================
// Sổ Điểm GL — Backup Service
// Local JSON backup/restore with File System Access API support
// ============================================================

import { StorageAdapter } from './storage/StorageAdapter'
import { NotificationManager } from './NotificationManager'
import { StateManager } from '../ui/StateManager'

export interface BackupMeta {
  lastAt: string | null
  lastFile: string
  count: number
  folderName?: string
  lastMode?: 'folder' | 'download'
}

export interface BackupStatus {
  lastAt: string | null
  daysAgo: number | null
  needsRemind: boolean
  never: boolean
  label: string
  level: 'ok' | 'warn' | 'danger'
  lastFile?: string
  count?: number
}

const BACKUP_META_KEY = 'giao-ly-backup-meta-v1'
const BACKUP_REMIND_DAYS = 7

export class BackupService {
  private storage: StorageAdapter
  private notification: NotificationManager
  private stateManager?: StateManager
  private dirHandleCache: any = null

  constructor(storage: StorageAdapter, notification: NotificationManager) {
    this.storage = storage
    this.notification = notification
  }

  setStateManager(stateManager: StateManager): void {
    this.stateManager = stateManager
  }

  canUseBackupFolder(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof (window as any).showDirectoryPicker === 'function' &&
      this.storage.isIndexedDBEnabled()
    );
  }

  getBackupMeta(): BackupMeta {
    try {
      const raw = localStorage.getItem(BACKUP_META_KEY)
      if (raw) {
        const p = JSON.parse(raw)
        if (p && typeof p === 'object') return p
      }
    } catch (e) {
      console.warn('Failed to parse backup meta:', e)
    }
    return { lastAt: null, lastFile: '', count: 0 }
  }

  private saveBackupMeta(meta: BackupMeta): void {
    try {
      localStorage.setItem(BACKUP_META_KEY, JSON.stringify(meta))
    } catch (e) {
      console.warn('Failed to save backup meta:', e)
    }
  }

  private markBackupDone(filename: string, extra?: { folderName?: string; mode?: 'folder' | 'download' }): BackupMeta {
    const meta = this.getBackupMeta()
    meta.lastAt = new Date().toISOString()
    meta.lastFile = filename || meta.lastFile || ''
    meta.count = (meta.count || 0) + 1
    if (extra?.folderName) meta.folderName = extra.folderName
    if (extra?.mode) meta.lastMode = extra.mode
    this.saveBackupMeta(meta)
    return meta
  }

  async saveBackupDirHandle(handle: any): Promise<void> {
    this.dirHandleCache = handle
    try {
      if (this.storage.isIndexedDBEnabled()) {
        const db = (this.storage as any).dbInstance || await (this.storage as any).getDB()
        if (handle) {
          await db.put('appState', handle, 'backupFolder')
        } else {
          await db.delete('appState', 'backupFolder')
        }
      }
    } catch (e) {
      console.warn('Failed to save backup directory handle:', e)
    }
  }

  async loadBackupDirHandle(): Promise<any> {
    if (this.dirHandleCache) return this.dirHandleCache
    try {
      if (this.storage.isIndexedDBEnabled()) {
        const db = (this.storage as any).dbInstance || await (this.storage as any).getDB()
        const handle = await db.get('appState', 'backupFolder')
        this.dirHandleCache = handle || null
        return this.dirHandleCache
      }
    } catch (e) {
      console.warn('Failed to load backup directory handle:', e)
    }
    return null
  }

  async clearBackupDirHandle(): Promise<void> {
    this.dirHandleCache = null
    await this.saveBackupDirHandle(null)
    const meta = this.getBackupMeta()
    meta.folderName = ''
    this.saveBackupMeta(meta)
  }

  private async ensureBackupDirPermission(handle: any): Promise<boolean> {
    if (!handle) return false
    try {
      const q = await handle.queryPermission({ mode: 'readwrite' })
      if (q === 'granted') return true
      const r = await handle.requestPermission({ mode: 'readwrite' })
      return r === 'granted'
    } catch (e) {
      console.warn('Directory permission request failed:', e)
      return false
    }
  }

  async pickBackupFolder(): Promise<any> {
    if (!this.canUseBackupFolder()) {
      this.notification.show(
        'Trình duyệt không hỗ trợ chọn thư mục (dùng Chrome/Edge). Sẽ tải file về Downloads.',
        'warning'
      )
      return null
    }
    try {
      const handle = await (window as any).showDirectoryPicker({
        id: 'so-diem-giao-ly-backups',
        mode: 'readwrite',
        startIn: 'documents'
      })
      await this.saveBackupDirHandle(handle)
      this.notification.show(
        `Đã gắn thư mục sao lưu: «${handle.name}». Lần sau bấm Sao lưu sẽ lưu thẳng vào đây.`,
        'success'
      )
      return handle
    } catch (e: any) {
      if (e && e.name === 'AbortError') return null
      console.error(e)
      this.notification.show('Không chọn được thư mục: ' + (e.message || e), 'error')
      return null
    }
  }

  private async writeBackupToFolder(blob: Blob, filename: string): Promise<{ ok: boolean; folderName?: string; reason?: string }> {
    const handle = await this.loadBackupDirHandle()
    if (!handle) return { ok: false, reason: 'no-folder' }
    const okPerm = await this.ensureBackupDirPermission(handle)
    if (!okPerm) return { ok: false, reason: 'no-permission' }
    try {
      const fileHandle = await handle.getFileHandle(filename, { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(blob)
      await writable.close()
      return { ok: true, folderName: handle.name }
    } catch (e) {
      console.error('File write failed:', e)
      return { ok: false, reason: 'write-error' }
    }
  }

  getBackupStatus(): BackupStatus {
    const meta = this.getBackupMeta()
    const lastAt = meta.lastAt
    const days = BACKUP_REMIND_DAYS
    
    // Check if snooze is active
    let snoozed = false
    try {
      const sn = Number(localStorage.getItem('giao-ly-backup-snooze') || 0)
      snoozed = Date.now() < sn
    } catch (e) {
      // ignore
    }

    if (!lastAt) {
      return {
        lastAt: null,
        daysAgo: null,
        needsRemind: !snoozed,
        never: true,
        label: 'Chưa từng sao lưu trên máy này',
        level: 'danger'
      }
    }

    const t = Date.parse(lastAt)
    let daysAgo = Math.floor((Date.now() - t) / (24 * 3600 * 1000))
    if (daysAgo < 0) daysAgo = 0
    const needs = daysAgo >= days && !snoozed

    let label = ''
    if (daysAgo === 0) label = 'Đã sao lưu hôm nay'
    else if (daysAgo === 1) label = 'Sao lưu lần cuối: hôm qua'
    else label = `Sao lưu lần cuối: ${daysAgo} ngày trước`

    return {
      lastAt,
      daysAgo,
      needsRemind: needs,
      never: false,
      label,
      level: needs ? (daysAgo >= days * 2 ? 'danger' : 'warn') : 'ok',
      lastFile: meta.lastFile,
      count: meta.count
    }
  }

  snoozeReminder(): void {
    // Snooze for 3 days
    const snoozeTime = Date.now() + 3 * 24 * 3600 * 1000
    localStorage.setItem('giao-ly-backup-snooze', String(snoozeTime))
  }

  private fallbackDownload(blob: Blob, name: string): void {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    a.click()
    setTimeout(() => {
      URL.revokeObjectURL(a.href)
    }, 2000)
  }

  async exportBackup(): Promise<boolean> {
    try {
      const json = await this.storage.exportAll()
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
      const now = new Date()
      const dateStr = now.toISOString().slice(0, 10)
      const hh = now.getHours()
      const mm = now.getMinutes()
      const timeStr = (hh < 10 ? '0' : '') + hh + (mm < 10 ? '0' : '') + mm
      const filename = `backup-so-diem-giao-ly-${dateStr}-${timeStr}.json`

      // Try writing directly if directory is attached
      const folderWrite = await this.writeBackupToFolder(blob, filename)
      if (folderWrite.ok && folderWrite.folderName) {
        this.markBackupDone(filename, { folderName: folderWrite.folderName, mode: 'folder' })
        
        const state = await this.storage.getState()
        const classCount = state.classes?.length || 0
        const studentCount = state.classes?.reduce((sum, c) => sum + (c.students?.length || 0), 0) || 0
        
        this.notification.show(
          `Đã lưu vào thư mục «${folderWrite.folderName}» · ${classCount} lớp · ${studentCount} HV · ${filename}`,
          'success'
        )
        return true
      }

      // If directory is not attached and browser supports Picker, trigger folder picker prompt
      if (folderWrite.reason === 'no-folder' && this.canUseBackupFolder()) {
        const pick = await this.notification.confirm(
          'Lần đầu: chọn (hoặc tạo) thư mục backups trong project.\n\nVí dụ: tinh-diem/backups\n\nLần sau sẽ tự lưu vào đó. Hủy = tải về thư mục Tải xuống như cũ.',
          {
            title: 'Chọn thư mục sao lưu?',
            type: 'info',
            confirmText: 'Chọn thư mục',
            cancelText: 'Tải về Downloads'
          }
        )
        if (pick) {
          const dir = await this.pickBackupFolder()
          if (dir) {
            const w2 = await this.writeBackupToFolder(blob, filename)
            if (w2.ok) {
              this.markBackupDone(filename, { folderName: w2.folderName, mode: 'folder' })
              this.notification.show(`Đã lưu vào «${w2.folderName}» · ${filename}`, 'success')
              return true
            }
          }
        }
      } else if (folderWrite.reason === 'no-permission') {
        this.notification.show('Cần cho phép ghi lại thư mục sao lưu. Vui lòng bấm chọn lại.', 'warning')
        const dir2 = await this.pickBackupFolder()
        if (dir2) {
          const w3 = await this.writeBackupToFolder(blob, filename)
          if (w3.ok) {
            this.markBackupDone(filename, { folderName: w3.folderName, mode: 'folder' })
            this.notification.show(`Đã lưu vào «${w3.folderName}» · ${filename}`, 'success')
            return true
          }
        }
      }

      // Fallback: Trigger normal browser download
      this.fallbackDownload(blob, filename)
      this.markBackupDone(filename, { mode: 'download' })

      const state = await this.storage.getState()
      const classCount = state.classes?.length || 0
      const studentCount = state.classes?.reduce((sum, c) => sum + (c.students?.length || 0), 0) || 0

      this.notification.show(
        `Đã tải backup ${classCount} lớp · ${studentCount} HV → ${filename} (thư mục Tải xuống)`,
        'success'
      )
      return true
    } catch (e: any) {
      console.error(e)
      this.notification.show('Lỗi sao lưu: ' + (e.message || e), 'error')
      return false
    }
  }

  async importBackupFile(file: File, _mode: 'replace' | 'merge'): Promise<boolean> {
    try {
      const text = await file.text()
      const res = await this.storage.importAll(text)
      if (!res.ok) {
        this.notification.show(res.error || 'File backup không hợp lệ', 'error')
        return false
      }

      // Clear undo/redo stacks and re-initialize state if manager is present
      if (this.stateManager) {
        this.stateManager.clearUndoRedo()
        await this.stateManager.init()
      }

      const data = JSON.parse(text)
      const classCount = data.state?.classes?.length || 0
      this.notification.show(`Đã khôi phục dữ liệu thành công (${classCount} lớp)`, 'success')
      return true
    } catch (e: any) {
      this.notification.show('Lỗi khôi phục: ' + (e.message || e), 'error')
      return false
    }
  }
}
