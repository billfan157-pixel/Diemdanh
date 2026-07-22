import type { ReactiveController, ReactiveControllerHost } from 'lit'
import type { StateManager } from '../StateManager'
import type { AuthManager } from '../../core/auth/AuthManager'
import type { SyncManager } from '../../services/sync/SyncManager'
import type { NotificationManager } from '../../services/NotificationManager'

export interface ShellControllerOptions {
  stateManager: StateManager
  authManager: AuthManager
  syncManager: SyncManager
  notificationManager: NotificationManager
  switchView: (view: 'dashboard' | 'class' | 'profile') => void
  selectClass: (classId: string) => void
  updateYearFilterSelect: () => void
  updateClassSelector: () => void
  updateClassList: () => void
  renderCurrentView: () => void
  openJournalLogModal: (student: any, classId: string, className: string) => void
  promptDialog: (title: string, message: string, defaultValue: string) => Promise<string | null>
  getCurrentView: () => 'dashboard' | 'class' | 'profile'
  getActiveClassId: () => string | null
  openAddStudent: () => void
  scrollToStudent: (studentId: string) => void
  getRootElement: () => HTMLElement | null
}

export class ShellController implements ReactiveController {
  private host: (ReactiveControllerHost & HTMLElement) | null
  private options: ShellControllerOptions
  private listeners: Array<{ target: EventTarget; type: string; handler: EventListener }> = []
  private layoutObserver: ResizeObserver | null = null
  private mobileLayout: boolean | null = null
  private lastScrollTop = 0

  constructor(host: (ReactiveControllerHost & HTMLElement) | null, options: ShellControllerOptions) {
    this.host = host
    this.options = options
    if (host) host.addController(this)
  }

  hostConnected(): void {
  }

  hostDisconnected(): void {
    this.detach()
  }

  attach(): void {
    this.bindEvents()
    this.setupLayoutObserver()
    this.setupTopbarScroll()
    this.setupSidebarResizer()
    this.restoreSidebarState()
  }

  detach(): void {
    this.layoutObserver?.disconnect()
    this.layoutObserver = null
    for (const { target, type, handler } of this.listeners) {
      target.removeEventListener(type, handler)
    }
    this.listeners = []
  }

  refreshLayout(): void {
    const root = this.host || this.options.getRootElement()
    if (!root) return
    const mobile = this.isMobileLayout()
    const host = root.querySelector('#mobileShell') as HTMLElement
    if (!host) return
    host.classList.toggle('hidden', !mobile)
    if (mobile) {
      this.updateMobileNavState()
      this.options.updateClassSelector()
    }
  }

  updateSyncUI(status: any): void {
    const root = this.host || this.options.getRootElement()
    const indicator = root?.querySelector('#syncIndicator') as HTMLElement
    if (!indicator) return
    indicator.classList.toggle('hidden', status.status !== 'syncing')
  }

  updateInstallButtonVisibility(): void {
    const root = this.host || this.options.getRootElement()
    const profileView = root?.querySelector('gl-profile-view')
    if (profileView) {
      (profileView as any).requestUpdate()
    }
  }

  updateOfflineBanner(): void {
    const root = this.host || this.options.getRootElement()
    const banner = root?.querySelector('#offlineBanner')
    if (banner) {
      banner.classList.toggle('hidden', navigator.onLine)
    }
  }

  updateMobileNavState(): void {
    const NAV_MAP: Record<string, string> = { home: 'dashboard', classes: 'class', scores: 'class', me: 'profile' }
    const root = this.host || this.options.getRootElement()
    const nav = root?.querySelector('#mBottomNav') as any
    if (!nav) return
    const currentView = this.options.getCurrentView()
    const tabEntry = Object.entries(NAV_MAP).find(([, v]) => v === currentView)
    if (tabEntry) nav.activeTab = tabEntry[0]
  }

  isMobileLayout(): boolean {
    return window.innerWidth <= 900
  }

  openMobileDrawer(): void {
    const root = this.host || this.options.getRootElement()
    root?.querySelector('#sidebar')?.classList.add('open')
    root?.querySelector('#sidebarScrim')?.classList.add('is-open')
  }

  closeMobileDrawer(): void {
    const root = this.host || this.options.getRootElement()
    root?.querySelector('#sidebar')?.classList.remove('open')
    root?.querySelector('#sidebarScrim')?.classList.remove('is-open')
  }

  toggleSidebarCollapse(): void {
    const root = this.host || this.options.getRootElement()
    const appEl = root?.querySelector('#appRoot')
    if (!appEl) return
    const collapsed = appEl.classList.toggle('sidebar-collapsed')
    const side = root?.querySelector('#sidebar')
    side?.classList.toggle('collapsed', collapsed)
    const btn = root?.querySelector('#sidebarCollapseBtn') as HTMLElement
    if (btn) {
      btn.textContent = collapsed ? '▶' : '◀'
      btn.setAttribute('aria-label', collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar')
      btn.setAttribute('title', collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar')
    }
    try { localStorage.setItem('sidebar-collapsed', collapsed ? '1' : '') } catch {}
  }

  private bindEvents(): void {
    const root = this.host || this.options.getRootElement()

    const syncHandler = ((e: CustomEvent) => {
      this.updateSyncUI(e.detail)
    }) as EventListener
    this.options.syncManager.addEventListener('syncstatuschange', syncHandler)
    this.listeners.push({ target: this.options.syncManager, type: 'syncstatuschange', handler: syncHandler })

    const conflictHandler = ((e: Event) => {
      import('../views/modals/ConflictModal').then(({ ConflictModal }) => {
        const modal = new ConflictModal(this.options.notificationManager)
        modal.open((e as CustomEvent).detail)
      }).catch(() => {
        this.options.notificationManager?.show('Không thể mở hộp thoại', 'error')
      })
    }) as EventListener
    this.options.syncManager.addEventListener('conflict', conflictHandler)
    this.listeners.push({ target: this.options.syncManager, type: 'conflict', handler: conflictHandler })

    const remoteChangeHandler = ((e: CustomEvent) => {
      const { className, eventType } = e.detail
      if (!className) return
      const labels: Record<string, string> = {
        INSERT: 'Máy khác vừa thêm lớp',
        UPDATE: 'Máy khác vừa cập nhật',
        DELETE: 'Máy khác vừa xóa lớp',
      }
      this.options.notificationManager?.show(
        `${labels[eventType] || 'Có thay đổi từ xa'} "${className}"`,
        'info',
        { title: 'Đồng bộ', duration: 5000 }
      )
    }) as EventListener
    this.options.syncManager.addEventListener('remote-change', remoteChangeHandler)
    this.listeners.push({ target: this.options.syncManager, type: 'remote-change', handler: remoteChangeHandler })

    const onlineHandler = (() => this.updateOfflineBanner()) as EventListener
    const offlineHandler = (() => this.updateOfflineBanner()) as EventListener
    window.addEventListener('online', onlineHandler)
    window.addEventListener('offline', offlineHandler)
    this.listeners.push({ target: window, type: 'online', handler: onlineHandler })
    this.listeners.push({ target: window, type: 'offline', handler: offlineHandler })
    this.updateOfflineBanner()

    const missingScoresHandler = ((e: CustomEvent) => {
      const { count, classes } = e.detail
      if (!count) return
      this.options.notificationManager?.sendMissingScoreReminder(count, classes)
      this.options.notificationManager?.show(
        `Còn ${count} học viên thiếu điểm trên ${classes.length} lớp`,
        'warning',
        { title: 'Thiếu điểm', duration: 6000 }
      )
    }) as EventListener
    window.addEventListener('gl:missing-scores', missingScoresHandler)
    this.listeners.push({ target: window, type: 'gl:missing-scores', handler: missingScoresHandler })

    const navDashboardHandler = (() => {
      this.options.switchView('dashboard')
    }) as EventListener
    window.addEventListener('gl:nav-dashboard', navDashboardHandler)
    this.listeners.push({ target: window, type: 'gl:nav-dashboard', handler: navDashboardHandler })

    const scrollToStudentHandler = ((e: CustomEvent) => {
      if (this.options.getCurrentView() === 'class') {
        this.options.scrollToStudent(e.detail.studentId)
      }
    }) as EventListener
    window.addEventListener('gl:scroll-to-student', scrollToStudentHandler)
    this.listeners.push({ target: window, type: 'gl:scroll-to-student', handler: scrollToStudentHandler })

    const openJournalHandler = ((e: CustomEvent) => {
      const { student, classId, className } = e.detail
      this.options.openJournalLogModal(student, classId, className)
    }) as EventListener
    window.addEventListener('gl:open-journal', openJournalHandler)
    this.listeners.push({ target: window, type: 'gl:open-journal', handler: openJournalHandler })

    const openPromptHandler = ((e: CustomEvent) => {
      const { title, message, defaultValue, callback } = e.detail
      this.options.promptDialog(title, message, defaultValue ?? '').then(callback as any)
        .catch((e: any) => console.error('Prompt dialog failed:', e))
    }) as EventListener
    window.addEventListener('gl:open-prompt', openPromptHandler)
    this.listeners.push({ target: window, type: 'gl:open-prompt', handler: openPromptHandler })

    const installHandler = () => this.updateInstallButtonVisibility()
    window.addEventListener('gl:install-changed', installHandler)
    this.listeners.push({ target: window, type: 'gl:install-changed', handler: installHandler })

    const pwaUpdateHandler = ((e: CustomEvent) => {
      this.options.notificationManager?.show(
        'Đã có phiên bản mới. Vui lòng làm mới ứng dụng.',
        'info',
        {
          title: 'Cập nhật ứng dụng',
          duration: 0,
          action: {
            label: 'Cập nhật',
            onClick: () => { e.detail.update() },
          },
        }
      )
    }) as EventListener
    window.addEventListener('gl:pwa-update', pwaUpdateHandler)
    this.listeners.push({ target: window, type: 'gl:pwa-update', handler: pwaUpdateHandler })

    const mTopBar = root?.querySelector('#mTopBar')
    const menuToggleHandler = (() => {
      this.openMobileDrawer()
    }) as EventListener
    mTopBar?.addEventListener('gl-menu-toggle', menuToggleHandler)
    if (mTopBar) this.listeners.push({ target: mTopBar, type: 'gl-menu-toggle', handler: menuToggleHandler })

    const mBottomNav = root?.querySelector('#mBottomNav')
    const navChangeHandler = ((e: Event) => {
      const NAV_MAP: Record<string, 'dashboard' | 'class' | 'profile'> = {
        home: 'dashboard', classes: 'class', scores: 'class', me: 'profile',
      }
      const detail = (e as CustomEvent).detail
      if (detail.tabId === 'more') {
        this.openViewMoreSheet()
        return
      }
      const view = NAV_MAP[detail.tabId]
      if (view) this.options.switchView(view)
    }) as EventListener
    mBottomNav?.addEventListener('gl-nav-change', navChangeHandler)
    if (mBottomNav) this.listeners.push({ target: mBottomNav, type: 'gl-nav-change', handler: navChangeHandler })

    const mFabAdd = root?.querySelector('#mFabAdd')
    const fabAddHandler = ((_e: Event) => {
      if (this.options.getCurrentView() === 'class' && this.options.getActiveClassId()) {
        this.options.openAddStudent()
      }
    }) as EventListener
    mFabAdd?.addEventListener('gl-fab-click', fabAddHandler)
    if (mFabAdd) this.listeners.push({ target: mFabAdd, type: 'gl-fab-click', handler: fabAddHandler })

    const mViewMoreSheet = root?.querySelector('#mViewMoreSheet')
    const viewMoreCloseHandler = (() => {
      this.closeViewMoreSheet()
    }) as EventListener
    mViewMoreSheet?.addEventListener('gl-close', viewMoreCloseHandler)
    if (mViewMoreSheet) this.listeners.push({ target: mViewMoreSheet, type: 'gl-close', handler: viewMoreCloseHandler })

    const mClassSelect = root?.querySelector('#mClassSelect')
    const classSelectHandler = ((e: Event) => {
      const target = e.target as HTMLSelectElement
      if (target.value) this.options.selectClass(target.value)
    }) as EventListener
    mClassSelect?.addEventListener('change', classSelectHandler)
    if (mClassSelect) this.listeners.push({ target: mClassSelect, type: 'change', handler: classSelectHandler })
  }

  private setupLayoutObserver(): void {
    this.mobileLayout = this.isMobileLayout()
    let throttleTimer: ReturnType<typeof setTimeout> | null = null
    const onResize = () => {
      if (throttleTimer) return
      throttleTimer = setTimeout(() => {
        throttleTimer = null
        const nowMobile = this.isMobileLayout()
        if (nowMobile !== this.mobileLayout) {
          this.mobileLayout = nowMobile
          this.refreshLayout()
          this.host?.requestUpdate()
        }
      }, 200)
    }
    this.layoutObserver = new ResizeObserver(onResize)
    this.layoutObserver.observe(document.documentElement)
    window.addEventListener('resize', onResize)
    this.listeners.push({ target: window, type: 'resize', handler: onResize as EventListener })
  }

  private setupTopbarScroll(): void {
    const root = this.host || this.options.getRootElement()
    const main = root?.querySelector('#mainContent') as HTMLElement
    if (!main) return
    const onScroll = () => {
      const topbar = root?.querySelector('.m-topbar, gl-topbar') as HTMLElement | null
      if (!topbar) return
      const y = main.scrollTop
      if (y > this.lastScrollTop && y > 60) {
        topbar.classList.add('is-collapsed')
      } else if (y < this.lastScrollTop) {
        topbar.classList.remove('is-collapsed')
      }
      this.lastScrollTop = y
    }
    main.addEventListener('scroll', onScroll, { passive: true })
    this.listeners.push({ target: main, type: 'scroll', handler: onScroll as EventListener })
  }

  private setupSidebarResizer(): void {
    if (window.innerWidth < 1024) return
    const root = this.host || this.options.getRootElement()
    const sidebar = root?.querySelector('#sidebar') as HTMLElement
    if (!sidebar) return
    if (sidebar.querySelector('.sidebar-resizer')) return

    const resizer = document.createElement('div')
    resizer.className = 'sidebar-resizer'
    sidebar.appendChild(resizer)
    sidebar.style.position = 'relative'

    let saved: string | null = null
    try { saved = localStorage.getItem('sidebar-width') } catch {}
    if (saved) {
      const w = parseInt(saved, 10)
      if (w >= 64 && w <= 400) {
        sidebar.style.width = w + 'px'
        sidebar.style.flex = 'none'
      }
    }

    let startX = 0
    let startWidth = 0
    resizer.addEventListener('mousedown', (e) => {
      e.preventDefault()
      startX = e.clientX
      startWidth = sidebar.offsetWidth
      resizer.classList.add('is-resizing')

      const onMouseMove = (e2: MouseEvent) => {
        const delta = e2.clientX - startX
        const newWidth = Math.max(64, Math.min(400, startWidth + delta))
        sidebar.style.width = `${newWidth}px`
        sidebar.style.flex = 'none'
      }

      const onMouseUp = () => {
        resizer.classList.remove('is-resizing')
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        localStorage.setItem('sidebar-width', String(sidebar.offsetWidth))
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    })
  }

  private restoreSidebarState(): void {
    const root = this.host || this.options.getRootElement()
    const appEl = root?.querySelector('#appRoot')
    if (!appEl) return
    try {
      const saved = localStorage.getItem('sidebar-collapsed')
      if (saved === '1' && window.innerWidth > 900) {
        appEl.classList.add('sidebar-collapsed')
        const side = root?.querySelector('#sidebar')
        side?.classList.add('collapsed')
        const btn = root?.querySelector('#sidebarCollapseBtn') as HTMLElement
        if (btn) {
          btn.textContent = '▶'
          btn.setAttribute('aria-label', 'Mở rộng sidebar')
          btn.setAttribute('title', 'Mở rộng sidebar')
        }
      }

      const restoreAccordion = (accordionId: string, toggleId: string, key: string) => {
        const savedState = localStorage.getItem(key)
        const accordion = root?.querySelector(`#${accordionId}`)
        const toggle = root?.querySelector(`#${toggleId}`)
        if (savedState === '0') {
          accordion?.classList.remove('open')
          toggle?.setAttribute('aria-expanded', 'false')
        } else if (savedState === '1' || savedState === null) {
          accordion?.classList.add('open')
          toggle?.setAttribute('aria-expanded', 'true')
        }
      }
      restoreAccordion('classesAccordion', 'classesToggle', 'classes-accordion-open')
      restoreAccordion('dataAccordion', 'dataToggle', 'data-accordion-open')
      restoreAccordion('academicAccordion', 'academicToggle', 'academic-accordion-open')
      restoreAccordion('systemAccordion', 'systemToggle', 'system-accordion-open')
      restoreAccordion('recentClassesSection', 'recentClassesToggle', 'recent-accordion-open')

      const savedDensity = localStorage.getItem('app-density') || 'comfortable'
      document.body.classList.remove('density-compact', 'density-spacious')
      if (savedDensity !== 'comfortable') {
        document.body.classList.add(`density-${savedDensity}`)
      }
    } catch {}
  }

  openViewMoreSheet(): void {
    const root = this.host || this.options.getRootElement()
    const sheet = root?.querySelector('#mViewMoreSheet') as any
    if (sheet) sheet.open = true
    document.body.style.overflow = 'hidden'
  }

  closeViewMoreSheet(): void {
    const root = this.host || this.options.getRootElement()
    const sheet = root?.querySelector('#mViewMoreSheet') as any
    if (sheet) sheet.open = false
    document.body.style.overflow = ''
  }
}
