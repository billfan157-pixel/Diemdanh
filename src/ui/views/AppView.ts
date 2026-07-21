// ============================================================
// Sổ Điểm GL — Main App View Layout Controller
// ============================================================

import { StateManager } from '../StateManager'
import { AuthManager } from '../../core/auth/AuthManager'
import { SyncManager } from '../../services/sync/SyncManager'
import { NotificationManager } from '../../services/NotificationManager'
import { BackupService } from '../../services/BackupService'
import { resolveClassColumns } from '../../config/constants.ts'
import { fmt, parseCSV } from '../../views/helpers.ts'
import { studentTBContext } from '../../core/calc.ts'
import { supabaseService } from '../../services/SupabaseClient.ts'
import { triggerInstall } from '../../services/PWAInstall.ts'
import { buildParishDashboard, downloadTextFile, buildParishReportCsv, printParishReport } from '../../features/parishReport.ts'
import { compareYears } from '../../features/years.ts'
import { createFocusTrap } from '../../utils/focusTrap.ts'
import { BulkExportModal } from './modals/BulkExportModal'
import { JournalLogModal } from './modals/JournalLogModal'
import { MissingScoresModal } from './modals/MissingScoresModal'
import { UserManagementModal } from './modals/UserManagementModal'
import { ReportsModal } from './modals/ReportsModal'
import { HelpModal } from './modals/HelpModal'

import { DashboardView } from './DashboardView'
import { ClassView } from './ClassView'
import { ProfileView } from './ProfileView'

export class AppView {
  private stateManager: StateManager
  private authManager: AuthManager
  private syncManager: SyncManager
  private notificationManager: NotificationManager
  private backupService: BackupService

  private element: HTMLElement | null = null
  private currentView: 'dashboard' | 'class' | 'profile' = 'dashboard'
  private activeClassId: string | null = null
  private _unsubState: (() => void) | null = null
  private bulkClassMode = false
  private selectedClasses: Set<string> = new Set()
  private _listeners: Array<{ target: EventTarget; type: string; handler: EventListener }> = []
  private _mobileLayout: boolean | null = null
  private _layoutObserver: ResizeObserver | null = null
  private _lastScrollTop = 0

  // Sub-views
  private dashboardView: DashboardView
  private classView: ClassView
  private profileView: ProfileView

  // Modals
  private journalLogModal: JournalLogModal | null = null
  private missingScoresModal: MissingScoresModal | null = null
  private userManagementModal: UserManagementModal | null = null
  private reportsModal: ReportsModal | null = null
  private helpModal: HelpModal | null = null

  constructor(
    stateManager: StateManager,
    authManager: AuthManager,
    syncManager: SyncManager,
    notificationManager: NotificationManager,
    backupService: BackupService
  ) {
    this.stateManager = stateManager
    this.authManager = authManager
    this.syncManager = syncManager
    this.notificationManager = notificationManager
    this.backupService = backupService

    // Initialize sub-views
    this.dashboardView = new DashboardView(
      stateManager,
      authManager,
      (classId: string) => this.selectClass(classId),
      () => this.toggleArchiveCurrentYear(),
      () => this.openYearCompare(),
      () => this.exportParishReport()
    )

    this.classView = new ClassView(
      stateManager,
      authManager,
      notificationManager
    )

    this.profileView = new ProfileView(
      stateManager,
      authManager,
      (action) => this.handleProfileAct(action)
    )
  }

  render(): HTMLElement {
    const element = document.createElement('div')
    element.id = 'appRoot'
    element.className = 'app'
    element.innerHTML = this.getTemplate()
    this.element = element
    return element
  }

  bindEvents(): void {
    if (!this.element) return

    // Mobile shell (lazy-rendered)
    this.bindMobileShellEvents()

    // Classes accordion toggle
    const classesToggle = this.element.querySelector('#classesToggle')
    classesToggle?.addEventListener('click', () => {
      const accordion = this.element?.querySelector('#classesAccordion')
      if (!accordion) return
      const isOpen = accordion.classList.toggle('open')
      classesToggle.setAttribute('aria-expanded', String(isOpen))
    })

    // Bulk class select mode triggers
    const toggleBulkBtn = this.element.querySelector('#btnToggleBulkClass')
    toggleBulkBtn?.addEventListener('click', () => {
      this.bulkClassMode = !this.bulkClassMode
      if (!this.bulkClassMode) {
        this.selectedClasses.clear()
      }
      this.updateClassList()
    })

    const bulkDelBtn = this.element.querySelector('#btnBulkDelClass')
    bulkDelBtn?.addEventListener('click', async () => {
      if (this.selectedClasses.size === 0) return
      
      const names = Array.from(this.selectedClasses).map(id => {
        return this.stateManager.getClass(id)?.name || id
      }).join(', ')
      
      const ok = await this.notificationManager.confirm(`Xóa ${this.selectedClasses.size} lớp đã chọn (${names}) và toàn bộ điểm học viên?\n\nCó thể Hoàn tác (Ctrl+Z) trong phiên này.`, {
        title: 'Xóa nhiều lớp?',
        type: 'danger',
        confirmText: 'Xóa',
        cancelText: 'Hủy'
      })
      
      if (ok) {
        for (const id of this.selectedClasses) {
          this.stateManager.deleteClass(id)
        }
        this.notificationManager.show(`Đã xóa ${this.selectedClasses.size} lớp.`)
        this.bulkClassMode = false
        this.selectedClasses.clear()
        this.updateClassList()
      }
    })

    // Class list click delegation (select, rename, delete)
    const classList = this.element.querySelector('#classList')

    // Listen for checkbox changes in bulk select mode
    classList?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement
      if (target.classList.contains('class-bulk-select')) {
        const id = target.dataset.classId!
        if (target.checked) {
          this.selectedClasses.add(id)
        } else {
          this.selectedClasses.delete(id)
        }
        this.updateBulkClassDelBtn()
      }
    })

    classList?.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement
      
      // Delete class
      const delBtn = target.closest('[data-del-class]')
      if (delBtn) {
        e.stopPropagation()
        const id = delBtn.getAttribute('data-del-class')!
        const cls = this.stateManager.getClass(id)
        if (!cls) return
        
        const ok = await this.notificationManager.confirm(`Xóa lớp "${cls.name}" và toàn bộ điểm học viên?\n\nCó thể Hoàn tác (Ctrl+Z) trong phiên này.`, {
          title: 'Xóa lớp?',
          type: 'danger',
          confirmText: 'Xóa',
          cancelText: 'Hủy'
        })
        if (ok) {
          this.stateManager.deleteClass(id)
          this.notificationManager.show('Đã xóa lớp.')
        }
        return
      }

      // Rename class
      const renameBtn = target.closest('[data-rename-class]')
      if (renameBtn) {
        e.stopPropagation()
        const id = renameBtn.getAttribute('data-rename-class')!
        const cls = this.stateManager.getClass(id)
        if (!cls) return
        
        const newName = await this.promptDialog('Đổi tên lớp', 'Nhập tên mới:', cls.name)
        if (newName) {
          this.stateManager.updateClass(id, { name: newName })
          this.notificationManager.show('Đã đổi tên lớp.')
        }
        return
      }

      // Select class
      const selectClass = target.closest('[data-select-class]')
      if (selectClass) {
        const id = selectClass.getAttribute('data-select-class')!
        
        if (this.bulkClassMode) {
          e.preventDefault()
          e.stopPropagation()
          this.toggleClassSelection(id)
          return
        }

        this.selectClass(id)
        this.closeMobileDrawer()
      }
    })

    // Create class in sidebar
    const createClassBtn = this.element.querySelector('#createClassBtn')
    createClassBtn?.addEventListener('click', () => {
      const nameInput = this.element!.querySelector('#newClassName') as HTMLInputElement
      const yearInput = this.element!.querySelector('#newClassYear') as HTMLInputElement
      const name = nameInput.value.trim()
      const year = yearInput.value.trim()

      if (!name) {
        this.notificationManager.show('Vui lòng nhập tên lớp', 'error')
        return
      }

      const newId = this.stateManager.createClass(name, year)
      nameInput.value = ''
      yearInput.value = ''
      this.notificationManager.show('Đã tạo lớp thành công', 'success')
      this.selectClass(newId)
    })

    // Mobile sidebar drawer — bound in bindMobileShellEvents()

    // Desktop sidebar collapse toggle
    const collapseBtn = this.element.querySelector('#sidebarCollapseBtn')
    collapseBtn?.addEventListener('click', () => this.toggleSidebarCollapse())

    // Sidebar Year filter select
    const yearSelect = this.element.querySelector('#yearFilterSelect') as HTMLSelectElement
    yearSelect?.addEventListener('change', () => {
      const v = yearSelect.value
      this.stateManager.setYearFilter(v || null)
      this.renderCurrentView()
    })

    // Sidebar tool buttons
    this.element.querySelector('#openDashboardBtn')?.addEventListener('click', () => {
      this.switchView('dashboard')
      this.closeMobileDrawer()
    })
    this.element.querySelector('#exportBtn')?.addEventListener('click', () => this.exportClassScores())
    this.element.querySelector('#bulkExportBtn')?.addEventListener('click', () => this.openBulkExportModal())
    this.element.querySelector('#importBtn')?.addEventListener('click', () => this.importClassScores())
    this.element.querySelector('#reportsBtn')?.addEventListener('click', () => this.openReportsModal())
    this.element.querySelector('#inviteBtn')?.addEventListener('click', () => this.openParentInvite())
    this.element.querySelector('#missingScoresBtn')?.addEventListener('click', () => this.openMissingScoresModal())
    this.element.querySelector('#usersBtn')?.addEventListener('click', () => this.openUserManagementModal())
    this.element.querySelector('#backupBtn')?.addEventListener('click', () => this.openBackupModal())
    this.element.querySelector('#settingsBtn')?.addEventListener('click', () => this.openSettingsModal())
    this.element.querySelector('#helpBtn')?.addEventListener('click', () => this.openHelpModal())

    // Mobile view-more sheet — bound in bindMobileShellEvents()

    // Custom events on window (for decoupled communication between views)
    const scrollToStudentHandler = ((e: CustomEvent) => {
      if (this.currentView === 'class') {
        this.classView.scrollToStudent(e.detail.studentId)
      }
    }) as EventListener
    window.addEventListener('gl:scroll-to-student', scrollToStudentHandler)
    this._listeners.push({ target: window, type: 'gl:scroll-to-student', handler: scrollToStudentHandler })

    const openJournalHandler = ((e: CustomEvent) => {
      const { student, classId, className } = e.detail
      this.openJournalLogModal(student, classId, className)
    }) as EventListener
    window.addEventListener('gl:open-journal', openJournalHandler)
    this._listeners.push({ target: window, type: 'gl:open-journal', handler: openJournalHandler })

    const openPromptHandler = ((e: CustomEvent) => {
      const { title, message, defaultValue, callback } = e.detail
      this.promptDialog(title, message, defaultValue).then(callback).catch(e => console.error('Prompt dialog failed:', e))
    }) as EventListener
    window.addEventListener('gl:open-prompt', openPromptHandler)
    this._listeners.push({ target: window, type: 'gl:open-prompt', handler: openPromptHandler })

    // Listen for PWA install state
    const installHandler = () => this.updateInstallButtonVisibility()
    window.addEventListener('gl:install-changed', installHandler)
    this._listeners.push({ target: window, type: 'gl:install-changed', handler: installHandler })
    this.updateInstallButtonVisibility()

    // Listen for state changes (StateManager subscribe)
    this._unsubState = this.stateManager.subscribe(() => {
      this.updateClassList()
      this.updateClassSelector()
      if (this.currentView === 'class') {
        const titleEl = this.element?.querySelector('#mTopTitle')
        if (titleEl) titleEl.textContent = this.getActiveClassName() || 'Điểm'
        this.classView.onStateChange()
      } else {
        this.renderCurrentView()
      }
    })

    // Listen for sync status changes
    const syncHandler = ((e: CustomEvent) => {
      this.updateSyncUI(e.detail)
    }) as EventListener
    this.syncManager.addEventListener('syncstatuschange', syncHandler)
    this._listeners.push({ target: this.syncManager, type: 'syncstatuschange', handler: syncHandler })

    // Listen for sync conflicts
    const conflictHandler = ((e: Event) => {
      import('./modals/ConflictModal').then(({ ConflictModal }) => {
        const modal = new ConflictModal(this.notificationManager)
        modal.open((e as CustomEvent).detail)
      }).catch(e => {
        this.notificationManager?.show('Không thể mở hộp thoại', 'error')
        console.error('Failed to load ConflictModal:', e)
      })
    }) as EventListener
    this.syncManager.addEventListener('conflict', conflictHandler)
    this._listeners.push({ target: this.syncManager, type: 'conflict', handler: conflictHandler })

    // Keyboard shortcuts
    const keydownHandler = (e: Event) => {
      const ke = e as KeyboardEvent
      const isInput = ke.target instanceof HTMLInputElement || ke.target instanceof HTMLTextAreaElement || ke.target instanceof HTMLSelectElement || (ke.target instanceof HTMLElement && ke.target.isContentEditable)
      if (isInput && ke.key !== 'Escape') return

      if (ke.ctrlKey || ke.metaKey) {
        switch (ke.key.toLowerCase()) {
          case 'z':
            ke.preventDefault()
            if (ke.shiftKey) {
              if (this.stateManager.redo()) {
                this.renderCurrentView()
                this.notificationManager.show('Đã làm lại', 'info')
              }
            } else {
              if (this.stateManager.undo()) {
                this.renderCurrentView()
                this.notificationManager.show('Đã hoàn tác', 'info')
              }
            }
            return
          case 'y':
            ke.preventDefault()
            if (this.stateManager.redo()) {
              this.renderCurrentView()
              this.notificationManager.show('Đã làm lại', 'info')
            }
            return
          case 'n':
            ke.preventDefault()
            if (this.activeClassId) this.openAddStudent()
            return
          case 's':
            ke.preventDefault()
            this.syncManager.sync()
            this.notificationManager.show('Đã đồng bộ', 'info')
            return
        }
      }

      switch (ke.key) {
        case 'Escape': {
          const modalOpen = document.querySelector('.modal-overlay:not(.hidden)')
          if (modalOpen) {
            (modalOpen as HTMLElement).classList.add('hidden')
            return
          }
          if (this.element?.querySelector('#sidebar')?.classList.contains('open')) {
            this.closeMobileDrawer()
          }
          break
        }
        case '/': {
          ke.preventDefault()
          const searchInput = this.element?.querySelector('#searchInput') as HTMLInputElement
          searchInput?.focus()
          break
        }
        case '?': {
          ke.preventDefault()
          const shortcuts = [
            '⌨️ Phím tắt:',
            'Ctrl+Z  Hoàn tác',
            'Ctrl+Y  Làm lại',
            'Ctrl+N  Thêm HV',
            'Ctrl+S  Đồng bộ',
            '/  Tìm kiếm',
            'Esc  Đóng modal/sidebar',
            '?  Danh sách này'
          ].join('\n')
          this.notificationManager.alert(shortcuts, 'Phím tắt')
          break
        }
      }
    }
    document.addEventListener('keydown', keydownHandler as EventListener)
    this._listeners.push({ target: document, type: 'keydown', handler: keydownHandler as EventListener })

    // Setup initial UI states
    this.restoreSidebarState()
    this.updateYearFilterSelect()
    this.updateClassSelector()
    this.updateSyncUI(this.syncManager.getStatus())
    this.renderCurrentView()
    this.setupLayoutObserver()
    this.setupTopbarScroll()
    this.setupSidebarResizer()
  }

  private isMobileLayout(): boolean {
    return window.innerWidth <= 900
  }

  private bindMobileShellEvents(): void {
    if (!this.isMobileLayout()) return

    this.bindMobileNavEvents()

    this.element?.querySelector('#mFabAdd')?.addEventListener('click', () => {
      if (this.currentView === 'class' && this.activeClassId) {
        this.openAddStudent()
      }
    })

    this.element?.querySelector('#mClassSelect')?.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement
      if (target.value) this.selectClass(target.value)
    })

    this.element?.querySelector('#mOpenDrawer')?.addEventListener('click', () => this.openMobileDrawer())
    this.element?.querySelector('#mCloseDrawer')?.addEventListener('click', () => this.closeMobileDrawer())
    this.element?.querySelector('#sidebarScrim')?.addEventListener('click', () => this.closeMobileDrawer())

    this.bindMobileSheetEvents()

    this.element?.querySelector('#mViewMoreSheet')?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      if (target.id === 'mViewMoreSheet') {
        this.closeViewMoreSheet()
        return
      }
      const btn = target.closest('[data-action], [data-view]') as HTMLElement | null
      if (!btn) return
      this.closeViewMoreSheet()
      const action = btn.dataset.action
      const view = btn.dataset.view
      if (action === 'weights') this.openColumnsModal()
      else if (action === 'reports') this.openReportsModal()
      else if (view === 'print') {
        window.print()
      } else if (view) {
        this.stateManager.setViewMode(view as any)
        if (this.currentView === 'class') {
          this.classView.rerenderStudents()
        }
      }
    })
  }

  private openMobileDrawer(): void {
    this.element?.querySelector('#sidebar')?.classList.add('open')
    this.element?.querySelector('#sidebarScrim')?.classList.add('is-open')
  }

  private closeMobileDrawer(): void {
    this.element?.querySelector('#sidebar')?.classList.remove('open')
    this.element?.querySelector('#sidebarScrim')?.classList.remove('is-open')
  }

  private bindMobileNavEvents(): void {
    const NAV_MAP: Record<string, 'dashboard' | 'class' | 'profile'> = {
      home: 'dashboard',
      classes: 'class',
      scores: 'class',
      me: 'profile'
    }
    this.element?.querySelectorAll('.m-nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement
        const mNav = target.dataset.mNav
        if (mNav === 'more') {
          this.openViewMoreSheet()
          return
        }
        if (mNav && NAV_MAP[mNav]) this.switchView(NAV_MAP[mNav])
      })
    })
  }

  private bindMobileSheetEvents(): void {
    this.element?.querySelector('#mViewMoreTrigger')?.addEventListener('click', () => this.openViewMoreSheet())
    this.element?.querySelector('#mViewMoreClose')?.addEventListener('click', () => this.closeViewMoreSheet())

    const sheet = this.element?.querySelector('#mViewMoreSheet') as HTMLElement | null
    if (sheet) this.setupSheetDragDismiss(sheet, () => this.closeViewMoreSheet())
  }

  private setupSheetDragDismiss(overlay: HTMLElement, onClose: () => void): void {
    const panel = overlay.querySelector('.m-sheet, .bottom-sheet, .modal-panel') as HTMLElement | null
    if (!panel) return

    let startY = 0
    let currentY = 0
    let dragging = false

    const onTouchStart = (e: TouchEvent) => {
      if ((e.target as HTMLElement).closest('button, input, select, textarea, a')) return
      startY = e.touches[0].clientY
      currentY = 0
      dragging = true
      overlay.classList.add('is-dragging')
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!dragging) return
      currentY = Math.max(0, e.touches[0].clientY - startY)
      panel.style.transform = `translateY(${currentY}px)`
    }

    const onTouchEnd = () => {
      if (!dragging) return
      dragging = false
      overlay.classList.remove('is-dragging')
      if (currentY > 80) {
        panel.style.transform = ''
        onClose()
      } else {
        panel.style.transform = ''
      }
    }

    panel.addEventListener('touchstart', onTouchStart, { passive: true })
    panel.addEventListener('touchmove', onTouchMove, { passive: true })
    panel.addEventListener('touchend', onTouchEnd, { passive: true })
  }

  private setupTopbarScroll(): void {
    const main = this.element?.querySelector('#mainContent') as HTMLElement | null
    const topbar = this.element?.querySelector('.m-topbar') as HTMLElement | null
    if (!main || !topbar) return

    const onScroll = () => {
      const y = main.scrollTop
      if (y > this._lastScrollTop && y > 60) {
        topbar.classList.add('is-collapsed')
      } else if (y < this._lastScrollTop) {
        topbar.classList.remove('is-collapsed')
      }
      this._lastScrollTop = y
    }

    main.addEventListener('scroll', onScroll, { passive: true })
    this._listeners.push({ target: main, type: 'scroll', handler: onScroll as EventListener })
  }

  private setupLayoutObserver(): void {
    this._mobileLayout = this.isMobileLayout()

    let throttleTimer: ReturnType<typeof setTimeout> | null = null
    const onResize = () => {
      if (throttleTimer) return
      throttleTimer = setTimeout(() => {
        throttleTimer = null
        const nowMobile = this.isMobileLayout()
        if (nowMobile !== this._mobileLayout) {
          this._mobileLayout = nowMobile
          this.updateMobileShell()
        }
      }, 200)
    }

    this._layoutObserver = new ResizeObserver(onResize)
    this._layoutObserver.observe(document.documentElement)
    window.addEventListener('resize', onResize)
    this._listeners.push({ target: window, type: 'resize', handler: onResize as EventListener })
  }

  private updateMobileShell(): void {
    if (!this.element) return
    const host = this.element.querySelector('#mobileShell') as HTMLElement | null
    if (!host) return

    const mobile = this.isMobileLayout()
    host.innerHTML = mobile ? this.getMobileShellHTML() : ''
    host.classList.toggle('hidden', !mobile)

    if (mobile) {
      this.bindMobileShellEvents()
      this.setupTopbarScroll()
      this.updateMobileNavState()
      this.updateClassSelector()
    }
  }

  private updateMobileNavState(): void {
    const NAV_MAP: Record<string, string> = { home: 'dashboard', classes: 'class', scores: 'class', me: 'profile' }
    this.element?.querySelectorAll('.m-nav-item').forEach(btn => {
      const mNav = (btn as HTMLElement).dataset.mNav
      if (mNav === 'more') return
      const active = mNav ? NAV_MAP[mNav] === this.currentView : false
      btn.classList.toggle('active', active)
      btn.setAttribute('aria-current', active ? 'page' : 'false')
    })
  }

  // ============================================================
  // Router / Switch View
  // ============================================================

  private switchView(view: 'dashboard' | 'class' | 'profile'): void {
    if (view === this.currentView) return

    const prevView = this.currentView
    this.currentView = view

    // Update bottom nav active classes
    const NAV_MAP: Record<string, string> = { home: 'dashboard', classes: 'class', scores: 'class', me: 'profile' }
    this.element?.querySelectorAll('.m-nav-item').forEach(btn => {
      const mNav = (btn as HTMLElement).dataset.mNav
      const active = mNav ? NAV_MAP[mNav] === view : false
      btn.classList.toggle('active', active)
      btn.setAttribute('aria-current', active ? 'page' : 'false')
    })

    // Determine transition direction
    const order = ['dashboard', 'class', 'profile']
    const prevIdx = order.indexOf(prevView)
    const nextIdx = order.indexOf(view)
    const direction = nextIdx > prevIdx ? 'right' : 'left'

    // Show/hide view panels with animation
    const panelMap: Record<string, string> = {
      dashboard: 'dashboardView',
      class: 'classView',
      profile: 'meView'
    }
    const targetPanel = panelMap[view] || `${view}View`

    this.element?.querySelectorAll('.view-panel').forEach(panel => {
      if (panel.id !== targetPanel) {
        panel.classList.add('hidden')
        panel.classList.remove('view-enter-right', 'view-enter-left')
      } else {
        panel.classList.remove('hidden')
        // Remove animation class then re-add for re-trigger
        panel.classList.remove('view-enter-right', 'view-enter-left')
        // Force reflow
        void (panel as HTMLElement).offsetWidth
        panel.classList.add(direction === 'right' ? 'view-enter-right' : 'view-enter-left')
      }
    })

    // Update titles
    const titles: Record<string, { title: string; sub: string }> = {
      dashboard: { title: 'Sổ Điểm', sub: 'Tổng quan' },
      class: { title: this.getActiveClassName() || 'Điểm', sub: 'Điểm lớp' },
      profile: { title: 'Cá nhân', sub: 'Hồ sơ & cài đặt' }
    }
    const info = titles[view] || titles.dashboard
    const titleEl = this.element?.querySelector('#mTopTitle')
    const subEl = this.element?.querySelector('#mTopSub')
    if (titleEl) titleEl.textContent = info.title
    if (subEl) subEl.textContent = info.sub

    // Toggle Mobile elements
    const fab = this.element?.querySelector('#mFabAdd') as HTMLElement
    if (fab) fab.classList.toggle('hidden', view !== 'class')

    const classSelect = this.element?.querySelector('#mClassSelect') as HTMLSelectElement
    if (classSelect) classSelect.classList.toggle('hidden', view !== 'class')

    this.renderCurrentView()
  }

  private selectClass(classId: string): void {
    this.activeClassId = classId
    this.stateManager.setActiveClass(classId)
    this.updateClassSelector()
    if (this.currentView !== 'class') {
      this.switchView('class')
    } else {
      this.renderCurrentView()
    }
  }

  private showSkeleton(pane: HTMLElement, type: 'dashboard' | 'class' | 'profile'): void {
    if (!pane || !pane.isConnected) return
    const skeletons: Record<string, string> = {
      dashboard: `<div class="skeleton-list pt-4 px-4">
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-card"></div>
    </div>`,
      class: `<div class="skeleton-list pt-4 px-4">
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-table-row">
        <div class="skeleton skeleton-avatar"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text-sm"></div>
        <div class="skeleton skeleton-text-sm"></div>
        <div class="skeleton skeleton-text-sm"></div>
      </div>
      <div class="skeleton skeleton-table-row">
        <div class="skeleton skeleton-avatar"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text-sm"></div>
        <div class="skeleton skeleton-text-sm"></div>
        <div class="skeleton skeleton-text-sm"></div>
      </div>
      <div class="skeleton skeleton-table-row">
        <div class="skeleton skeleton-avatar"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text-sm"></div>
        <div class="skeleton skeleton-text-sm"></div>
        <div class="skeleton skeleton-text-sm"></div>
      </div>
    </div>`,
      profile: `<div class="skeleton-list pt-4 px-4">
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text-sm"></div>
    </div>`
    }
    pane.innerHTML = skeletons[type] || skeletons.dashboard
  }

  private renderCurrentView(): void {
    if (!this.element) return

    this.updateClassList()

    switch (this.currentView) {
      case 'dashboard': {
        const pane = this.element.querySelector('#dashboardView') as HTMLElement
        if (pane) {
          this.showSkeleton(pane, 'dashboard')
          requestAnimationFrame(() => {
            if (!pane.isConnected) return
            this.dashboardView.render(pane)
          })
        }
        break
      }
      case 'class': {
        const pane = this.element.querySelector('#classView') as HTMLElement
        if (pane && this.activeClassId) {
          const cid = this.activeClassId
          this.showSkeleton(pane, 'class')
          requestAnimationFrame(() => {
            if (!pane.isConnected) return
            this.classView.render(pane, cid)
          })
        }
        break
      }
      case 'profile': {
        const pane = this.element.querySelector('#meView') as HTMLElement
        if (pane) {
          this.showSkeleton(pane, 'profile')
          requestAnimationFrame(() => {
            if (!pane.isConnected) return
            this.profileView.render(pane)
          })
        }
        break
      }
    }
  }

  // ============================================================
  // Profile Action Handler Delegation
  // ============================================================

  private async handleProfileAct(action: string): Promise<void> {
    if (action === 'backup' || action === 'restore') {
      this.openBackupModal()
    } else if (action === 'pin') {
      this.handleChangePin()
    } else if (action === 'biometric') {
      this.notificationManager.show('Tính năng sinh trắc học đang phát triển', 'info')
    } else if (action === 'invite') {
      this.openParentInvite()
    } else if (action === 'columns') {
      this.openColumnsModal()
    } else if (action === 'theme') {
      this.openThemeModal()
    } else if (action === 'settings') {
      this.openSettingsModal()
    } else if (action === 'print-settings') {
      this.openPrintModal()
    } else if (action === 'parish-report') {
      this.exportParishReport()
    } else if (action === 'year-compare') {
      this.openYearCompare()
    } else if (action === 'archive-year') {
      this.toggleArchiveCurrentYear()
    } else if (action === 'install') {
      const installed = await triggerInstall()
      if (installed) {
        this.notificationManager.show('Đã cài đặt ứng dụng!', 'success')
      }
    } else if (action === 'help') {
      this.openAboutDialog()
    } else if (action === 'feedback') {
      this.notificationManager.show('Góp ý / Báo lỗi: liên hệ nhà phát triển', 'info')
    } else if (action === 'logout') {
      const ok = await this.notificationManager.confirm('Bạn có chắc chắn muốn đăng xuất?', {
        title: 'Đăng xuất?',
        type: 'warning',
        confirmText: 'Đăng xuất',
        cancelText: 'Hủy'
      })
      if (ok) {
        await this.authManager.logout()
        window.dispatchEvent(new CustomEvent('gl:logout'))
      }
    }
  }

  // ============================================================
  // Sidebar Tools / Actions Logic
  // ============================================================

  private exportParishReport(): void {
    const classes = this.stateManager.getAllClasses()
    const year = this.stateManager.getState().yearFilter
    const data = buildParishDashboard(classes, year)
    const stamp = (year || 'all').replace(/\s+/g, '-')
    downloadTextFile(
      `bao-cao-ban-gl-${stamp}.csv`,
      buildParishReportCsv(data, classes),
      'text/csv;charset=utf-8'
    )
    printParishReport(data, classes)
    this.notificationManager.show('Đã xuất báo cáo Ban GL (CSV + bản in)', 'success')
  }

  private openYearCompare(): void {
    const years = this.stateManager.getYears()
    if (years.length < 2) {
      this.notificationManager.show('Cần ít nhất 2 năm học để so sánh', 'warning')
      return
    }
    const yearA = years[1]
    const yearB = years[0]
    const rows = compareYears(this.stateManager.getAllClasses(), yearA, yearB)
    const lines = [
      `So sánh ${yearA} ↔ ${yearB}`,
      ...rows.map(r => `${r.metric}: ${r.yearA} → ${r.yearB}`)
    ]
    this.notificationManager.alert(lines.join('\n'), 'So sánh năm học')
  }

  private async toggleArchiveCurrentYear(): Promise<void> {
    const year = this.stateManager.getState().yearFilter || this.stateManager.getYears()[0]
    if (!year) {
      this.notificationManager.show('Chưa có năm học', 'warning')
      return
    }
    if (this.stateManager.isYearArchived(year)) {
      this.stateManager.unarchiveYear(year)
      this.notificationManager.show(`Đã mở lại năm ${year}`, 'success')
    } else {
      const ok = await this.notificationManager.confirm(
        `Lưu trữ năm học ${year}? Điểm các lớp năm này sẽ chỉ xem, không sửa.`,
        { title: 'Lưu trữ năm học?', type: 'warning', confirmText: 'Lưu trữ', cancelText: 'Hủy' }
      )
      if (ok) {
        this.stateManager.archiveYear(year)
        this.notificationManager.show(`Đã lưu trữ năm ${year}`, 'success')
      }
    }
    this.updateYearFilterSelect()
    this.renderCurrentView()
  }

  private exportClassScores(): void {
    if (!this.activeClassId) {
      this.notificationManager.show('Chưa chọn lớp', 'warning')
      return
    }
    const cls = this.stateManager.getClass(this.activeClassId)
    if (!cls) return

    const cols = resolveClassColumns(cls)
    const header = ['STT', 'Tên thánh', 'Họ đệm', 'Tên', ...cols.map(c => c.short), 'TB']
    const term = this.getActiveTerm()
    const rows = cls.students.map((st, i) => {
      const scores = cols.map(c => {
        const arr = st.scoresByTerm?.[term]?.[c.key] || []
        return arr.length ? arr.join(';') : ''
      })
      const tb = studentTBContext(st, cls.weights, term, cols)
      return [i + 1, st.tenThanh, st.hoDem, st.ten, ...scores, fmt(tb)]
    })

    const csv = [header, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const bom = '\uFEFF'
    downloadTextFile(`${cls.name.replace(/\s+/g, '_')}_diem.csv`, bom + csv, 'text/csv;charset=utf-8')
    this.notificationManager.show(`Đã xuất điểm lớp "${cls.name}"`, 'success')
  }

  private async importClassScores(): Promise<void> {
    const confirmExcel = await this.notificationManager.confirm(
      'Bạn muốn import điểm từ file Excel (.xlsx)?',
      {
        title: 'Import điểm',
        type: 'info',
        confirmText: '📊 Import Excel',
        cancelText: '📄 File JSON / CSV'
      }
    )
    if (confirmExcel) {
      const { ExcelImportModal } = await import('./modals/ExcelImportModal')
      const modal = new ExcelImportModal(this.stateManager, this.notificationManager)
      const currentClassId = this.activeClassId && this.stateManager.getClass(this.activeClassId) ? this.activeClassId : null
      modal.open(currentClassId, () => {
        const newActiveId = this.stateManager.getState().activeClassId
        if (newActiveId && newActiveId !== this.activeClassId) {
          this.activeClassId = newActiveId
        }
        if (this.currentView === 'class' && this.activeClassId) {
          this.classView.rerenderStudents()
        } else {
          this.renderCurrentView()
          this.updateYearFilterSelect()
          this.updateClassSelector()
        }
      })
      return
    }

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json,.csv,text/csv'
    input.addEventListener('change', async () => {
      const file = input.files?.[0]
      if (!file) return
      if (file.name.endsWith('.csv')) {
        if (!this.activeClassId) {
          this.notificationManager.show('Chưa chọn lớp — hãy chọn lớp trước khi nhập CSV', 'warning')
          return
        }
        await this.importCsvFile(file)
      } else {
        const ok = await this.backupService.importBackupFile(file, 'replace')
        if (ok) {
          this.renderCurrentView()
          this.updateYearFilterSelect()
          this.updateClassSelector()
        }
      }
    })
    input.click()
  }

  private async importCsvFile(file: File): Promise<void> {
    if (!this.activeClassId) return
    const cls = this.stateManager.getClass(this.activeClassId)
    if (!cls) return

    const cols = resolveClassColumns(cls)
    const text = await file.text()
    const rows = parseCSV(text)
    if (rows.length < 2) {
      this.notificationManager.show('File CSV không có dữ liệu', 'error')
      return
    }

    const header = rows[0]
    const colShortToKey = Object.fromEntries(cols.map(c => [c.short, c.key]))
    const colIndices: Array<{ key: string; idx: number }> = []
    for (let i = 0; i < header.length; i++) {
      const h = header[i].trim()
      if (colShortToKey[h]) colIndices.push({ key: colShortToKey[h], idx: i })
    }
    if (!colIndices.length) {
      this.notificationManager.show('Không tìm thấy cột điểm nào khớp với lớp hiện tại', 'error')
      return
    }

    const term = this.getActiveTerm()
    const nameKey = ['Tên thánh', 'Họ đệm', 'Tên'].every(k => header.includes(k))
    let imported = 0
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r]
      if (!row || row.length < 2) continue

      let student: any
      if (nameKey) {
        const csvTenThanh = (row[header.indexOf('Tên thánh')] || '').trim()
        const csvHoDem = (row[header.indexOf('Họ đệm')] || '').trim()
        const csvTen = (row[header.indexOf('Tên')] || '').trim()
        student = cls.students.find(st =>
          (st.tenThanh || '').trim() === csvTenThanh &&
          (st.hoDem || '').trim() === csvHoDem &&
          (st.ten || '').trim() === csvTen
        )
      }
      if (!student) continue

      for (const { key, idx } of colIndices) {
        const cell = (row[idx] || '').trim()
        if (!cell) continue
        const values = cell.split(';').map(v => parseFloat(v.trim())).filter(v => !isNaN(v))
        for (const v of values) {
          this.stateManager.addScore(this.activeClassId!, student.id, key as any, v, term)
        }
      }
      imported++
    }
    if (this.currentView === 'class') {
      this.classView.rerenderStudents()
    }
    this.notificationManager.show(`Đã nhập điểm cho ${imported}/${rows.length - 1} học viên từ CSV`, 'success')
  }

  // ============================================================
  // Modals & Popups Managers
  // ============================================================

  private async openAddStudent(): Promise<void> {
    if (!this.activeClassId) return
    const { AddStudentModal } = await import('./modals/AddStudentModal')
    const modal = new AddStudentModal(this.stateManager, this.authManager)
    modal.open(this.activeClassId)
  }

  private async openColumnsModal(): Promise<void> {
    const classId = this.activeClassId || this.stateManager.getState().activeClassId
    if (!classId) return
    const { ColumnsModal } = await import('./modals/ColumnsModal')
    const modal = new ColumnsModal(this.stateManager, this.notificationManager)
    modal.open(classId, () => this.renderCurrentView())
  }

  private async openParentInvite(): Promise<void> {
    const { ParentInviteModal } = await import('./modals/ParentInviteModal')
    const modal = new ParentInviteModal(this.stateManager, this.authManager, this.notificationManager)
    modal.open(this.activeClassId || this.stateManager.getState().activeClassId)
  }

  private async openThemeModal(): Promise<void> {
    const { ThemeModal } = await import('./modals/ThemeModal')
    const modal = new ThemeModal(this.stateManager, this.notificationManager)
    modal.open()
  }

  private async openPrintModal(): Promise<void> {
    const { PrintModal } = await import('./modals/PrintModal')
    const modal = new PrintModal(this.stateManager, this.notificationManager)
    modal.open()
  }

  private openReportsModal(): void {
    if (!this.reportsModal) {
      this.reportsModal = new ReportsModal(this.stateManager, this.notificationManager)
    }
    this.reportsModal.open()
  }

  private openMissingScoresModal(): void {
    if (!this.missingScoresModal) {
      this.missingScoresModal = new MissingScoresModal(this.stateManager, this.notificationManager)
    }
    this.missingScoresModal.open()
  }

  private openUserManagementModal(): void {
    if (!this.userManagementModal) {
      this.userManagementModal = new UserManagementModal(this.authManager, this.notificationManager)
    }
    this.userManagementModal.open()
  }

  private openHelpModal(): void {
    if (!this.helpModal) {
      this.helpModal = new HelpModal()
    }
    this.helpModal.open()
  }

  private openBulkExportModal(): void {
    const modal = new BulkExportModal(this.stateManager, this.notificationManager)
    modal.open()
  }

  private openBackupModal(): void {
    this.openBackupModalAsync()
  }

  private async openBackupModalAsync(): Promise<void> {
    const { BackupModal } = await import('./modals/BackupModal')
    const modal = new BackupModal(this.backupService, this.notificationManager)
    modal.open(async () => {
      this.updateYearFilterSelect()
      this.updateClassSelector()
      this.renderCurrentView()
    })
  }

  openJournalLogModal(student: any, classId: string, className: string): void {
    if (!this.journalLogModal) {
      this.journalLogModal = new JournalLogModal(this.stateManager, this.notificationManager, this.authManager)
    }
    this.journalLogModal.open(student, classId, className)
  }

  private async openSettingsModal(): Promise<void> {
    const currentUrl = supabaseService.getUrl()
    const currentKey = supabaseService.getKey()
    const hideDefault = !confirm('Bạn có muốn cấu hình Supabase Cloud?\n\nHiện tại đang dùng: ' +
      (currentUrl ? currentUrl.slice(0, 30) + '…' : 'mặc định') +
      '\n\nNhấn OK để cấu hình, Cancel nếu chưa cần.')
    if (!hideDefault) {
      const url = await this.promptDialog('Supabase URL', 'Nhập Supabase Project URL:', currentUrl || 'https://')
      if (!url) return
      const key = await this.promptDialog('Supabase Anon Key', 'Nhập Supabase anon key:', currentKey || '')
      if (!key) return
      supabaseService.configure(url, key)
      this.notificationManager.show('Đã lưu cấu hình Supabase', 'success')
    }
  }

  private openAboutDialog(): void {
    this.notificationManager.alert(
      `Sổ Điểm Giáo Lý v2.0.0\n\nỨng dụng nhập điểm, xếp loại, đồng bộ đám mây.\nDữ liệu lưu offline trên trình duyệt.\n\nPhát triển bởi Ban Giáo lý.`,
      'ℹ️ Giới thiệu'
    )
  }

  // ============================================================
  // DOM Sidebar collapse / states
  // ============================================================

  private setupSidebarResizer(): void {
    if (!this.element) return

    if (window.innerWidth < 1024) return

    const sidebar = this.element.querySelector('#sidebar') as HTMLElement
    if (!sidebar) return
    if (sidebar.querySelector('.sidebar-resizer')) return

    const resizer = document.createElement('div')
    resizer.className = 'sidebar-resizer'
    sidebar.appendChild(resizer)
    sidebar.style.position = 'relative'

    const saved = localStorage.getItem('sidebar-width')
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

  private toggleSidebarCollapse(): void {
    const appEl = this.element
    if (!appEl) return
    const collapsed = appEl.classList.toggle('sidebar-collapsed')
    const side = appEl.querySelector('#sidebar')
    side?.classList.toggle('collapsed', collapsed)
    const btn = appEl.querySelector('#sidebarCollapseBtn') as HTMLElement
    if (btn) btn.textContent = collapsed ? '▶' : '◀'
    try { localStorage.setItem('sidebar-collapsed', collapsed ? '1' : '') } catch {}
  }

  private restoreSidebarState(): void {
    const appEl = this.element
    if (!appEl) return
    try {
      const saved = localStorage.getItem('sidebar-collapsed')
      if (saved === '1' && window.innerWidth > 900) {
        appEl.classList.add('sidebar-collapsed')
        const side = appEl.querySelector('#sidebar')
        side?.classList.add('collapsed')
        const btn = appEl.querySelector('#sidebarCollapseBtn') as HTMLElement
        if (btn) btn.textContent = '▶'
      }
    } catch {}
  }

  // ============================================================
  // HTML Template / Builders
  // ============================================================

  private getMobileShellHTML(): string {
    return `
      <header class="m-topbar" role="banner">
        <button type="button" class="m-topbar-btn" id="mOpenDrawer" aria-label="Mở menu">
          <span class="m-hamburger" aria-hidden="true"><i></i><i></i><i></i></span>
        </button>
        <div class="m-topbar-titles">
          <strong class="m-top-title" id="mTopTitle">Sổ Điểm</strong>
          <span class="m-top-sub" id="mTopSub">Tổng quan</span>
        </div>
        <button type="button" class="m-topbar-btn" id="mViewMoreTrigger" aria-label="Chế độ xem thêm" aria-expanded="false">
          <span class="m-more-ico" aria-hidden="true">⋯</span>
        </button>
      </header>

      <nav class="m-bottom-nav" id="mBottomNav" aria-label="Điều hướng chính">
        <div class="m-bottom-nav-inner">
          <button type="button" class="m-nav-item active" data-m-nav="home" aria-current="page">
            <svg class="m-nav-glyph" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
            <span class="m-nav-lab">Tổng quan</span>
          </button>
          <button type="button" class="m-nav-item" data-m-nav="classes">
            <svg class="m-nav-glyph" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><path d="M8 7h8M8 11h6"/>
            </svg>
            <span class="m-nav-lab">Lớp</span>
          </button>
          <button type="button" class="m-nav-item m-nav-item-primary" data-m-nav="scores">
            <span class="m-nav-primary-ring" aria-hidden="true">
              <svg class="m-nav-glyph" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/><path d="M15 4h3a2 2 0 012 2v1"/></svg>
            </span>
            <span class="m-nav-lab">Điểm</span>
          </button>
          <button type="button" class="m-nav-item" data-m-nav="me">
            <svg class="m-nav-glyph" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <span class="m-nav-lab">Cá nhân</span>
          </button>
          <button type="button" class="m-nav-item" data-m-nav="more" aria-label="Thêm">
            <svg class="m-nav-glyph" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
            </svg>
            <span class="m-nav-lab">Thêm</span>
          </button>
        </div>
      </nav>

      <button type="button" class="m-fab hidden" id="mFabAdd" title="Thêm học viên" aria-label="Thêm học viên">
        <span class="m-fab-ico">＋</span>
        <span class="m-fab-label">Thêm học viên</span>
      </button>

      <div class="m-sheet-overlay hidden" id="mViewMoreSheet" role="dialog" aria-modal="true" aria-labelledby="mViewMoreTitle">
        <div class="m-sheet bottom-sheet">
          <div class="m-sheet-handle bottom-sheet-handle" aria-hidden="true"></div>
          <div class="m-sheet-head">
            <h3 id="mViewMoreTitle">Chế độ xem thêm</h3>
            <button type="button" class="m-icon-btn" id="mViewMoreClose" aria-label="Đóng">×</button>
          </div>
          <div class="m-sheet-list">
            <button type="button" class="m-sheet-list-btn" data-view="rank">🏆 Xếp hạng</button>
            <button type="button" class="m-sheet-list-btn" data-view="stats">📈 Thống kê</button>
            <button type="button" class="m-sheet-list-btn" data-view="print">🖨️ Bản in</button>
            <button type="button" class="m-sheet-list-btn" data-action="reports">📊 Báo cáo nhanh</button>
            <button type="button" class="m-sheet-list-btn admin-only hidden" data-action="weights">⚖️ Hệ số cột</button>
          </div>
          <p class="m-sheet-hint">Kéo xuống hoặc chạm ngoài để đóng</p>
        </div>
      </div>

      <select id="mClassSelect" class="m-class-select hidden" aria-label="Chọn lớp"></select>
    `
  }

  private getTemplate(): string {
    const mobile = this.isMobileLayout()
    this._mobileLayout = mobile

    return `
      <div id="mobileShell">${mobile ? this.getMobileShellHTML() : ''}</div>

      <!-- Drawer / Desktop Sidebar -->
      <div class="sidebar-scrim" id="sidebarScrim"></div>
      <aside class="sidebar" id="sidebar" role="complementary" aria-label="Menu chính">
        <div class="sidebar-head">
          <div class="brand">
            <div class="brand-row">
              <div class="brand-icon">✝</div>
              <div>
                <h1>Sổ Điểm Giáo Lý</h1>
                <p>Lưu điểm theo từng lớp</p>
              </div>
            </div>
          </div>
          <button type="button" class="sidebar-toggle" aria-label="Mở menu lớp">
            <span class="sidebar-acc-label">
              <span class="sidebar-acc-title">Các lớp</span>
            </span>
          </button>
          <button type="button" class="m-drawer-close" id="mCloseDrawer" aria-label="Đóng">×</button>
        </div>
        <div class="sidebar-body">
          <div class="sidebar-user" id="sidebarUser"></div>

          <div class="year-filter-box">
            <label class="field-label" for="yearFilterSelect">Năm học</label>
            <select id="yearFilterSelect" title="Lọc lớp · dashboard · xuất nhiều lớp"></select>
            <p class="hint" style="margin:6px 0 0;font-size:0.72rem">Lọc lớp · dashboard · xuất nhiều lớp</p>
          </div>

          <button type="button" class="btn btn-ghost btn-block nav-home-btn mb-2" id="openDashboardBtn" title="Tổng quan giáo xứ / năm học">
            📊 Tổng quan năm học
          </button>

          <div class="sidebar-accordion open" id="classesAccordion">
            <button type="button" class="sidebar-acc-toggle" id="classesToggle" aria-expanded="true" aria-controls="classesPanel">
              <span class="sidebar-acc-label">
                <span class="sidebar-acc-title">Các lớp của bạn</span>
                <span class="d-flex items-center" style="gap:6px">
                  <span class="sidebar-acc-count" id="classesToggleCount"></span>
                  <span id="bulkClassButtonsHost" onclick="event.stopPropagation()">
                    <button type="button" class="btn btn-ghost btn-xs ml-1" id="btnToggleBulkClass" style="font-size:0.65rem;padding:1px 4px;display:none">Chọn nhiều</button>
                    <button type="button" class="btn btn-danger btn-xs ml-1" id="btnBulkDelClass" style="font-size:0.65rem;padding:1px 4px;display:none">🗑️ Xóa (0)</button>
                  </span>
                </span>
              </span>
              <span class="sidebar-acc-chevron" aria-hidden="true">▾</span>
            </button>
            <div class="sidebar-acc-panel" id="classesPanel">
              <div class="class-list" id="classList"></div>
              <div class="new-class-form">
                <input type="text" id="newClassName" class="input" placeholder="Tên lớp (vd: Ấu Nhi 1A)" maxlength="60" aria-label="Tên lớp mới" />
                <div class="d-flex gap-2 mt-2">
                  <input type="text" id="newClassYear" class="input flex-1" placeholder="Năm học (để trống nếu giữ nguyên)" maxlength="20" aria-label="Năm học" />
                  <button type="button" class="btn btn-primary btn-sm" id="createClassBtn">Tạo</button>
                </div>
              </div>
            </div>
          </div>

          <div class="section-label">Công cụ</div>
          <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="exportBtn">📥 Xuất điểm (lớp này)</button>
          <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="bulkExportBtn">📥 Xuất nhiều lớp</button>
          <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="importBtn">📥 Nhập điểm</button>
          <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="reportsBtn">📊 Báo cáo nhanh</button>
          <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="inviteBtn">📝 Mời phụ huynh</button>
          <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="missingScoresBtn">📋 Điểm thiếu</button>
          <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="usersBtn">👤 Quản lý TK</button>
          <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="backupBtn">💾 Sao lưu JSON</button>
          <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="settingsBtn">⚙️ Cài đặt</button>
          <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="helpBtn">ℹ️ Hướng dẫn</button>

          <p class="hint sidebar-tip mt-3">💡 Sao lưu JSON định kỳ · Đổi PIN mặc định · GLV chỉ xuất điểm.</p>
          <button type="button" class="sidebar-collapse-btn" id="sidebarCollapseBtn" title="Thu gọn sidebar" aria-label="Thu gọn sidebar">◀</button>
        </div>
      </aside>

      <!-- VIEW PANELS HOST -->
      <main class="main" id="mainContent">
        <div id="dashboardView" class="view-panel" role="region" aria-label="Tổng quan"></div>
        <div id="classView" class="view-panel hidden" role="region" aria-label="Điểm lớp"></div>
        <div id="meView" class="view-panel hidden" role="region" aria-label="Cá nhân"></div>
      </main>

      <!-- Toast Notifications Host -->
      <div class="toast-host" id="toastHost" aria-live="polite" aria-relevant="additions"></div>

      <!-- Sync Status Indicator -->
      <div class="sync-indicator hidden" id="syncIndicator" aria-live="polite">
        <span class="sync-spinner" aria-hidden="true"></span>
        <span class="sync-text">Đang đồng bộ...</span>
      </div>
    `
  }

  private getActiveClassName(): string | null {
    if (!this.activeClassId) return null
    const cls = this.stateManager.getClass(this.activeClassId)
    return cls?.name || null
  }

  private updateClassList(): void {
    const el = this.element?.querySelector('#classList') as HTMLElement
    if (!el) return

    const classes = this.stateManager.getVisibleClasses()
    if (!classes.length) {
      el.innerHTML = `
        <div class="class-item empty hidden"></div>
        <div class="dash-empty dash-empty-col px-3 py-5">
          <div class="empty-icon" style="font-size:2rem;margin-bottom:10px">📂</div>
          <strong style="font-size:0.9rem">Chưa có lớp${this.stateManager.getState().yearFilter ? ' trong năm đã chọn' : ''}</strong>
          <p class="hint mt-2" style="font-size:0.8rem;line-height:1.4">
            ${this.authManager.isAdmin()
              ? 'Tạo lớp mới từ ô bên dưới để bắt đầu nhập điểm.'
              : 'Liên hệ Ban GL để được gán lớp.'}
          </p>
        </div>
      `
      return
    }

    const sorted = [...classes].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    const activeId = this.stateManager.getState().activeClassId
    const canDel = this.authManager.isAdmin()

    el.innerHTML = sorted.map(c => `
      <div class="class-item ${c.id === activeId ? 'active' : ''}" data-select-class="${c.id}" role="button" tabindex="0">
        ${this.bulkClassMode ? `<input type="checkbox" class="class-bulk-select mr-2 cursor-pointer" data-class-id="${c.id}" ${this.selectedClasses.has(c.id) ? 'checked' : ''} onclick="event.stopPropagation()" />` : ''}
        <span class="class-dot" style="background:${this.stateManager.isYearArchived(c.year) ? '#94a3b8' : '#2563eb'}"></span>
        <div class="class-info">
          <div class="class-name">${this.escapeHtml(c.name)}</div>
          <div class="class-meta">
            ${c.students.length} học viên ${c.year ? `· ${this.escapeHtml(c.year)}` : ''}${this.stateManager.isYearArchived(c.year) ? ' · lưu trữ' : ''}
          </div>
        </div>
        <div class="class-actions">
          <button type="button" class="icon-btn" data-rename-class="${c.id}" title="Đổi tên" aria-label="Đổi tên lớp">✏️</button>
          ${canDel && !this.bulkClassMode ? `<button type="button" class="icon-btn danger" data-del-class="${c.id}" title="Xóa lớp" aria-label="Xóa lớp">🗑️</button>` : ''}
        </div>
      </div>
    `).join('')

    const toggleBulkBtn = this.element?.querySelector('#btnToggleBulkClass') as HTMLElement
    if (toggleBulkBtn) {
      toggleBulkBtn.style.display = canDel ? '' : 'none'
      toggleBulkBtn.textContent = this.bulkClassMode ? 'Hủy' : 'Chọn nhiều'
    }
    this.updateBulkClassDelBtn()

    const classesToggleCount = this.element?.querySelector('#classesToggleCount')
    if (classesToggleCount) {
      classesToggleCount.textContent = `(${classes.length})`
    }
  }

  private updateClassSelector(): void {
    const select = this.element?.querySelector('#mClassSelect') as HTMLSelectElement
    if (!select) return

    const classes = this.stateManager.getAllClasses()
    const activeId = this.stateManager.getState().activeClassId

    select.innerHTML = classes.map(c => `
      <option value="${c.id}" ${c.id === activeId ? 'selected' : ''}>${c.name} ${c.year ? `· ${c.year}` : ''}</option>
    `).join('')
  }

  private updateYearFilterSelect(): void {
    const select = this.element?.querySelector('#yearFilterSelect') as HTMLSelectElement
    if (!select) return
    const years = this.stateManager.getYears()
    const current = this.stateManager.getState().yearFilter
    const archived = this.stateManager.getState().archivedYears || []
    select.innerHTML =
      `<option value="">Tất cả năm</option>` +
      years.map(y => {
        const tag = archived.includes(y) ? ' (đã lưu trữ)' : ''
        return `<option value="${this.escapeHtml(y)}" ${current === y ? 'selected' : ''}>${this.escapeHtml(y)}${tag}</option>`
      }).join('')
  }

  private updateInstallButtonVisibility(): void {
    this.profileView?.updateInstallButtonVisibility()
  }

  private updateSyncUI(status: any): void {
    const indicator = this.element?.querySelector('#syncIndicator') as HTMLElement
    if (!indicator) return
    indicator.classList.toggle('hidden', status.status !== 'syncing')
  }

  private openViewMoreSheet(): void {
    const sheet = this.element?.querySelector('#mViewMoreSheet') as HTMLElement
    sheet?.classList.remove('hidden')
    document.body.style.overflow = 'hidden'
  }

  private closeViewMoreSheet(): void {
    const sheet = this.element?.querySelector('#mViewMoreSheet') as HTMLElement
    sheet?.classList.add('hidden')
    document.body.style.overflow = ''
  }

  // ============================================================
  // Dialog Prompter (Helper)
  // ============================================================

  private promptDialog(title: string, message: string, defaultValue: string): Promise<string | null> {
    return new Promise((resolve) => {
      this.notificationManager.init()

      const overlay = document.getElementById('appDialog')
      const titleEl = document.getElementById('appDialogTitle')
      const messageEl = document.getElementById('appDialogMessage')
      const okBtn = document.getElementById('appDialogOk')
      const cancelBtn = document.getElementById('appDialogCancel')
      if (!overlay || !titleEl || !okBtn || !cancelBtn) return new Promise(() => {})

      titleEl.textContent = title
      messageEl!.innerHTML = `
        <div class="mb-2">${message}</div>
        <input type="text" id="dialogPromptInput" value="${defaultValue}" class="w-full p-2 rounded-sm" style="border:1px solid var(--border);box-sizing:border-box" aria-label="Nhập giá trị" />
      `
      okBtn!.textContent = 'Đồng ý'
      cancelBtn!.textContent = 'Hủy'

      overlay.classList.remove('hidden')
      const focusTrap = createFocusTrap(overlay)
      const input = document.getElementById('dialogPromptInput') as HTMLInputElement
      input?.focus()
      input?.select()

      const cleanup = (result: string | null) => {
        focusTrap.destroy()
        overlay.classList.add('hidden')
        overlay.removeEventListener('click', onOverlayClick)
        document.removeEventListener('keydown', onKeyDown)
        this.notificationManager.rebindDialog()
        resolve(result)
      }

      const onOk = () => cleanup(input.value.trim())
      const onCancel = () => cleanup(null)

      const onOverlayClick = (e: MouseEvent) => {
        if (e.target === overlay) {
          cleanup(null)
        }
      }

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          cleanup(null)
        } else if (e.key === 'Enter') {
          cleanup(input.value.trim())
        }
      }

      okBtn.replaceWith(okBtn.cloneNode(true))
      cancelBtn.replaceWith(cancelBtn.cloneNode(true))

      const newOk = document.getElementById('appDialogOk')!
      const newCancel = document.getElementById('appDialogCancel')!

      newOk.addEventListener('click', onOk, { once: true })
      newCancel.addEventListener('click', onCancel, { once: true })
      overlay.addEventListener('click', onOverlayClick)
      document.addEventListener('keydown', onKeyDown)
    })
  }

  private async handleChangePin(): Promise<void> {
    const user = this.authManager.getCurrentUser()
    if (!user) return
    const oldPin = await this.promptDialog('Đổi PIN', 'Nhập PIN cũ:', '')
    if (!oldPin) return
    const newPin = await this.promptDialog('Đổi PIN', 'Nhập PIN mới (4–6 số):', '')
    if (!newPin || newPin.length < 4 || newPin.length > 6) {
      this.notificationManager.show('PIN phải từ 4–6 số', 'error')
      return
    }
    const confirmPin = await this.promptDialog('Đổi PIN', 'Xác nhận PIN mới:', '')
    if (newPin !== confirmPin) {
      this.notificationManager.show('PIN xác nhận không khớp', 'error')
      return
    }
    const result = await this.authManager.changePin(user.id, oldPin, newPin)
    if (result.ok) {
      this.notificationManager.show('Đã đổi PIN thành công', 'success')
    } else {
      this.notificationManager.show(result.error || 'Đổi PIN thất bại', 'error')
    }
  }

  private getActiveTerm(): 'hk1' | 'hk2' {
    const term = this.stateManager.getState().activeTerm
    return term === 'year' ? 'hk1' : term
  }

  private escapeHtml(s: string): string {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  private toggleClassSelection(id: string): void {
    if (this.selectedClasses.has(id)) {
      this.selectedClasses.delete(id)
    } else {
      this.selectedClasses.add(id)
    }
    this.updateClassList()
  }

  private updateBulkClassDelBtn(): void {
    const bulkDelBtn = this.element?.querySelector('#btnBulkDelClass') as HTMLElement
    if (bulkDelBtn) {
      bulkDelBtn.style.display = (this.bulkClassMode && this.selectedClasses.size > 0) ? '' : 'none'
      bulkDelBtn.textContent = `🗑️ Xóa (${this.selectedClasses.size})`
    }
    const toggleBulkBtn = this.element?.querySelector('#btnToggleBulkClass') as HTMLElement
    if (toggleBulkBtn) {
      toggleBulkBtn.textContent = this.bulkClassMode ? 'Hủy' : 'Chọn nhiều'
    }
  }

  destroy(): void {
    this._layoutObserver?.disconnect()
    this._layoutObserver = null
    this._unsubState?.()
    this._unsubState = null
    for (const { target, type, handler } of this._listeners) {
      target.removeEventListener(type, handler)
    }
    this._listeners = []
    this.classView = null as any
    this.dashboardView = null as any
    this.profileView = null as any
  }
}