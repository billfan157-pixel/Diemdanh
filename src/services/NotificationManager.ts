// ============================================================
// Sổ Điểm GL — Notification Manager
// Toast & Confirmation Dialogs
// ============================================================

export interface ToastOptions {
  type?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export interface ConfirmOptions {
  title?: string
  message: string
  type?: 'confirm' | 'warning' | 'danger' | 'info'
  confirmText?: string
  cancelText?: string
}

export class NotificationManager {
  private container: HTMLElement | null = null
  private toastQueue: HTMLElement[] = []
  private maxToasts = 4
  private dialogResolve: ((value: boolean) => void) | null = null

  constructor() {}

  init(): void {
    this.container = document.getElementById('toastHost')
    if (!this.container) {
      this.container = document.createElement('div')
      this.container.id = 'toastHost'
      this.container.className = 'toast-host'
      document.body.appendChild(this.container)
    }

    this.ensureDialog()
  }

  private ensureDialog(): void {
    if (!document.getElementById('appDialog')) {
      const dialog = document.createElement('div')
      dialog.id = 'appDialog'
      dialog.className = 'dialog-overlay'
      dialog.setAttribute('role', 'dialog')
      dialog.setAttribute('aria-modal', 'true')
      dialog.innerHTML = `
        <div class="dialog-panel">
          <div class="dialog-icon-wrap" id="dialogIconWrap">
            <span class="dialog-icon" id="dialogIcon"></span>
          </div>
          <h3 class="dialog-title" id="dialogTitle">Xác nhận</h3>
          <p class="dialog-message" id="dialogMessage"></p>
          <div class="dialog-actions">
            <button type="button" class="btn btn-ghost" id="dialogCancel">Hủy</button>
            <button type="button" class="btn btn-primary" id="dialogOk">Đồng ý</button>
          </div>
        </div>
      `
      document.body.appendChild(dialog)

      const cancelBtn = document.getElementById('dialogCancel')!
      const okBtn = document.getElementById('dialogOk')!
      const overlay = document.getElementById('appDialog')!

      const closeDialog = (result: boolean) => {
        overlay.classList.add('hidden')
        document.body.style.overflow = ''
        if (this.dialogResolve) {
          this.dialogResolve(result)
          this.dialogResolve = null
        }
      }

      cancelBtn.addEventListener('click', () => closeDialog(false))
      okBtn.addEventListener('click', () => closeDialog(true))
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeDialog(false)
      })

      document.addEventListener('keydown', (e) => {
        if (!overlay.classList.contains('hidden')) {
          if (e.key === 'Escape') closeDialog(false)
          if (e.key === 'Enter') closeDialog(true)
        }
      })
    }
  }

  show(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', options?: Partial<ToastOptions>): void {
    if (!this.container) this.init()

    const toast = this.createToast(message, type, options)
    this.container.appendChild(toast)

    requestAnimationFrame(() => {
      toast.classList.add('show')
    })

    const duration = options?.duration ?? (type === 'error' ? 4200 : 3400)
    if (duration > 0) {
      setTimeout(() => this.dismiss(toast), duration)
    }

    const progress = toast.querySelector('.toast-progress') as HTMLElement
    if (progress && duration > 0) {
      progress.style.transitionDuration = `${duration}ms`
      requestAnimationFrame(() => {
        progress.style.transform = 'scaleX(0)'
      })
    }

    while (this.container.children.length > this.maxToasts) {
      this.dismiss(this.container.firstElementChild as HTMLElement)
    }
  }

  private createToast(message: string, type: 'info' | 'success' | 'warning' | 'error', options?: Partial<ToastOptions>): HTMLElement {
    const meta = {
      info: { icon: 'ℹ️', class: 'toast-info', label: 'Thông báo' },
      success: { icon: '✅', class: 'toast-success', label: 'Thành công' },
      warning: { icon: '⚠️', class: 'toast-warning', label: 'Cảnh báo' },
      error: { icon: '❌', class: 'toast-error', label: 'Lỗi' }
    }[type]

    const toast = document.createElement('div')
    toast.className = `toast-item ${meta.class}`
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status')
    toast.innerHTML = `
      <div class="toast-icon" aria-hidden="true">${meta.icon}</div>
      <div class="toast-body">
        ${options?.title || meta.label ? `<div class="toast-title">${this.escapeHtml(options?.title || meta.label)}</div>` : ''}
        <div class="toast-message">${this.escapeHtml(message)}</div>
      </div>
      <button type="button" class="toast-close" aria-label="Đóng">×</button>
      <div class="toast-progress"></div>
    `

    toast.querySelector('.toast-close')?.addEventListener('click', () => this.dismiss(toast))

    if (options?.action) {
      const actionBtn = document.createElement('button')
      actionBtn.type = 'button'
      actionBtn.className = 'toast-action'
      actionBtn.textContent = options.action.label
      actionBtn.addEventListener('click', () => {
        options.action!.onClick()
        this.dismiss(toast)
      })
      toast.querySelector('.toast-body')?.appendChild(actionBtn)
    }

    return toast
  }

  dismiss(toast: HTMLElement): void {
    if (toast.classList.contains('hiding')) return
    toast.classList.add('hiding')
    setTimeout(() => toast.remove(), 280)
  }

  confirm(message: string, options: ConfirmOptions = {}): Promise<boolean> {
    return new Promise((resolve) => {
      this.dialogResolve = resolve

      const overlay = document.getElementById('appDialog')!
      const iconWrap = document.getElementById('dialogIconWrap')!
      const icon = document.getElementById('dialogIcon')!
      const title = document.getElementById('dialogTitle')!
      const message = document.getElementById('dialogMessage')!
      const okBtn = document.getElementById('dialogOk')!
      const cancelBtn = document.getElementById('dialogCancel')!

      title.textContent = options.title || 'Xác nhận'
      message.textContent = message
      okBtn.textContent = options.confirmText || (options.type === 'danger' ? 'Xóa' : 'Đồng ý')
      cancelBtn.textContent = options.cancelText || 'Hủy'

      const typeConfigs = {
        confirm: { icon: '❓', class: 'dialog-icon-confirm' },
        warning: { icon: '⚠️', class: 'dialog-icon-warning' },
        danger: { icon: '🗑️', class: 'dialog-icon-danger' },
        info: { icon: 'ℹ️', class: 'dialog-icon-info' }
      }[options.type || 'confirm']

      icon.textContent = typeConfigs.icon
      iconWrap.className = `dialog-icon-wrap ${typeConfigs.class}`
      const dialogPanel = overlay.querySelector('.dialog-panel')
      if (dialogPanel) {
        dialogPanel.className = `dialog-panel dialog-type-${options.type || 'confirm'}`
      }

      okBtn.className = 'btn ' + (options.type === 'danger' ? 'btn-danger' : 'btn-primary')

      overlay.classList.remove('hidden')
      document.body.style.overflow = 'hidden'

      setTimeout(() => okBtn.focus(), 30)
    })
  }

  alert(message: string, title = 'Thông báo'): Promise<void> {
    return this.confirm(message, {
      title,
      type: 'info',
      confirmText: 'Đã hiểu',
      cancelText: ''
    }).then(() => {})
  }

  private escapeHtml(s: string): string {
    return String(s)
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '\'')
  }
}