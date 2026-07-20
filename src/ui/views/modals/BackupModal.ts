// ============================================================
// Sổ Điểm GL — Backup & Restore Modal Component
// ============================================================

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
    this.element?.classList.remove('hidden')
    this.updateFolderUI()
    this.updateStatusUI()
  }

  close(): void {
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
            <p class="hint" id="backupModalStatus" style="margin:0 0 12px; font-weight: bold;"></p>
            
            <div class="io-box" style="margin-bottom:12px; border: 1px solid var(--color-border); padding: 12px; border-radius: 8px;">
              <h4 style="margin: 0 0 6px;">📁 Thư mục sao lưu</h4>
              <p class="hint" style="margin: 0 0 8px; font-size: 0.85rem; color: var(--color-text-secondary)">
                Chọn một thư mục trên máy (vd: <code>tinh-diem/backups</code>) để lưu tự động.
              </p>
              <div id="backupFolderStatus" class="hint" style="margin:8px 0; font-size: 0.85rem;"></div>
            </div>

            <div class="io-box" style="margin-bottom:12px; border: 1px solid var(--color-border); padding: 12px; border-radius: 8px;">
              <h4 style="margin: 0 0 6px;">💾 Tạo bản sao lưu</h4>
              <p class="hint" style="margin: 0 0 8px; font-size: 0.85rem; color: var(--color-text-secondary)">
                Xuất toàn bộ lớp, học viên, và thông tin xác thực ra file JSON.
              </p>
              <button type="button" class="btn btn-success" id="backupExportBtn" style="padding: 6px 12px; font-weight: 500;">Sao lưu ngay</button>
            </div>

            <div class="io-box" style="border: 1px solid var(--color-border); padding: 12px; border-radius: 8px;">
              <h4 style="margin: 0 0 6px;">♻️ Khôi phục dữ liệu</h4>
              <p class="hint" style="margin: 0 0 8px; font-size: 0.85rem; color: var(--color-text-secondary)">
                Nạp lại dữ liệu từ file JSON sao lưu.
              </p>
              <select id="backupRestoreMode" class="input" style="margin-bottom:8px; width:100%; height: 36px; padding: 4px 8px;">
                <option value="replace">Thay thế toàn bộ dữ liệu hiện tại</option>
                <option value="merge">Gộp học viên trùng tên vào lớp cũ</option>
              </select>
              <input type="file" id="backupImportFile" accept=".json,application/json" class="hidden" />
              <button type="button" class="btn btn-primary" id="backupImportBtn" style="padding: 6px 12px; font-weight: 500;">Chọn file &amp; Khôi phục</button>
            </div>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn btn-ghost" id="backupModalDone" style="margin-left: auto;">Đóng</button>
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
        <span style="color: var(--color-text-muted)">
          Trình duyệt không hỗ trợ chọn thư mục (hãy dùng Chrome/Edge). File sao lưu sẽ tải về thư mục Tải xuống của máy.
        </span>
      `
      return
    }

    if (meta.folderName) {
      folderStatusEl.innerHTML = `
        <span>Thư mục đã chọn: <strong>${meta.folderName}</strong></span>
        <div style="margin-top: 6px;">
          <button type="button" class="btn btn-ghost btn-sm" id="backupFolderChangeBtn" style="padding: 2px 8px; font-size: 0.8rem;">Thay đổi</button>
          <button type="button" class="btn btn-ghost btn-sm" id="backupFolderClearBtn" style="padding: 2px 8px; font-size: 0.8rem; color: var(--color-danger)">Hủy liên kết</button>
        </div>
      `
    } else {
      folderStatusEl.innerHTML = `
        <button type="button" class="btn btn-primary btn-sm" id="backupFolderPickBtn" style="padding: 4px 10px; font-size: 0.8rem;">Gắn thư mục sao lưu</button>
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
