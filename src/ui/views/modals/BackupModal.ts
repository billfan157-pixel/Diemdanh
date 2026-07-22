import { BackupService } from '../../../services/BackupService'
import { NotificationManager } from '../../../services/NotificationManager'

export class BackupModal {
  private backupService: BackupService
  private notification: NotificationManager
  private element: HTMLElement | null = null
  private onRestoreCallback: (() => void) | null = null

  constructor(backupService: BackupService, notification: NotificationManager) {
    this.backupService = backupService
    this.notification = notification
  }

  open(onRestore: () => void): void {
    this.onRestoreCallback = onRestore
    this.ensureModalElement()
    const modal = this.element as any
    if (modal) { modal.open = true }
    this.updateFolderUI()
    this.updateStatusUI()
  }

  close(): void {
    const modal = this.element as any
    if (modal) { modal.open = false }
  }

  private ensureModalElement(): void {
    let modal = document.getElementById('backupModal')
    if (!modal) {
      modal = document.createElement('gl-modal')
      modal.id = 'backupModal'
      modal.setAttribute('heading', 'Sao lưu & Khôi phục')
      modal.setAttribute('size', 'sm')

      modal.innerHTML = `
        <p class="hint mb-3 font-bold" id="backupModalStatus"></p>
        <div class="io-box mb-3 border p-3 rounded-sm">
          <h4 class="mt-0 mb-2">📁 Thư mục sao lưu</h4>
          <p class="hint mb-2 text-secondary" style="font-size: 0.85rem">
            Chọn một thư mục trên máy (vd: <code>tinh-diem/backups</code>) để lưu tự động.
          </p>
          <div id="backupFolderStatus" class="hint my-2" style="font-size: 0.85rem;"></div>
        </div>
        <div class="io-box mb-3 border p-3 rounded-sm">
          <h4 class="mt-0 mb-2">💾 Tạo bản sao lưu</h4>
          <p class="hint mb-2 text-secondary" style="font-size: 0.85rem">
            Xuất toàn bộ lớp, học viên, và thông tin xác thực ra file JSON.
          </p>
          <gl-button variant="success" id="backupExportBtn">Sao lưu ngay</gl-button>
        </div>
        <div class="io-box border p-3 rounded-sm">
          <h4 class="mt-0 mb-2">♻️ Khôi phục dữ liệu</h4>
          <p class="hint mb-2 text-secondary" style="font-size: 0.85rem">
            Nạp lại dữ liệu từ file JSON sao lưu.
          </p>
          <select id="backupRestoreMode" class="input mb-2 w-full py-1 px-2" style="height: 36px;">
            <option value="replace">Thay thế toàn bộ dữ liệu hiện tại</option>
            <option value="merge">Gộp học viên trùng tên vào lớp cũ</option>
          </select>
          <input type="file" id="backupImportFile" accept=".json,application/json" class="hidden" />
          <gl-button variant="primary" id="backupImportBtn">Chọn file & Khôi phục</gl-button>
        </div>
        <gl-button slot="footer" variant="ghost" id="backupModalDone">Đóng</gl-button>
      `
      document.body.appendChild(modal)
      this.bindEvents(modal)
    }
    this.element = modal
  }

  private updateStatusUI(): void {
    const statusEl = this.element?.querySelector('#backupModalStatus') as HTMLElement | null
    if (!statusEl) return

    const status = this.backupService.getBackupStatus()
    statusEl.textContent = status.label
    statusEl.className = 'hint'
    if (status.level === 'danger') {
      statusEl.style.color = 'var(--color-danger)'
    } else if (status.level === 'warn') {
      statusEl.style.color = 'var(--color-gold)'
    } else {
      statusEl.style.color = 'var(--color-success)'
    }
  }

  private updateFolderUI(): void {
    const folderStatusEl = this.element?.querySelector('#backupFolderStatus')
    if (!folderStatusEl) return

    const meta = this.backupService.getBackupMeta()
    const supported = this.backupService.canUseBackupFolder()

    if (!supported) {
      folderStatusEl.innerHTML = `
        <span class="text-muted">
          Trình duyệt không hỗ trợ chọn thư mục (hãy dùng Chrome/Edge). File sao lưu sẽ tải về thư mục Tải xuống của máy.
        </span>
      `
      return
    }

    if (meta.folderName) {
      folderStatusEl.innerHTML = `
        <span>Thư mục đã chọn: <strong>${meta.folderName}</strong></span>
        <div class="mt-2">
          <gl-button variant="ghost" size="sm" id="backupFolderChangeBtn" style="font-size: 0.8rem;">Thay đổi</gl-button>
          <gl-button variant="ghost" size="sm" id="backupFolderClearBtn" class="text-danger" style="font-size: 0.8rem;">Hủy liên kết</gl-button>
        </div>
      `
    } else {
      folderStatusEl.innerHTML = `
        <gl-button variant="primary" size="sm" id="backupFolderPickBtn" style="font-size: 0.8rem;">Gắn thư mục sao lưu</gl-button>
      `
    }

    const pickBtn = folderStatusEl.querySelector('#backupFolderPickBtn')
    const changeBtn = folderStatusEl.querySelector('#backupFolderChangeBtn')
    const clearBtn = folderStatusEl.querySelector('#backupFolderClearBtn')

    pickBtn?.addEventListener('click', async () => {
      await this.backupService.pickBackupFolder()
      this.updateFolderUI()
    })

    changeBtn?.addEventListener('click', async () => {
      await this.backupService.pickBackupFolder()
      this.updateFolderUI()
    })

    clearBtn?.addEventListener('click', async () => {
      const confirm = await this.notification.confirm(
        'Ứng dụng sẽ không tự động lưu file vào thư mục này nữa. Khi sao lưu sẽ tải về mục Tải xuống.',
        {
          title: 'Hủy liên kết thư mục?',
          type: 'warning',
          confirmText: 'Hủy liên kết',
          cancelText: 'Hủy'
        }
      )
      if (confirm) {
        await this.backupService.clearBackupDirHandle()
        this.updateFolderUI()
      }
    })
  }

  private bindEvents(modal: HTMLElement): void {
    modal.addEventListener('gl-close', () => this.close())
    const doneBtn = modal.querySelector('#backupModalDone')
    const exportBtn = modal.querySelector('#backupExportBtn')
    const importBtn = modal.querySelector('#backupImportBtn')
    const importFile = modal.querySelector('#backupImportFile') as HTMLInputElement
    const restoreModeSelect = modal.querySelector('#backupRestoreMode') as HTMLSelectElement

    doneBtn?.addEventListener('click', () => this.close())

    exportBtn?.addEventListener('click', async () => {
      const btn = exportBtn as any
      btn.disabled = true
      const originalText = btn.textContent
      btn.textContent = 'Đang sao lưu...'
      try {
        await this.backupService.exportBackup()
        this.updateStatusUI()
        this.updateFolderUI()
      } finally {
        btn.disabled = false
        btn.textContent = originalText
      }
    })

    importBtn?.addEventListener('click', () => {
      importFile?.click()
    })

    importFile?.addEventListener('change', async () => {
      if (!importFile.files || importFile.files.length === 0) return
      const file = importFile.files[0]
      const mode = restoreModeSelect.value as 'replace' | 'merge'

      const confirm = await this.notification.confirm(
        mode === 'replace'
          ? 'CẢNH BÁO: Thao tác này sẽ XÓA TOÀN BỘ lớp học hiện tại và thay thế bằng dữ liệu từ file backup!'
          : 'Dữ liệu học viên từ file backup sẽ được gộp vào các lớp hiện có.',
        {
          title: 'Xác nhận khôi phục?',
          type: 'warning',
          confirmText: 'Khôi phục',
          cancelText: 'Hủy'
        }
      )

      if (confirm) {
        const success = await this.backupService.importBackupFile(file, mode)
        if (success) {
          this.close()
          if (this.onRestoreCallback) this.onRestoreCallback()
        }
      }

      importFile.value = ''
    })
  }
}
