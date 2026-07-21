// ============================================================
// Giao diện (Theme) selection modal (Phase 4.2)
// ============================================================

import { StateManager } from '../../StateManager'
import { NotificationManager } from '../../../services/NotificationManager'
import { createFocusTrap } from '../../../utils/focusTrap.ts'

export class ThemeModal {
  private stateManager: StateManager
  private notification: NotificationManager
  private element: HTMLElement | null = null
  private _focusTrap: ReturnType<typeof createFocusTrap> | null = null

  constructor(stateManager: StateManager, notification: NotificationManager) {
    this.stateManager = stateManager
    this.notification = notification
  }

  open(): void {
    this.ensureModal()
    this.renderOptions()
    this.element?.classList.remove('hidden')
    if (this.element) this._focusTrap = createFocusTrap(this.element)
  }

  close(): void {
    this._focusTrap?.destroy()
    this._focusTrap = null
    this.element?.classList.add('hidden')
  }

  private ensureModal(): void {
    let modal = document.getElementById('themeModal')
    if (!modal) {
      modal = document.createElement('div')
      modal.id = 'themeModal'
      modal.className = 'modal-overlay hidden'
      modal.setAttribute('role', 'dialog')
      modal.setAttribute('aria-modal', 'true')
      modal.innerHTML = `
        <div class="modal-panel max-w-xs">
          <div class="modal-head">
            <div>
              <h3>Giao diện ứng dụng</h3>
              <p class="modal-sub">Chọn chủ đề hiển thị</p>
            </div>
            <button type="button" class="icon-btn modal-close" id="themeModalClose" aria-label="Đóng">×</button>
          </div>
          <div class="modal-body py-4 px-5">
            <div class="d-flex flex-col gap-3" id="themeOptionsList">
            </div>
          </div>
        </div>
      `
      document.body.appendChild(modal)
      modal.querySelector('#themeModalClose')?.addEventListener('click', () => this.close())
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.close()
      })
    }
    this.element = modal
  }

  private renderOptions(): void {
    const list = this.element?.querySelector('#themeOptionsList') as HTMLElement
    if (!list) return

    const current = this.stateManager.getTheme()

    const options: Array<{ key: 'light' | 'dark' | 'system'; label: string; icon: string }> = [
      { key: 'light', label: 'Giao diện Sáng (Light)', icon: '☀️' },
      { key: 'dark', label: 'Giao diện Tối (Dark)', icon: '🌙' },
      { key: 'system', label: 'Mặc định hệ thống', icon: '💻' }
    ]

    list.innerHTML = options.map(opt => `
      <button type="button" class="theme-opt-btn" data-theme-key="${opt.key}" style="display:flex;align-items:center;justify-content:space-between;width:100%;text-align:left;padding:12px 14px;border:1px solid ${opt.key === current ? 'var(--color-primary)' : 'var(--color-border)'};border-radius:8px;background:${opt.key === current ? 'var(--color-primary-soft)' : 'var(--color-bg-elevated)'};cursor:pointer;font-family:inherit;font-size:0.9rem;font-weight:600;color:var(--color-text);transition:all 150ms">
        <div class="d-flex items-center" style="gap:10px">
          <span>${opt.icon}</span>
          <span>${opt.label}</span>
        </div>
        ${opt.key === current ? '<span class="text-primary" style="font-size:1.1rem">✓</span>' : ''}
      </button>
    `).join('')

    list.querySelectorAll('[data-theme-key]').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = (btn as HTMLElement).dataset.themeKey as 'light' | 'dark' | 'system'
        this.stateManager.setTheme(theme)
        this.notification.show('Đã đổi chủ đề giao diện', 'success')
        this.close()
      })
    })
  }
}
