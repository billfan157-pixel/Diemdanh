import { StateManager } from '../../StateManager'
import { NotificationManager } from '../../../services/NotificationManager'

export class ThemeModal {
  private stateManager: StateManager
  private notification: NotificationManager
  private element: HTMLElement | null = null

  constructor(stateManager: StateManager, notification: NotificationManager) {
    this.stateManager = stateManager
    this.notification = notification
  }

  open(): void {
    this.ensureModal()
    this.renderOptions()
    const modal = this.element as any
    if (modal) { modal.open = true }
  }

  close(): void {
    const modal = this.element as any
    if (modal) { modal.open = false }
  }

  private ensureModal(): void {
    let modal = document.getElementById('themeModal')
    if (!modal) {
      modal = document.createElement('gl-modal')
      modal.id = 'themeModal'
      modal.setAttribute('heading', 'Giao diện & Mật độ')
      modal.setAttribute('subtitle', 'Chọn chủ đề và khoảng cách hiển thị')
      modal.setAttribute('size', 'sm')

      modal.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 16px; padding: 10px 0;">
          <div>
            <h4 style="margin: 0 0 10px; font-weight: 750; font-size: 0.95rem; color: var(--color-primary);">Chủ đề hiển thị</h4>
            <div class="d-flex flex-col gap-2" id="themeOptionsList"></div>
          </div>
          <hr style="border: none; border-top: 1px solid var(--color-border); margin: 8px 0;" />
          <div>
            <h4 style="margin: 0 0 10px; font-weight: 750; font-size: 0.95rem; color: var(--color-primary);">Mật độ hiển thị</h4>
            <div class="d-flex flex-col gap-2" id="densityOptionsList"></div>
          </div>
          <hr style="border: none; border-top: 1px solid var(--color-border); margin: 8px 0;" />
          <div>
            <h4 style="margin: 0 0 10px; font-weight: 750; font-size: 0.95rem; color: var(--color-primary);">Màu sắc nhấn</h4>
            <div style="display: flex; gap: 14px; justify-content: center; padding: 4px 0;" id="accentOptionsList"></div>
          </div>
        </div>
      `
      document.body.appendChild(modal)
      modal.addEventListener('gl-close', () => this.close())
    }
    this.element = modal
  }

  private renderOptions(): void {
    const themeList = this.element?.querySelector('#themeOptionsList') as HTMLElement
    const densityList = this.element?.querySelector('#densityOptionsList') as HTMLElement
    if (!themeList || !densityList) return

    const currentTheme = this.stateManager.getTheme()

    const themeOptions: Array<{ key: 'light' | 'dark' | 'system'; label: string; icon: string }> = [
      { key: 'light', label: 'Giao diện Sáng (Light)', icon: '☀️' },
      { key: 'dark', label: 'Giao diện Tối (Dark)', icon: '🌙' },
      { key: 'system', label: 'Mặc định hệ thống', icon: '💻' }
    ]

    themeList.innerHTML = themeOptions.map(opt => `
      <button type="button" class="theme-opt-btn" data-theme-key="${opt.key}" style="display:flex;align-items:center;justify-content:space-between;width:100%;text-align:left;padding:12px 14px;border:1px solid ${opt.key === currentTheme ? 'var(--color-primary)' : 'var(--color-border)'};border-radius:8px;background:${opt.key === currentTheme ? 'var(--color-primary-soft)' : 'var(--color-bg-elevated)'};cursor:pointer;font-family:inherit;font-size:0.9rem;font-weight:600;color:var(--color-text);transition:all 150ms">
        <div class="d-flex items-center" style="gap:10px">
          <span>${opt.icon}</span>
          <span>${opt.label}</span>
        </div>
        ${opt.key === currentTheme ? '<span class="text-primary" style="font-size:1.1rem">✓</span>' : ''}
      </button>
    `).join('')

    themeList.querySelectorAll('[data-theme-key]').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = (btn as HTMLElement).dataset.themeKey as 'light' | 'dark' | 'system'
        this.stateManager.setTheme(theme)
        this.notification.show('Đã đổi chủ đề giao diện', 'success')
        this.close()
      })
    })

    // Render density options
    const currentDensity = localStorage.getItem('app-density') || 'comfortable'
    const densityOptions = [
      { key: 'comfortable', label: 'Tiêu chuẩn (Comfortable)', icon: '📱' },
      { key: 'compact', label: 'Thu gọn (Compact)', icon: '📇' },
      { key: 'spacious', label: 'Rộng rãi (Spacious)', icon: '🖥️' }
    ]

    densityList.innerHTML = densityOptions.map(opt => `
      <button type="button" class="density-opt-btn" data-density-key="${opt.key}" style="display:flex;align-items:center;justify-content:space-between;width:100%;text-align:left;padding:12px 14px;border:1px solid ${opt.key === currentDensity ? 'var(--color-primary)' : 'var(--color-border)'};border-radius:8px;background:${opt.key === currentDensity ? 'var(--color-primary-soft)' : 'var(--color-bg-elevated)'};cursor:pointer;font-family:inherit;font-size:0.9rem;font-weight:600;color:var(--color-text);transition:all 150ms">
        <div class="d-flex items-center" style="gap:10px">
          <span>${opt.icon}</span>
          <span>${opt.label}</span>
        </div>
        ${opt.key === currentDensity ? '<span class="text-primary" style="font-size:1.1rem">✓</span>' : ''}
      </button>
    `).join('')

    densityList.querySelectorAll('[data-density-key]').forEach(btn => {
      btn.addEventListener('click', () => {
        const density = (btn as HTMLElement).dataset.densityKey!
        localStorage.setItem('app-density', density)

        // Apply class to body
        document.body.classList.remove('density-compact', 'density-spacious')
        if (density !== 'comfortable') {
          document.body.classList.add(`density-${density}`)
        }

        this.notification.show('Đã đổi mật độ hiển thị', 'success')
        this.close()
      })
    })
    // Render accent options
    const accentList = this.element?.querySelector('#accentOptionsList') as HTMLElement
    if (accentList) {
      const currentAccent = localStorage.getItem('app-accent') || 'blue'
      const presets = [
        { name: 'blue', primary: '#2563eb', label: 'Xanh' },
        { name: 'purple', primary: '#8b5cf6', label: 'Tím' },
        { name: 'green', primary: '#10b981', label: 'Lục' },
        { name: 'rose', primary: '#f43f5e', label: 'Hồng' },
        { name: 'teal', primary: '#0d9488', label: 'Ngọc' }
      ]
      accentList.innerHTML = presets.map(p => `
        <button type="button" class="accent-opt-btn" data-accent-key="${p.name}" style="background:${p.primary}; border: 3px solid ${p.name === currentAccent ? 'var(--color-text)' : 'transparent'}; width:38px; height:38px; border-radius:50%; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; box-shadow: var(--shadow-sm); transition:transform 120ms;" title="${p.label}" aria-label="Màu ${p.label}">
          ${p.name === currentAccent ? '<span style="color:#fff; font-size:0.9rem; font-weight:bold;">✓</span>' : ''}
        </button>
      `).join('')

      accentList.querySelectorAll('[data-accent-key]').forEach(btn => {
        btn.addEventListener('click', () => {
          const accent = (btn as HTMLElement).dataset.accentKey!
          localStorage.setItem('app-accent', accent)
          this.stateManager.applyTheme() // Re-apply theme color variables
          this.notification.show('Đã đổi màu nhấn giao diện', 'success')
          this.close()
        })
      })
    }
  }
}
