import { StateManager } from '../StateManager'
import { AuthManager } from '../../core/auth/AuthManager'
import { SyncManager } from '../../services/sync/SyncManager'
import { NotificationManager } from '../../services/NotificationManager'
import { BackupService } from '../../services/BackupService'
import type { GlAddStudent } from '../views/components/gl-add-student'
import type { GlParentInvite } from '../views/components/gl-parent-invite'

export interface AppModalRegistryOptions {
  stateManager: StateManager
  authManager: AuthManager
  syncManager: SyncManager
  notificationManager: NotificationManager
  backupService: BackupService
}

export class AppModalRegistry {
  private stateManager: StateManager
  private authManager: AuthManager
  private notificationManager: NotificationManager
  private backupService: BackupService

  constructor(options: AppModalRegistryOptions) {
    this.stateManager = options.stateManager
    this.authManager = options.authManager
    this.notificationManager = options.notificationManager
    this.backupService = options.backupService
  }

  async openJournalLog(student: any, classId: string, className: string): Promise<void> {
    const { JournalLogModal } = await import('../views/modals/JournalLogModal')
    const modal = new JournalLogModal(this.stateManager, this.notificationManager, this.authManager)
    modal.open(student, classId, className)
  }

  async openMissingScores(): Promise<void> {
    const { MissingScoresModal } = await import('../views/modals/MissingScoresModal')
    const modal = new MissingScoresModal(this.stateManager, this.notificationManager)
    modal.open()
  }

  async openUserManagement(): Promise<void> {
    const { UserManagementModal } = await import('../views/modals/UserManagementModal')
    const modal = new UserManagementModal(this.authManager, this.notificationManager)
    modal.open()
  }

  async openReports(): Promise<void> {
    const { ReportsModal } = await import('../views/modals/ReportsModal')
    const modal = new ReportsModal(this.stateManager, this.notificationManager)
    modal.open()
  }

  async openHelp(): Promise<void> {
    const { HelpModal } = await import('../views/modals/HelpModal')
    const modal = new HelpModal()
    modal.open()
  }

  async openAddStudent(classId: string): Promise<void> {
    await import('../views/components/gl-add-student')
    let el = document.getElementById('addStudentModal') as GlAddStudent | null
    if (!el) {
      el = document.createElement('gl-add-student') as GlAddStudent
      el.id = 'addStudentModal'
      el.stateManager = this.stateManager
      el.notification = this.notificationManager
      document.body.appendChild(el)
    }
    el.classId = classId
    el.open = true
  }

  async openColumnsModal(classId: string, onSave?: () => void): Promise<void> {
    const { ColumnsModal } = await import('../views/modals/ColumnsModal')
    const modal = new ColumnsModal(this.stateManager, this.notificationManager)
    modal.open(classId, onSave || (() => {}))
  }

  async openParentInvite(classId: string | null): Promise<void> {
    const resolvedClassId = classId || this.stateManager.getState().activeClassId
    if (!resolvedClassId) {
      this.notificationManager.show('Chọn lớp trước', 'warning')
      return
    }
    await import('../views/components/gl-parent-invite')
    let el = document.getElementById('parentInviteModal') as GlParentInvite | null
    if (!el) {
      el = document.createElement('gl-parent-invite') as GlParentInvite
      el.id = 'parentInviteModal'
      el.stateManager = this.stateManager
      el.authManager = this.authManager
      el.notification = this.notificationManager
      document.body.appendChild(el)
    }
    el.classId = resolvedClassId
    el.open = true
  }

  async openThemeModal(): Promise<void> {
    const { ThemeModal } = await import('../views/modals/ThemeModal')
    const modal = new ThemeModal(this.stateManager, this.notificationManager)
    modal.open()
  }

  async openPrintModal(): Promise<void> {
    const { PrintModal } = await import('../views/modals/PrintModal')
    const modal = new PrintModal(this.stateManager, this.notificationManager)
    modal.open()
  }

  async openBulkExport(): Promise<void> {
    const { BulkExportModal } = await import('../views/modals/BulkExportModal')
    const modal = new BulkExportModal(this.stateManager, this.notificationManager)
    modal.open()
  }

  async openBackupModal(onRestoreComplete?: () => void): Promise<void> {
    const { BackupModal } = await import('../views/modals/BackupModal')
    const modal = new BackupModal(this.backupService, this.notificationManager)
    modal.open(onRestoreComplete || (() => {}))
  }

  async openConflict(detail: any): Promise<void> {
    const { ConflictModal } = await import('../views/modals/ConflictModal')
    const modal = new ConflictModal(this.notificationManager)
    modal.open(detail)
  }
}
