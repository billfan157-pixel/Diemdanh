// ============================================================
// Sổ Điểm GL — Backup & Restore Modal Component
// ============================================================

import { BackupService } from '../../../services/BackupService'
import { NotificationManager } from '../../../services/NotificationManager'
import { createFocusTrap } from '../../../utils/focusTrap.ts'

export class BackupModal {
  private backupService: BackupService
  private notification: NotificationManager
  private element: HTMLElement | null = null
  private onRestoreCallback: (() => void) | null = null
  private _focusTrap: ReturnType<typeof createFocusTrap> | null = null

  constructor(backupService: BackupService, notification: NotificationManager) {
    this.backupService = backupService
    this.notification = notification
  }

  open(onRestore: () => void): void {
    this.onRestoreCallback = onRestore
    this.ensureModalElement()
    this.element?.classList.remove('hidden')
    if (this.element) this._focusTrap = createFocusTrap(this.element)
    this.updateFolderUI()
    this.updateStatusUI()
  }

  close(): void {
    this._focusTrap?.destroy()
    this._focusTrap = null
    this.element?.classList.add('hidden')
  }

  private ensureModalElement(): void {
    let modal = document.getElementById('backupModal')
    if (!modal) {
      modal = document.createElement('div')
      modal.id = 'backupModal'
      modal.className = 'modal-overlay hidden'
      modal.setAttribute('role', 'dialog')
      modal.setAttribute('aria-modal', 'true')

      modal.innerHTML = `
        <div class="modal-panel modal-panel-sm">
          <div class="modal-head">
            <div>
              <h3>Sao lưu &amp; Khôi phục</h3>
              <p class="modal-sub" id="backupModalSub">Lưu file JSON trên thiết bị để đề phòng sự cố</p>
            </div>
            <button type="button" class="icon-btn modal-close" id="backupModalClose" aria-label="Đóng">×</button>
          </div>
          <div class="modal-body">
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
              <button type="button" class="btn btn-success py-2 px-3 font-medium" id="backupExportBtn">Sao lưu ngay</button>
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
              <button type="button" class="btn btn-primary py-2 px-3 font-medium" id="backupImportBtn">Chọn file &amp; Khôi phục</button>
            </div>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn btn-ghost ml-auto" id="backupModalDone">Đóng</button>
          </div>
        </div>
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
    
    // Reset classes
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
          <button type="button" class="btn btn-ghost btn-sm py-1 px-2" id="backupFolderChangeBtn" style="font-size: 0.8rem;">Thay đổi</button>
          <button type="button" class="btn btn-ghost btn-sm text-danger py-1 px-2" id="backupFolderClearBtn" style="font-size: 0.8rem;">Hủy liên kết</button>
        </div>
      `
    } else {
      folderStatusEl.innerHTML = `
        <button type="button" class="btn btn-primary btn-sm py-1 px-2" id="backupFolderPickBtn" style="font-size: 0.8rem;">Gắn thư mục sao lưu</button>
      `
    }

    // Bind dynamic folder buttons
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
    const closeBtn = modal.querySelector('#backupModalClose')
    const doneBtn = modal.querySelector('#backupModalDone')
    const exportBtn = modal.querySelector('#backupExportBtn')
    const importBtn = modal.querySelector('#backupImportBtn')
    const importFile = modal.querySelector('#backupImportFile') as HTMLInputElement
    const restoreModeSelect = modal.querySelector('#backupRestoreMode') as HTMLSelectElement

    closeBtn?.addEventListener('click', () => this.close())
    doneBtn?.addEventListener('click', () => this.close())

    exportBtn?.addEventListener('click', async () => {
      const btn = exportBtn as HTMLButtonElement
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

      // Reset input value to allow selecting same file again
      importFile.value = ''
    })
  }
}
