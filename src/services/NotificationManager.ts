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
  message?: string
  type?: 'confirm' | 'warning' | 'danger' | 'info'
  confirmText?: string
  cancelText?: string
}

import { createFocusTrap } from '../utils/focusTrap.ts'

export interface WebNotificationOptions {
  body: string
  icon?: string
  tag?: string
  onClick?: () => void
}

export class NotificationManager {
  private container: HTMLElement | null = null
  private maxToasts = 4
  private dialogResolve: ((value: boolean) => void) | null = null
  private _dialogFocusTrap: ReturnType<typeof createFocusTrap> | null = null
  private _dialogKeyHandler: ((e: KeyboardEvent) => void) | null = null
  private _permissionListeners: Array<(granted: boolean) => void> = []
  private _lastWebNotifTime = 0

  constructor() {}

  get isWebPermissionGranted(): boolean {
    return 'Notification' in window && Notification.permission === 'granted'
  }

  get isWebPermissionDenied(): boolean {
    return 'Notification' in window && Notification.permission === 'denied'
  }

  onWebPermissionChange(fn: (granted: boolean) => void): () => void {
    this._permissionListeners.push(fn)
    return () => {
      const i = this._permissionListeners.indexOf(fn)
      if (i !== -1) this._permissionListeners.splice(i, 1)
    }
  }

  async requestWebPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied') return false

    const result = await Notification.requestPermission()
    const granted = result === 'granted'
    for (const fn of this._permissionListeners) fn(granted)
    return granted
  }

  sendWebNotification(title: string, options?: WebNotificationOptions): void {
    if (!this.isWebPermissionGranted) return
    const notif = new Notification(title, {
      body: options?.body,
      icon: options?.icon || '/icon.svg',
      tag: options?.tag,
      silent: true
    })
    if (options?.onClick) {
      notif.onclick = () => {
        window.focus()
        notif.close()
        options.onClick!()
      }
    }
    setTimeout(() => notif.close(), 8000)
  }

  sendMissingScoreReminder(count: number, classNames: string[]): void {
    const now = Date.now()
    if (now - this._lastWebNotifTime < 60000) return
    this._lastWebNotifTime = now

    const title = 'Thiếu điểm học viên'
    const body = classNames.length <= 3
      ? `Lớp ${classNames.join(', ')} còn ${count} học viên thiếu điểm.`
      : `Còn ${count} học viên thiếu điểm trên ${classNames.length} lớp.`

    this.sendWebNotification(title, {
      body,
      tag: 'missing-scores',
      onClick: () => {
        window.dispatchEvent(new CustomEvent('gl:nav-dashboard'))
      }
    })
  }

  sendRemoteChangeNotification(className: string, changeType: string): void {
    const labels: Record<string, string> = {
      INSERT: 'được thêm',
      UPDATE: 'được cập nhật',
      DELETE: 'bị xóa'
    }
    this.show(
      `Máy khác vừa ${labels[changeType] || 'cập nhật'} lớp "${className}"`,
      'info',
      { title: 'Đồng bộ', duration: 5000 }
    )
  }

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
      dialog.className = 'modal-overlay dialog-overlay hidden'
      dialog.setAttribute('role', 'dialog')
      dialog.setAttribute('aria-modal', 'true')
      dialog.setAttribute('aria-labelledby', 'dlgTitle')
      dialog.innerHTML = `
        <div class="dialog-panel">
          <div class="dialog-icon-wrap" id="appDialogIconWrap">
            <span class="dialog-icon" id="appDialogIcon"></span>
          </div>
          <h3 class="dialog-title" id="dlgTitle">Xác nhận</h3>
          <p class="dialog-message" id="appDialogMessage"></p>
          <div class="dialog-actions">
            <button type="button" class="btn btn-ghost" id="appDialogCancel">Hủy</button>
            <button type="button" class="btn btn-primary" id="appDialogOk">Đồng ý</button>
          </div>
        </div>
      `
      document.body.appendChild(dialog)

      const cancelBtn = document.getElementById('appDialogCancel')!
      const okBtn = document.getElementById('appDialogOk')!
      const overlay = document.getElementById('appDialog')!

      const closeDialog = (result: boolean) => {
        if (this._dialogKeyHandler) {
          document.removeEventListener('keydown', this._dialogKeyHandler)
          this._dialogKeyHandler = null
        }
        this._dialogFocusTrap?.destroy()
        this._dialogFocusTrap = null
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

      if (!this._dialogKeyHandler) {
        this._dialogKeyHandler = (e: KeyboardEvent) => {
          if (!overlay.classList.contains('hidden')) {
            if (e.key === 'Escape') closeDialog(false)
            if (e.key === 'Enter') {
              e.preventDefault()
              if (document.activeElement !== cancelBtn) {
                closeDialog(true)
              }
            }
          }
        }
        document.addEventListener('keydown', this._dialogKeyHandler)
      }
    }
  }

  show(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', options?: Partial<ToastOptions>): void {
    if (!this.container) this.init()

    const toast = this.createToast(message, type, options)
    this.container!.appendChild(toast)

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

    while (this.container!.children.length > this.maxToasts) {
      this.dismiss(this.container!.firstElementChild as HTMLElement)
    }
  }

  private createToast(message: string, type: 'info' | 'success' | 'warning' | 'error', options?: Partial<ToastOptions>): HTMLElement {
    const meta = {
      info: { icon: 'ℹ️', class: 'toast-info', label: 'Thông báo' },
      success: { icon: '✅', class: 'toast-ok', label: 'Thành công' },
      warning: { icon: '⚠️', class: 'toast-warn', label: 'Cảnh báo' },
      error: { icon: '❌', class: 'toast-err', label: 'Lỗi' }
    }[type]

    const toast = document.createElement('div')
    toast.className = `toast-item ${meta.class}`
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status')
    toast.innerHTML = `
      <div class="toast-icon" aria-hidden="true">${meta.icon}</div>
      <div class="toast-body">
        ${options?.title || meta.label ? `<div class="toast-title">${this.escapeHtml(options?.title || meta.label)}</div>` : ''}
        <div class="toast-msg">${this.escapeHtml(message)}</div>
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
    this.init()
    // Reject previous pending confirm if dialog is already visible
    if (this.dialogResolve) {
      this.dialogResolve(false)
      this.dialogResolve = null
    }
    return new Promise((resolve) => {
      this.dialogResolve = resolve

      const overlay = document.getElementById('appDialog')!
      const iconWrap = document.getElementById('appDialogIconWrap')!
      const icon = document.getElementById('appDialogIcon')!
      const title = document.getElementById('dlgTitle')!
      const messageEl = document.getElementById('appDialogMessage')!
      const okBtn = document.getElementById('appDialogOk')!
      const cancelBtn = document.getElementById('appDialogCancel')!

      title.textContent = options.title || 'Xác nhận'
      messageEl.textContent = message
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
      this._dialogFocusTrap = createFocusTrap(overlay)

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

  /** Re-attach dialog button listeners (call after promptDialog replaces buttons) */
  rebindDialog(): void {
    const overlay = document.getElementById('appDialog')
    if (!overlay) return
    const cancelBtn = document.getElementById('appDialogCancel')!
    const okBtn = document.getElementById('appDialogOk')!
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
  }

  private escapeHtml(s: string): string {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
}