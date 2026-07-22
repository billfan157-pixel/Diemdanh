import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BackupService, BackupMeta } from '../../src/services/BackupService'
import { StorageAdapter } from '../../src/services/storage/StorageAdapter'
import { NotificationManager } from '../../src/services/NotificationManager'
import { StateManager } from '../../src/ui/StateManager'

// Mock browser dependencies
let mockStore: Record<string, string> = {}
global.localStorage = {
  getItem: vi.fn((key: string) => mockStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { mockStore[key] = String(value) }),
  removeItem: vi.fn((key: string) => { delete mockStore[key] }),
  clear: vi.fn(() => { mockStore = {} }),
  length: 0,
  key: vi.fn()
} as any

describe('BackupService', () => {
  let storage: StorageAdapter
  let notification: NotificationManager
  let backupService: BackupService

  beforeEach(() => {
    vi.clearAllMocks()
    mockStore = {}
    storage = new StorageAdapter()
    ;(storage as any).useIndexedDB = false
    ;(storage as any).initialized = true
    notification = new NotificationManager()
    backupService = new BackupService(storage, notification)
  })

  // ─── getBackupMeta ───

  it('should return default metadata when local storage is empty', () => {
    const meta = backupService.getBackupMeta()
    expect(meta.lastAt).toBeNull()
    expect(meta.count).toBe(0)
    expect(meta.lastFile).toBe('')
  })

  it('should read metadata correctly from local storage', () => {
    const mockMeta: BackupMeta = {
      lastAt: '2026-07-20T00:00:00.000Z',
      lastFile: 'backup-file.json',
      count: 5,
      folderName: 'my-backups',
      lastMode: 'folder'
    }
    mockStore['giao-ly-backup-meta-v1'] = JSON.stringify(mockMeta)
    const meta = backupService.getBackupMeta()
    expect(meta.lastAt).toBe('2026-07-20T00:00:00.000Z')
    expect(meta.count).toBe(5)
    expect(meta.lastFile).toBe('backup-file.json')
    expect(meta.folderName).toBe('my-backups')
    expect(meta.lastMode).toBe('folder')
  })

  it('should fallback to default when stored metadata is corrupt', () => {
    mockStore['giao-ly-backup-meta-v1'] = '{bad json'
    const meta = backupService.getBackupMeta()
    expect(meta.lastAt).toBeNull()
    expect(meta.count).toBe(0)
  })

  // ─── getBackupStatus ───

  it('should return level danger when there is no backup history', () => {
    const status = backupService.getBackupStatus()
    expect(status.needsRemind).toBe(true)
    expect(status.never).toBe(true)
    expect(status.level).toBe('danger')
  })

  it('should return level ok if backup was created recently', () => {
    const mockMeta: BackupMeta = {
      lastAt: new Date().toISOString(),
      lastFile: 'backup.json',
      count: 1
    }
    mockStore['giao-ly-backup-meta-v1'] = JSON.stringify(mockMeta)
    const status = backupService.getBackupStatus()
    expect(status.needsRemind).toBe(false)
    expect(status.never).toBe(false)
    expect(status.level).toBe('ok')
  })

  it('should trigger warn reminder if backup is older than 7 days', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString()
    const mockMeta: BackupMeta = {
      lastAt: tenDaysAgo,
      lastFile: 'old-backup.json',
      count: 1
    }
    mockStore['giao-ly-backup-meta-v1'] = JSON.stringify(mockMeta)
    const status = backupService.getBackupStatus()
    expect(status.needsRemind).toBe(true)
    expect(status.level).toBe('warn')
  })

  it('should trigger danger reminder if backup is older than 14 days', () => {
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString()
    const mockMeta: BackupMeta = {
      lastAt: fifteenDaysAgo,
      lastFile: 'very-old-backup.json',
      count: 1
    }
    mockStore['giao-ly-backup-meta-v1'] = JSON.stringify(mockMeta)
    const status = backupService.getBackupStatus()
    expect(status.needsRemind).toBe(true)
    expect(status.level).toBe('danger')
  })

  it('should not remind when snoozed', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString()
    const mockMeta: BackupMeta = {
      lastAt: tenDaysAgo,
      lastFile: 'old-backup.json',
      count: 1
    }
    mockStore['giao-ly-backup-meta-v1'] = JSON.stringify(mockMeta)
    mockStore['giao-ly-backup-snooze'] = String(Date.now() + 86400000)
    const status = backupService.getBackupStatus()
    expect(status.needsRemind).toBe(false)
  })

  // ─── canUseBackupFolder ───

  it('should detect folder picker support', () => {
    ;(global as any).window = { showDirectoryPicker: vi.fn() }
    vi.spyOn(storage, 'isIndexedDBEnabled' as any).mockReturnValue(true)
    expect(backupService.canUseBackupFolder()).toBe(true)
  })

  it('should return false when showDirectoryPicker is not available', () => {
    ;(global as any).window = {}
    expect(backupService.canUseBackupFolder()).toBe(false)
  })

  // ─── setStateManager ───

  it('should set state manager reference', () => {
    const sm = { clearUndoRedo: vi.fn(), init: vi.fn() } as any
    backupService.setStateManager(sm)
    expect((backupService as any).stateManager).toBe(sm)
  })

  // ─── saveBackupDirHandle / loadBackupDirHandle / clearBackupDirHandle ───

  it('should save and load backup directory handle', async () => {
    const handle = { name: 'backups' }
    vi.spyOn(storage, 'saveBackupHandle' as any).mockResolvedValue(undefined)
    vi.spyOn(storage, 'getBackupHandle' as any).mockResolvedValue(handle)
    await backupService.saveBackupDirHandle(handle)
    expect((backupService as any).dirHandleCache).toBe(handle)

    const loaded = await backupService.loadBackupDirHandle()
    expect(loaded).toBe(handle)
  })

  it('should use cached handle without calling storage', async () => {
    const handle = { name: 'cached' }
    ;(backupService as any).dirHandleCache = handle
    vi.spyOn(storage, 'getBackupHandle' as any).mockRejectedValue(new Error('should not call'))
    const loaded = await backupService.loadBackupDirHandle()
    expect(loaded).toBe(handle)
  })

  it('should clear backup directory handle', async () => {
    ;(backupService as any).dirHandleCache = { name: 'olds' }
    vi.spyOn(storage, 'deleteBackupHandle' as any).mockResolvedValue(undefined)
    await backupService.clearBackupDirHandle()
    expect((backupService as any).dirHandleCache).toBeNull()
  })

  // ─── snoozeReminder ───

  it('should set snooze for 3 days', () => {
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now)
    backupService.snoozeReminder()
    const expected = now + 3 * 24 * 3600 * 1000
    expect(mockStore['giao-ly-backup-snooze']).toBe(String(expected))
  })

  // ─── exportBackup ───

  it('should export backup with folder write success', async () => {
    vi.spyOn(storage, 'exportAll' as any).mockResolvedValue('{"version":6,"classes":[]}')
    vi.spyOn(storage, 'getState' as any).mockResolvedValue({ classes: [] })
    vi.spyOn(backupService as any, 'writeBackupToFolder').mockResolvedValue({ ok: true, folderName: 'backups' })
    const notifySpy = vi.spyOn(notification, 'show').mockImplementation(() => {})

    const result = await backupService.exportBackup()
    expect(result).toBe(true)
    expect(notifySpy).toHaveBeenCalled()
  })

  it('should prompt folder picker on first export when no folder attached', async () => {
    vi.spyOn(storage, 'exportAll' as any).mockResolvedValue('{}')
    vi.spyOn(storage, 'getState' as any).mockResolvedValue({ classes: [] })
    vi.spyOn(backupService as any, 'writeBackupToFolder').mockResolvedValue({ ok: false, reason: 'no-folder' })
    vi.spyOn(backupService, 'canUseBackupFolder' as any).mockReturnValue(true)
    vi.spyOn(notification, 'confirm' as any).mockResolvedValue(true)
    vi.spyOn(backupService, 'pickBackupFolder' as any).mockResolvedValue({ name: 'picked' })
    vi.spyOn(backupService as any, 'writeBackupToFolder').mockResolvedValueOnce({ ok: false, reason: 'no-folder' })
      .mockResolvedValueOnce({ ok: true, folderName: 'picked' })
    const notifySpy = vi.spyOn(notification, 'show').mockImplementation(() => {})

    const result = await backupService.exportBackup()
    expect(result).toBe(true)
    expect(notifySpy).toHaveBeenCalled()
  })

  it('should fallback to download when user cancels folder picker', async () => {
    vi.spyOn(storage, 'exportAll' as any).mockResolvedValue('{}')
    vi.spyOn(storage, 'getState' as any).mockResolvedValue({ classes: [] })
    vi.spyOn(backupService as any, 'writeBackupToFolder').mockResolvedValue({ ok: false, reason: 'no-folder' })
    vi.spyOn(backupService, 'canUseBackupFolder' as any).mockReturnValue(true)
    vi.spyOn(notification, 'confirm' as any).mockResolvedValue(false)
    const fallbackSpy = vi.spyOn(backupService as any, 'fallbackDownload').mockImplementation(() => {})

    const result = await backupService.exportBackup()
    expect(result).toBe(true)
    expect(fallbackSpy).toHaveBeenCalled()
  })

  it('should handle permission re-prompt when folder lacks write permission', async () => {
    vi.spyOn(storage, 'exportAll' as any).mockResolvedValue('{}')
    vi.spyOn(storage, 'getState' as any).mockResolvedValue({ classes: [] })
    vi.spyOn(backupService as any, 'writeBackupToFolder')
      .mockResolvedValueOnce({ ok: false, reason: 'no-permission' })
    vi.spyOn(backupService, 'pickBackupFolder' as any).mockResolvedValue({ name: 'repicked' })
    vi.spyOn(backupService as any, 'writeBackupToFolder')
      .mockResolvedValueOnce({ ok: false, reason: 'no-permission' })
      .mockResolvedValueOnce({ ok: true, folderName: 'repicked' })

    const result = await backupService.exportBackup()
    expect(result).toBe(true)
  })

  it('should handle export error gracefully', async () => {
    vi.spyOn(storage, 'exportAll' as any).mockRejectedValue(new Error('storage error'))
    const notifySpy = vi.spyOn(notification, 'show').mockImplementation(() => {})
    const result = await backupService.exportBackup()
    expect(result).toBe(false)
    expect(notifySpy).toHaveBeenCalledWith(expect.stringContaining('Lỗi sao lưu'), 'error')
  })

  // ─── importBackupFile ───

  it('should import backup file successfully', async () => {
    vi.spyOn(storage, 'importAll' as any).mockResolvedValue({ ok: true })
    const sm = { clearUndoRedo: vi.fn(), init: vi.fn() } as any
    backupService.setStateManager(sm)
    const notifySpy = vi.spyOn(notification, 'show').mockImplementation(() => {})

    const file = new File(['{"state":{"classes":[{"name":"Lớp 1"}]}}'], 'backup.json', { type: 'application/json' })
    const result = await backupService.importBackupFile(file, 'replace')
    expect(result).toBe(true)
    expect(sm.clearUndoRedo).toHaveBeenCalled()
    expect(sm.init).toHaveBeenCalled()
    expect(notifySpy).toHaveBeenCalledWith(expect.stringContaining('1 lớp'), 'success')
  })

  it('should handle import error when storage rejects', async () => {
    vi.spyOn(storage, 'importAll' as any).mockResolvedValue({ ok: false, error: 'Invalid format' })
    const notifySpy = vi.spyOn(notification, 'show').mockImplementation(() => {})
    const file = new File(['bad data'], 'bad.json', { type: 'application/json' })
    const result = await backupService.importBackupFile(file, 'replace')
    expect(result).toBe(false)
    expect(notifySpy).toHaveBeenCalledWith('Invalid format', 'error')
  })

  it('should handle import error when file read fails', async () => {
    vi.spyOn(storage, 'importAll' as any).mockRejectedValue(new Error('parse error'))
    const notifySpy = vi.spyOn(notification, 'show').mockImplementation(() => {})
    const file = new File(['bad data'], 'bad.json', { type: 'application/json' })
    const result = await backupService.importBackupFile(file, 'replace')
    expect(result).toBe(false)
    expect(notifySpy).toHaveBeenCalledWith(expect.stringContaining('parse error'), 'error')
  })

  it('should pick backup folder and show notification on success', async () => {
    const handle = { name: 'my-backups' }
    ;(global as any).window = { showDirectoryPicker: vi.fn().mockResolvedValue(handle) }
    vi.spyOn(storage, 'saveBackupHandle' as any).mockResolvedValue(undefined)
    vi.spyOn(storage, 'isIndexedDBEnabled' as any).mockReturnValue(true)
    const notifySpy = vi.spyOn(notification, 'show').mockImplementation(() => {})

    const result = await backupService.pickBackupFolder()
    expect(result).toBe(handle)
    expect(notifySpy).toHaveBeenCalledWith(expect.stringContaining('my-backups'), 'success')
  })

  it('should handle AbortError in pickBackupFolder gracefully', async () => {
    ;(global as any).window = {
      showDirectoryPicker: vi.fn().mockRejectedValue({ name: 'AbortError' })
    }
    vi.spyOn(storage, 'isIndexedDBEnabled' as any).mockReturnValue(true)
    const result = await backupService.pickBackupFolder()
    expect(result).toBeNull()
  })

  it('should show warning when folder picker is unsupported', async () => {
    ;(global as any).window = {}
    const notifySpy = vi.spyOn(notification, 'show').mockImplementation(() => {})
    const result = await backupService.pickBackupFolder()
    expect(result).toBeNull()
    expect(notifySpy).toHaveBeenCalledWith(expect.stringContaining('Trình duyệt không hỗ trợ'), 'warning')
  })

  // ─── getBackupStatus edge: negative daysAgo ───

  it('should clamp negative daysAgo to 0', () => {
    const futureDate = new Date(Date.now() + 3600000).toISOString()
    const mockMeta: BackupMeta = { lastAt: futureDate, lastFile: 'f.json', count: 1 }
    mockStore['giao-ly-backup-meta-v1'] = JSON.stringify(mockMeta)
    const status = backupService.getBackupStatus()
    expect(status.daysAgo).toBe(0)
  })
})
