import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BackupService, BackupMeta } from '../../src/services/BackupService'
import { StorageAdapter } from '../../src/services/storage/StorageAdapter'
import { NotificationManager } from '../../src/services/NotificationManager'

// Mock browser dependencies
global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
} as any

describe('BackupService', () => {
  let storage: StorageAdapter
  let notification: NotificationManager
  let backupService: BackupService

  beforeEach(() => {
    vi.clearAllMocks()
    storage = new StorageAdapter()
    notification = new NotificationManager()
    backupService = new BackupService(storage, notification)
  })

  it('should return default metadata when local storage is empty', () => {
    vi.spyOn(global.localStorage, 'getItem').mockReturnValue(null)
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
    vi.spyOn(global.localStorage, 'getItem').mockReturnValue(JSON.stringify(mockMeta))
    const meta = backupService.getBackupMeta()
    expect(meta.lastAt).toBe('2026-07-20T00:00:00.000Z')
    expect(meta.count).toBe(5)
    expect(meta.lastFile).toBe('backup-file.json')
    expect(meta.folderName).toBe('my-backups')
    expect(meta.lastMode).toBe('folder')
  })

  it('should return level danger when there is no backup history', () => {
    vi.spyOn(global.localStorage, 'getItem').mockReturnValue(null)
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
    vi.spyOn(global.localStorage, 'getItem').mockReturnValue(JSON.stringify(mockMeta))
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
    vi.spyOn(global.localStorage, 'getItem').mockReturnValue(JSON.stringify(mockMeta))
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
    vi.spyOn(global.localStorage, 'getItem').mockReturnValue(JSON.stringify(mockMeta))
    const status = backupService.getBackupStatus()
    expect(status.needsRemind).toBe(true)
    expect(status.level).toBe('danger')
  })
})
