import { LitElement, html } from 'lit'
import { classMap } from 'lit/directives/class-map.js'
import type { StateManager } from '../StateManager'
import type { AuthManager } from '../../core/auth/AuthManager'
import type { SyncManager } from '../../services/sync/SyncManager'
import type { NotificationManager } from '../../services/NotificationManager'
import type { BackupService } from '../../services/BackupService'
import { StateController } from '../controllers/StateController'
import { ShellController } from '../controllers/ShellController'
import { ClassListController } from '../controllers/ClassListController'
import { CommandController } from '../controllers/CommandController'
import { resolveClassColumns } from '../../config/constants'
import { fmt, parseCSV } from '../../views/helpers'
import { studentTBContext } from '../../core/calc'
import { supabaseService } from '../../services/SupabaseClient'
import { triggerInstall } from '../../services/PWAInstall'
import {
  buildParishDashboard, downloadTextFile, buildParishReportCsv, printParishReport
} from '../../features/parishReport'
import { compareYears } from '../../features/years'
import { rafThrottle } from '../../utils/perf'
import { createFocusTrap } from '../../utils/focusTrap'
import '../components/TopBar/TopBar'
import '../components/BottomNav/BottomNav'
import '../components/FAB/FAB'
import '../components/BottomSheet/BottomSheet'
import '../components/CommandPalette/CommandPalette'

import './gl-dashboard'
import { ClassView } from './ClassView'
import { AppModalRegistry } from '../controllers/AppModalRegistry'
import { ShortcutController } from '../controllers/ShortcutController'
import { SidebarController } from '../controllers/SidebarController'

export class GlAppShell extends LitElement {
  static properties = {
    stateManager: { type: Object },
    authManager: { type: Object },
    syncManager: { type: Object },
    notificationManager: { type: Object },
    backupService: { type: Object },
  }

  declare stateManager: StateManager
  declare authManager: AuthManager
  declare syncManager: SyncManager
  declare notificationManager: NotificationManager
  declare backupService: BackupService

  private _stateCtrl!: StateController
  private shellCtrl!: ShellController
  private classListCtrl!: ClassListController
  private commandCtrl!: CommandController

  private classView!: ClassView
  private currentView: 'dashboard' | 'class' | 'profile' = 'dashboard'
  private activeClassId: string | null = null
  private _unsubState: (() => void) | null = null

  private modalRegistry!: AppModalRegistry
  private _scheduledStateUpdate: (() => void) & { cancel(): void } | null = null

  constructor() {
    super()
    this.stateManager = null as unknown as StateManager
    this.authManager = null as unknown as AuthManager
    this.syncManager = null as unknown as SyncManager
    this.notificationManager = null as unknown as NotificationManager
    this.backupService = null as unknown as BackupService
  }

  createRenderRoot() {
    return this
  }

  connectedCallback() {
    super.connectedCallback()

    this._stateCtrl = new StateController(this, this.stateManager)
    void this._stateCtrl

    this.modalRegistry = new AppModalRegistry({
      stateManager: this.stateManager,
      authManager: this.authManager,
      syncManager: this.syncManager,
      notificationManager: this.notificationManager,
      backupService: this.backupService,
    })

    this.shellCtrl = new ShellController(this, {
      stateManager: this.stateManager,
      authManager: this.authManager,
      syncManager: this.syncManager,
      notificationManager: this.notificationManager,
      switchView: (v) => this._switchView(v),
      selectClass: (id) => this._selectClass(id),
      updateYearFilterSelect: () => this._updateYearFilterSelect(),
      updateClassSelector: () => this._updateClassSelector(),
      updateClassList: () => this.classListCtrl.updateClassList(),
      renderCurrentView: () => this._renderCurrentView(),
      openJournalLogModal: (student, classId, className) => this._openJournalLogModal(student, classId, className),
      promptDialog: (t, m, d) => this._promptDialog(t, m, d),
      getCurrentView: () => this.currentView,
      getActiveClassId: () => this.activeClassId,
      openAddStudent: () => this._openAddStudent(),
      scrollToStudent: (studentId) => this.classView?.scrollToStudent(studentId),
      getRootElement: () => this,
    })

    this.classListCtrl = new ClassListController(this, {
      stateManager: this.stateManager,
      authManager: this.authManager,
      notificationManager: this.notificationManager,
      promptDialog: (t, m, d) => this._promptDialog(t, m, d ?? ''),
      selectClass: (id) => this._selectClass(id),
      closeMobileDrawer: () => this.closeMobileDrawer(),
      renderCurrentView: () => this._renderCurrentView(),
      getRootElement: () => this,
    })

    this.commandCtrl = new CommandController(this, {
      stateManager: this.stateManager,
      authManager: this.authManager,
      notificationManager: this.notificationManager,
      selectClass: (id) => this._selectClass(id),
      switchView: (v) => this._switchView(v),
      openAddStudent: () => this._openAddStudent(),
      importClassScores: () => this._importClassScores(),
      openBulkExportModal: () => this._openBulkExportModal(),
      openBackupModal: () => this._openBackupModal(),
      openSettingsModal: () => this._openSettingsModal(),
      openParentInvite: () => this._openParentInvite(),
      scrollToStudent: (studentId) => this.classView?.scrollToStudent(studentId),
      changePin: () => this._handleChangePin(),
      openReportsModal: () => this.modalRegistry.openReports(),
      openMissingScoresModal: () => this.modalRegistry.openMissingScores(),
      openUserManagementModal: () => this.modalRegistry.openUserManagement(),
      openHelpModal: () => this.modalRegistry.openHelp(),
      getActiveClassId: () => this.activeClassId,
      getRootElement: () => this,
    })

    new ShortcutController(this, {
      stateManager: this.stateManager,
      syncManager: this.syncManager,
      notificationManager: this.notificationManager,
      getActiveClassId: () => this.activeClassId,
      renderCurrentView: () => this._renderCurrentView(),
      openAddStudent: () => this._openAddStudent(),
      openCommandPalette: (qs?: boolean) => this.commandCtrl.openCommandPalette(qs ?? false),
      openCheatsheetModal: () => this.commandCtrl.openCheatsheetModal(),
      closeMobileDrawer: () => this.closeMobileDrawer(),
      handleCommand: (cmd: string) => this.commandCtrl.handleCommand(cmd),
      getRootElement: () => this,
    })

    new SidebarController(this, {
      stateManager: this.stateManager,
      authManager: this.authManager,
      notificationManager: this.notificationManager,
      getRootElement: () => this,
      onSelectClass: (id: string) => this._selectClass(id),
      closeMobileDrawer: () => this.closeMobileDrawer(),
      promptDialog: (t: string, m: string, d?: string) => this._promptDialog(t, m, d ?? ''),
      refreshClassList: () => this.classListCtrl.updateClassList(),
    })

    this.classView = new ClassView(
      this.stateManager,
      this.authManager,
      this.notificationManager,
    )
  }

  firstUpdated() {
    this.shellCtrl.attach()
    this._updateYearFilterSelect()
    this._updateClassSelector()
    this._updateSyncUI(this.syncManager.getStatus())
    this._renderCurrentView()

    this._scheduledStateUpdate = rafThrottle(() => {
      this.classListCtrl.updateClassList()
      this._updateClassSelector()
      if (this.currentView === 'class') {
        const titleEl = this.querySelector('#mTopTitle')
        if (titleEl) titleEl.textContent = this._getActiveClassName() || 'Điểm'
        this.classView?.onStateChange()
      } else {
        this._renderCurrentView()
      }
    })
    this._unsubState = this.stateManager.subscribe(() => this._scheduledStateUpdate?.())
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this._unsubState?.()
    this._unsubState = null
    this._scheduledStateUpdate?.cancel()
    this._scheduledStateUpdate = null
  }

  render() {
    const mobile = this.shellCtrl.isMobileLayout()
    return html`
      <div class="app" id="appRoot">
        <div id="mobileShell">${mobile ? this._renderMobileShell() : ''}</div>
        ${this._renderSidebarScrim()}
        ${this._renderSidebar()}

        <div class="offline-banner hidden" id="offlineBanner" role="alert">
          <span class="offline-icon">⚠️</span>
          <span class="offline-text">Bạn đang ngoại tuyến (Offline). Các thay đổi điểm số sẽ được tự động đồng bộ khi có kết nối trở lại.</span>
        </div>

        <main class="main" id="mainContent">
          <gl-dashboard id="dashboardView" class="view-panel ${classMap({ hidden: this.currentView !== 'dashboard' })}" role="region" aria-label="Tổng quan" .stateManager=${this.stateManager} .authManager=${this.authManager} .active=${this.currentView === 'dashboard'} @dash-select-class=${this._onDashSelectClass} @dash-export-report=${this._onDashExportReport} @dash-compare-years=${this._onDashCompareYears} @dash-toggle-archive=${this._onDashToggleArchive} @dash-scroll-to-student=${this._onDashScrollToStudent}></gl-dashboard>
          <div id="classView" class="view-panel ${classMap({ hidden: this.currentView !== 'class' })}" role="region" aria-label="Điểm lớp"></div>
          <div id="meView" class="view-panel ${classMap({ hidden: this.currentView !== 'profile' })}" role="region" aria-label="Cá nhân"></div>
        </main>

        <div class="toast-host" id="toastHost" aria-live="polite" aria-relevant="additions"></div>

        <div class="sync-indicator hidden" id="syncIndicator" aria-live="polite">
          <span class="sync-spinner" aria-hidden="true"></span>
          <span class="sync-text">Đang đồng bộ...</span>
        </div>

        <gl-command-palette id="commandPalette"></gl-command-palette>
      </div>
    `
  }

  private _renderMobileShell() {
    const tabs = [
      { id: 'home', label: 'Tổng quan', icon: '🏠' },
      { id: 'classes', label: 'Lớp', icon: '📚' },
      { id: 'scores', label: 'Điểm', icon: '📝' },
      { id: 'me', label: 'Cá nhân', icon: '👤' },
      { id: 'more', label: 'Thêm', icon: '⋯' },
    ]
    return html`
      <gl-topbar id="mTopBar" title="Sổ Điểm" subtitle="Tổng quan" showMenu></gl-topbar>
      <gl-bottom-nav id="mBottomNav" .tabs=${tabs} activeTab="home"></gl-bottom-nav>
      <gl-fab id="mFabAdd" class="hidden" label="Thêm học viên">＋</gl-fab>
      <gl-bottom-sheet id="mViewMoreSheet" heading="Chế độ xem thêm">
        <div class="m-sheet-list">
          <button type="button" class="m-sheet-list-btn" data-view="rank">🏆 Xếp hạng</button>
          <button type="button" class="m-sheet-list-btn" data-view="stats">📈 Thống kê</button>
          <button type="button" class="m-sheet-list-btn" data-view="print">🖨️ Bản in</button>
          <button type="button" class="m-sheet-list-btn" data-action="reports">📊 Báo cáo nhanh</button>
          <button type="button" class="m-sheet-list-btn admin-only hidden" data-action="weights">⚖️ Hệ số cột</button>
        </div>
      </gl-bottom-sheet>
      <select id="mClassSelect" class="m-class-select hidden" aria-label="Chọn lớp"></select>
    `
  }

  private _renderSidebarScrim() {
    return html`
      <div class="sidebar-scrim" id="sidebarScrim" @click=${this.closeMobileDrawer}></div>
    `
  }

  private _renderSidebar() {
    return html`
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
          <button type="button" class="m-drawer-close" id="mCloseDrawer" aria-label="Đóng" @click=${this.closeMobileDrawer}>×</button>
        </div>
        <div class="sidebar-body">
          <div class="sidebar-user" id="sidebarUser"></div>

          <div class="year-filter-box">
            <label class="field-label" for="yearFilterSelect">Năm học</label>
            <select id="yearFilterSelect" title="Lọc lớp · dashboard · xuất nhiều lớp" @change=${this._onYearFilterChange}></select>
            <p class="hint" style="margin:6px 0 0;font-size:0.72rem">Lọc lớp · dashboard · xuất nhiều lớp</p>
          </div>

          <button type="button" class="btn btn-ghost btn-block nav-home-btn mb-2" id="openDashboardBtn" title="Tổng quan giáo xứ / năm học" @click=${() => { this._switchView('dashboard'); this.closeMobileDrawer() }}>
            📊 Tổng quan năm học
          </button>

          <div class="sidebar-accordion open" id="classesAccordion">
            <button type="button" class="sidebar-acc-toggle" id="classesToggle" aria-expanded="true" aria-controls="classesPanel" @click=${this._onAccordionToggle}>
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
              <div class="class-list" id="classList" @click=${this._onClassListClick} @change=${this._onClassListChange}></div>
              <div class="new-class-form">
                <input type="text" id="newClassName" class="input" placeholder="Tên lớp (vd: Ấu Nhi 1A)" maxlength="60" aria-label="Tên lớp mới" />
                <div class="d-flex gap-2 mt-2">
                  <input type="text" id="newClassYear" class="input flex-1" placeholder="Năm học (để trống nếu giữ nguyên)" maxlength="20" aria-label="Năm học" />
                  <button type="button" class="btn btn-primary btn-sm" id="createClassBtn" @click=${this._onCreateClass}>Tạo</button>
                </div>
              </div>
            </div>
          </div>

          <div class="sidebar-accordion open" id="dataAccordion">
            <button type="button" class="sidebar-acc-toggle" id="dataToggle" aria-expanded="true" aria-controls="dataPanel" @click=${this._onAccordionToggle}>
              <span class="sidebar-acc-label">
                <span class="sidebar-acc-title">📥 Dữ liệu & Xuất nhập</span>
              </span>
              <span class="sidebar-acc-chevron" aria-hidden="true">▾</span>
            </button>
            <div class="sidebar-acc-panel" id="dataPanel">
              <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="exportBtn" @click=${this._exportClassScores}><span class="tool-icon">📥</span> Xuất điểm lớp hiện tại</button>
              <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="bulkExportBtn" @click=${this._openBulkExportModal}><span class="tool-icon">🗂️</span> Xuất báo cáo giáo xứ</button>
              <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="importBtn" @click=${this._importClassScores}><span class="tool-icon">📤</span> Nhập điểm Excel/CSV</button>
            </div>
          </div>

          <div class="sidebar-accordion open" id="academicAccordion">
            <button type="button" class="sidebar-acc-toggle" id="academicToggle" aria-expanded="true" aria-controls="academicPanel" @click=${this._onAccordionToggle}>
              <span class="sidebar-acc-label">
                <span class="sidebar-acc-title">📋 Học vụ & Báo cáo</span>
              </span>
              <span class="sidebar-acc-chevron" aria-hidden="true">▾</span>
            </button>
            <div class="sidebar-acc-panel" id="academicPanel">
              <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="reportsBtn" @click=${() => this.modalRegistry.openReports()}><span class="tool-icon">📊</span> Báo cáo nhanh</button>
              <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="inviteBtn" @click=${() => this._openParentInvite()}><span class="tool-icon">✉️</span> Mời phụ huynh liên kết</button>
              <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="missingScoresBtn" @click=${() => this.modalRegistry.openMissingScores()}><span class="tool-icon">📋</span> Danh sách điểm thiếu</button>
            </div>
          </div>

          <div class="sidebar-accordion open" id="systemAccordion">
            <button type="button" class="sidebar-acc-toggle" id="systemToggle" aria-expanded="true" aria-controls="systemPanel" @click=${this._onAccordionToggle}>
              <span class="sidebar-acc-label">
                <span class="sidebar-acc-title">⚙️ Hệ thống</span>
              </span>
              <span class="sidebar-acc-chevron" aria-hidden="true">▾</span>
            </button>
            <div class="sidebar-acc-panel" id="systemPanel">
              <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="usersBtn" @click=${() => this.modalRegistry.openUserManagement()}><span class="tool-icon">👥</span> Quản lý tài khoản</button>
              <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="backupBtn" @click=${() => this._openBackupModal()}><span class="tool-icon">💾</span> Sao lưu JSON định kỳ</button>
              <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="settingsBtn" @click=${() => this._openSettingsModal()}><span class="tool-icon">⚙️</span> Cấu hình hệ thống</button>
              <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="helpBtn" @click=${() => this.modalRegistry.openHelp()}><span class="tool-icon">❓</span> Hướng dẫn sử dụng</button>
            </div>
          </div>

          <div id="recentClassesSection" class="sidebar-accordion open" style="display:none;">
            <button type="button" class="sidebar-acc-toggle" id="recentClassesToggle" aria-expanded="true" @click=${this._onAccordionToggle}>
              <span class="sidebar-acc-label">
                <span class="sidebar-acc-title">🕐 Gần đây</span>
              </span>
              <span class="sidebar-acc-chevron" aria-hidden="true">▾</span>
            </button>
            <div class="sidebar-acc-panel" id="recentClassesPanel"></div>
          </div>

          <p class="hint sidebar-tip mt-4">💡 Mẹo: Sao lưu JSON định kỳ · Đổi PIN bảo mật · Chỉ GLV mới có quyền xuất điểm lớp học.</p>
          <button type="button" class="sidebar-collapse-btn" id="sidebarCollapseBtn" title="Thu gọn sidebar" aria-label="Thu gọn sidebar" @click=${this._onSidebarCollapse}>◀</button>
        </div>
      </aside>
    `
  }

  // ============================================================
  // Shell Delegate Methods
  // ============================================================

  private _onSidebarCollapse() {
    this.shellCtrl.toggleSidebarCollapse()
  }

  private closeMobileDrawer() {
    this.shellCtrl.closeMobileDrawer()
  }

  private _updateSyncUI(status: any) {
    this.shellCtrl.updateSyncUI(status)
  }

  // ============================================================
  // Year Filter
  // ============================================================

  private _onYearFilterChange(e: Event) {
    const select = e.target as HTMLSelectElement
    this.stateManager.setYearFilter(select.value || null)
    this._renderCurrentView()
  }

  // ============================================================
  // Class List Delegates
  // ============================================================

  private _onClassListClick(e: Event) {
    this.classListCtrl.onClassListClick(e)
  }

  private _onClassListChange(e: Event) {
    this.classListCtrl.onClassListChange(e)
  }

  private _onAccordionToggle(e: Event) {
    const btn = e.currentTarget as HTMLElement
    const accordion = btn.closest('.sidebar-accordion')
    if (!accordion) return
    const isOpen = accordion.classList.toggle('open')
    btn.setAttribute('aria-expanded', String(isOpen))
    const key = `${accordion.id}-accordion-open`
    try { localStorage.setItem(key, isOpen ? '1' : '0') } catch {}
  }

  private _onCreateClass() {
    this.classListCtrl.onCreateClass()
  }

  // ============================================================
  // Layout & View Switching
  // ============================================================

  private _switchView(view: 'dashboard' | 'class' | 'profile') {
    if (view === this.currentView) return

    const prevView = this.currentView
    this.currentView = view

    const NAV_MAP: Record<string, string> = { home: 'dashboard', classes: 'class', scores: 'class', me: 'profile' }
    const nav = this.querySelector('#mBottomNav') as any
    if (nav) {
      const tabEntry = Object.entries(NAV_MAP).find(([, v]) => v === view)
      if (tabEntry) nav.activeTab = tabEntry[0]
    }

    const order = ['dashboard', 'class', 'profile']
    const prevIdx = order.indexOf(prevView)
    const nextIdx = order.indexOf(view)
    const direction = nextIdx > prevIdx ? 'right' : 'left'

    const panelMap: Record<string, string> = {
      dashboard: 'dashboardView',
      class: 'classView',
      profile: 'meView',
    }
    const targetPanel = panelMap[view] || `${view}View`

    this.querySelectorAll('.view-panel').forEach(panel => {
      if (panel.id !== targetPanel) {
        panel.classList.add('hidden')
        panel.classList.remove('view-enter-right', 'view-enter-left')
      } else {
        panel.classList.remove('hidden')
        panel.classList.remove('view-enter-right', 'view-enter-left')
        void (panel as HTMLElement).offsetWidth
        panel.classList.add(direction === 'right' ? 'view-enter-right' : 'view-enter-left')
      }
    })

    const titles: Record<string, { title: string; sub: string }> = {
      dashboard: { title: 'Sổ Điểm', sub: 'Tổng quan' },
      class: { title: this._getActiveClassName() || 'Điểm', sub: 'Điểm lớp' },
      profile: { title: 'Cá nhân', sub: 'Hồ sơ & cài đặt' },
    }
    const info = titles[view] || titles.dashboard
    const topbar = this.querySelector('#mTopBar') as any
    if (topbar) {
      topbar.title = info.title
      topbar.subtitle = info.sub
    }

    const fab = this.querySelector('#mFabAdd') as HTMLElement
    if (fab) fab.classList.toggle('hidden', view !== 'class')

    const classSelect = this.querySelector('#mClassSelect') as HTMLSelectElement
    if (classSelect) classSelect.classList.toggle('hidden', view !== 'class')

    this._renderCurrentView()
    this.requestUpdate()
  }

  private _selectClass(classId: string) {
    this.activeClassId = classId
    this.stateManager.setActiveClass(classId)
    this._updateClassSelector()
    this.classListCtrl.trackRecentClass(classId)
    if (this.currentView !== 'class') {
      this._switchView('class')
    } else {
      this._renderCurrentView()
    }
  }

  private _showSkeleton(pane: HTMLElement, type: 'dashboard' | 'class' | 'profile') {
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
      </div>`,
    }
    pane.innerHTML = skeletons[type] || skeletons.dashboard
  }

  private _renderCurrentView() {
    this.classListCtrl.updateClassList()

    switch (this.currentView) {
      case 'dashboard': {
        const dash = this.querySelector('#dashboardView') as any
        if (dash) {
          dash.stateManager = this.stateManager
          dash.authManager = this.authManager
          dash.active = true
          dash.requestUpdate()
        }
        break
      }
      case 'class': {
        const pane = this.querySelector('#classView') as HTMLElement
        if (pane && this.activeClassId) {
          const cid = this.activeClassId
          this._showSkeleton(pane, 'class')
          requestAnimationFrame(() => {
            if (!pane.isConnected) return
            this.classView.render(pane, cid)
          })
        }
        break
      }
      case 'profile': {
        const pane = this.querySelector('#meView') as HTMLElement
        if (pane) {
          this._showSkeleton(pane, 'profile')
          requestAnimationFrame(() => {
            if (!pane.isConnected) return
            pane.innerHTML = ''
            const profileView = document.createElement('gl-profile-view')
            profileView.setAttribute('style', 'display:contents')
            ;(profileView as any).stateManager = this.stateManager
            ;(profileView as any).authManager = this.authManager
            profileView.addEventListener('gl-profile-action', ((e: CustomEvent) => {
              this._handleProfileAct(e.detail.action)
            }) as EventListener)
            pane.appendChild(profileView)
          })
        }
        break
      }
    }
  }

  // ============================================================
  // Dashboard Event Handlers (from <gl-dashboard>)
  // ============================================================

  private _onDashSelectClass(e: CustomEvent) {
    this._selectClass(e.detail.classId)
  }

  private _onDashExportReport() {
    this._exportParishReport()
  }

  private _onDashCompareYears() {
    this._openYearCompare()
  }

  private _onDashToggleArchive() {
    this._toggleArchiveCurrentYear()
  }

  private _onDashScrollToStudent(e: CustomEvent) {
    if (e.detail.classId) this._selectClass(e.detail.classId)
    if (e.detail.studentId) {
      requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent('gl:scroll-to-student', { detail: { studentId: e.detail.studentId } }))
      })
    }
  }

  // ============================================================
  // Profile Action Handler
  // ============================================================

  private async _handleProfileAct(action: string) {
    if (action === 'backup' || action === 'restore') {
      this._openBackupModal()
    } else if (action === 'pin') {
      await this._handleChangePin()
    } else if (action === 'biometric') {
      this.notificationManager?.show('Tính năng sinh trắc học đang phát triển', 'info')
    } else if (action === 'invite') {
      this._openParentInvite()
    } else if (action === 'columns') {
      this._openColumnsModal()
    } else if (action === 'theme') {
      this.modalRegistry.openThemeModal()
    } else if (action === 'settings') {
      this._openSettingsModal()
    } else if (action === 'print-settings') {
      this.modalRegistry.openPrintModal()
    } else if (action === 'parish-report') {
      this._exportParishReport()
    } else if (action === 'year-compare') {
      this._openYearCompare()
    } else if (action === 'archive-year') {
      this._toggleArchiveCurrentYear()
    } else if (action === 'notification-permission') {
      if (this.notificationManager!.isWebPermissionGranted) {
        this.notificationManager?.show('Thông báo đã được bật', 'success')
      } else if (this.notificationManager!.isWebPermissionDenied) {
        this.notificationManager?.show(
          'Thông báo đã bị chặn. Vào Cài đặt trình duyệt → Quyền riêng tư → Thông báo để bật lại.',
          'warning',
          { title: 'Bị chặn', duration: 6000 }
        )
      } else {
        const granted = await this.notificationManager!.requestWebPermission()
        if (granted) {
          this.notificationManager?.show('Đã bật thông báo! Bạn sẽ nhận nhắc nhở thiếu điểm.', 'success')
        } else {
          this.notificationManager?.show('Không thể bật thông báo. Bạn vẫn nhận thông báo trong ứng dụng.', 'info')
        }
      }
    } else if (action === 'install') {
      const installed = await triggerInstall()
      if (installed) {
        this.notificationManager?.show('Đã cài đặt ứng dụng!', 'success')
      }
    } else if (action === 'help') {
      this._openAboutDialog()
    } else if (action === 'feedback') {
      this.notificationManager?.show('Góp ý / Báo lỗi: liên hệ nhà phát triển', 'info')
    } else if (action === 'logout') {
      const ok = await this.notificationManager!.confirm(
        'Bạn có chắc chắn muốn đăng xuất?',
        { title: 'Đăng xuất?', type: 'warning', confirmText: 'Đăng xuất', cancelText: 'Hủy' }
      )
      if (ok) {
        await this.authManager!.logout()
        window.dispatchEvent(new CustomEvent('gl:logout'))
      }
    }
  }

  // ============================================================
  // Sidebar Tools / Actions
  // ============================================================

  private _exportParishReport() {
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
    this.notificationManager?.show('Đã xuất báo cáo Ban GL (CSV + bản in)', 'success')
  }

  private _openYearCompare() {
    const years = this.stateManager.getYears()
    if (years.length < 2) {
      this.notificationManager?.show('Cần ít nhất 2 năm học để so sánh', 'warning')
      return
    }
    const yearA = years[1]
    const yearB = years[0]
    const rows = compareYears(this.stateManager.getAllClasses(), yearA, yearB)
    const lines = [
      `So sánh ${yearA} ↔ ${yearB}`,
      ...rows.map(r => `${r.metric}: ${r.yearA} → ${r.yearB}`),
    ]
    this.notificationManager?.alert(lines.join('\n'), 'So sánh năm học')
  }

  private async _toggleArchiveCurrentYear() {
    const year = this.stateManager.getState().yearFilter || this.stateManager.getYears()[0]
    if (!year) {
      this.notificationManager?.show('Chưa có năm học', 'warning')
      return
    }
    if (this.stateManager.isYearArchived(year)) {
      this.stateManager.unarchiveYear(year)
      this.notificationManager?.show(`Đã mở lại năm ${year}`, 'success')
    } else {
      const ok = await this.notificationManager!.confirm(
        `Lưu trữ năm học ${year}? Điểm các lớp năm này sẽ chỉ xem, không sửa.`,
        { title: 'Lưu trữ năm học?', type: 'warning', confirmText: 'Lưu trữ', cancelText: 'Hủy' }
      )
      if (ok) {
        this.stateManager.archiveYear(year)
        this.notificationManager?.show(`Đã lưu trữ năm ${year}`, 'success')
      }
    }
    this._updateYearFilterSelect()
    this._renderCurrentView()
  }

  private _exportClassScores() {
    if (!this.activeClassId) {
      this.notificationManager?.show('Chưa chọn lớp', 'warning')
      return
    }
    const cls = this.stateManager.getClass(this.activeClassId)
    if (!cls) return
    const cols = resolveClassColumns(cls)
    const header = ['STT', 'Tên thánh', 'Họ đệm', 'Tên', ...cols.map(c => c.short), 'TB']
    const term = this._getActiveTerm()
    const rows = cls.students.map((st: any, i: number) => {
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
    this.notificationManager?.show(`Đã xuất điểm lớp "${cls.name}"`, 'success')
  }

  private async _importClassScores() {
    const confirmExcel = await this.notificationManager!.confirm(
      'Bạn muốn import điểm từ file Excel (.xlsx)?',
      { title: 'Import điểm', type: 'info', confirmText: '📊 Import Excel', cancelText: '📄 File JSON / CSV' }
    )
    if (confirmExcel) {
      await import('./components/gl-excel-import')
      let el = document.getElementById('excelImportModal') as any
      if (!el) {
        el = document.createElement('gl-excel-import')
        el.id = 'excelImportModal'
        el.stateManager = this.stateManager
        el.notification = this.notificationManager!
        document.body.appendChild(el)
      }
      const currentClassId = this.activeClassId && this.stateManager.getClass(this.activeClassId) ? this.activeClassId : null
      el.classId = currentClassId
      el.setComplete(() => {
        const newActiveId = this.stateManager.getState().activeClassId
        if (newActiveId && newActiveId !== this.activeClassId) {
          this.activeClassId = newActiveId
        }
        if (this.currentView === 'class' && this.activeClassId) {
          this.classView?.rerenderStudents()
        } else {
          this._renderCurrentView()
          this._updateYearFilterSelect()
        }
        this._renderCurrentView()
      })
      el.open = true
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
          this.notificationManager?.show('Chưa chọn lớp — hãy chọn lớp trước khi nhập CSV', 'warning')
          return
        }
        await this._importCsvFile(file)
      } else {
        const ok = await this.backupService!.importBackupFile(file, 'replace')
        if (ok) {
          this._renderCurrentView()
          this._updateYearFilterSelect()
          this._updateClassSelector()
        }
      }
    })
    input.click()
  }

  private async _importCsvFile(file: File) {
    if (!this.activeClassId) return
    const cls = this.stateManager.getClass(this.activeClassId)
    if (!cls) return

    const cols = resolveClassColumns(cls)
    const text = await file.text()
    const rows = parseCSV(text)
    if (rows.length < 2) {
      this.notificationManager?.show('File CSV không có dữ liệu', 'error')
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
      this.notificationManager?.show('Không tìm thấy cột điểm nào khớp với lớp hiện tại', 'error')
      return
    }

    const term = this._getActiveTerm()
    const nameKey = ['Tên thánh', 'Họ đệm', 'Tên'].every(k => header.includes(k))
    let imported = 0
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r]
      if (!row || row.length < 2) continue
      let student
      if (nameKey) {
        const csvTenThanh = (row[header.indexOf('Tên thánh')] || '').trim()
        const csvHoDem = (row[header.indexOf('Họ đệm')] || '').trim()
        const csvTen = (row[header.indexOf('Tên')] || '').trim()
        student = cls.students.find((st: any) =>
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
      this.classView?.rerenderStudents()
    }
    this.notificationManager?.show(`Đã nhập điểm cho ${imported}/${rows.length - 1} học viên từ CSV`, 'success')
  }

  // ============================================================
  // Modals
  // ============================================================

  private _openBulkExportModal() { this.modalRegistry.openBulkExport() }

  private async _openAddStudent() {
    if (!this.activeClassId) return
    this.modalRegistry.openAddStudent(this.activeClassId)
  }

  private async _openColumnsModal() {
    const classId = this.activeClassId || this.stateManager.getState().activeClassId
    if (!classId) return
    this.modalRegistry.openColumnsModal(classId, () => this._renderCurrentView())
  }

  private async _openParentInvite() {
    this.modalRegistry.openParentInvite(this.activeClassId || this.stateManager.getState().activeClassId)
  }

  private async _openSettingsModal() {
    const currentUrl = supabaseService.getUrl()
    const currentKey = supabaseService.getKey()
    const hideDefault = !confirm(
      'Bạn có muốn cấu hình Supabase Cloud?\n\nHiện tại đang dùng: ' +
      (currentUrl ? currentUrl.slice(0, 30) + '…' : 'mặc định') +
      '\n\nNhấn OK để cấu hình, Cancel nếu chưa cần.'
    )
    if (!hideDefault) {
      const url = await this._promptDialog('Supabase URL', 'Nhập Supabase Project URL:', currentUrl || 'https://')
      if (!url) return
      const key = await this._promptDialog('Supabase Anon Key', 'Nhập Supabase anon key:', currentKey || '')
      if (!key) return
      supabaseService.configure(url, key)
      this.notificationManager?.show('Đã lưu cấu hình Supabase', 'success')
    }
  }

  private _openBackupModal() {
    this.modalRegistry.openBackupModal(() => {
      this._updateYearFilterSelect()
      this._updateClassSelector()
      this._renderCurrentView()
    })
  }

  private _openJournalLogModal(student: any, classId: string, className: string) {
    this.modalRegistry.openJournalLog(student, classId, className)
  }

  // ============================================================
  // Dialogs
  // ============================================================

  private _promptDialog(title: string, message: string, defaultValue: string): Promise<string | null> {
    return new Promise((resolve) => {
      this.notificationManager?.init?.()
      const overlay = document.getElementById('appDialog')
      const titleEl = document.getElementById('appDialogTitle')
      const messageEl = document.getElementById('appDialogMessage')
      const okBtn = document.getElementById('appDialogOk')
      const cancelBtn = document.getElementById('appDialogCancel')
      if (!overlay || !titleEl || !okBtn || !cancelBtn) return

      titleEl.textContent = title
      messageEl!.innerHTML = `
        <div class="mb-2">${message}</div>
        <input type="text" id="dialogPromptInput" value="${defaultValue.replace(/"/g, '&quot;')}" class="w-full p-2 rounded-sm" style="border:1px solid var(--border);box-sizing:border-box" aria-label="Nhập giá trị" />
      `
      okBtn.textContent = 'Đồng ý'
      cancelBtn.textContent = 'Hủy'

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
        this.notificationManager?.rebindDialog()
        resolve(result)
      }
      const onOk = () => cleanup(input.value.trim())
      const onCancel = () => cleanup(null)
      const onOverlayClick = (e: MouseEvent) => {
        if (e.target === overlay) cleanup(null)
      }
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') cleanup(null)
        else if (e.key === 'Enter') cleanup(input.value.trim())
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

  private async _handleChangePin() {
    const user = this.authManager?.getCurrentUser()
    if (!user) return
    const oldPin = await this._promptDialog('Đổi PIN', 'Nhập PIN cũ:', '')
    if (!oldPin) return
    const newPin = await this._promptDialog('Đổi PIN', 'Nhập PIN mới (4–6 số):', '')
    if (!newPin || newPin.length < 4 || newPin.length > 6) {
      this.notificationManager?.show('PIN phải từ 4–6 số', 'error')
      return
    }
    const confirmPin = await this._promptDialog('Đổi PIN', 'Xác nhận PIN mới:', '')
    if (newPin !== confirmPin) {
      this.notificationManager?.show('PIN xác nhận không khớp', 'error')
      return
    }
    const result = await this.authManager!.changePin(user.id, oldPin, newPin)
    if (result.ok) {
      this.notificationManager?.show('Đã đổi PIN thành công', 'success')
    } else {
      this.notificationManager?.show(result.error || 'Đổi PIN thất bại', 'error')
    }
  }

  private _openAboutDialog() {
    this.notificationManager?.alert(
      'Sổ Điểm Giáo Lý v2.0.0\n\nỨng dụng nhập điểm, xếp loại, đồng bộ đám mây.\nDữ liệu lưu offline trên trình duyệt.\n\nPhát triển bởi Ban Giáo lý.',
      'ℹ️ Giới thiệu'
    )
  }

  // ============================================================
  // Selector & Status Updates
  // ============================================================

  private _updateClassSelector() {
    const select = this.querySelector('#mClassSelect') as HTMLSelectElement
    if (!select) return
    const classes = this.stateManager.getAllClasses()
    const activeId = this.stateManager.getState().activeClassId
    select.innerHTML = classes.map(c =>
      `<option value="${c.id}" ${c.id === activeId ? 'selected' : ''}>${this._escape(c.name)} ${c.year ? `· ${this._escape(c.year)}` : ''}</option>`
    ).join('')
  }

  private _updateYearFilterSelect() {
    const select = this.querySelector('#yearFilterSelect') as HTMLSelectElement
    if (!select) return
    const years = this.stateManager.getYears()
    const current = this.stateManager.getState().yearFilter
    const archived = this.stateManager.getState().archivedYears || []
    select.innerHTML =
      `<option value="">Tất cả năm</option>` +
      years.map(y => {
        const tag = archived.includes(y) ? ' (đã lưu trữ)' : ''
        return `<option value="${this._escape(y)}" ${current === y ? 'selected' : ''}>${this._escape(y)}${tag}</option>`
      }).join('')
  }

  private _getActiveClassName(): string | null {
    if (!this.activeClassId) return null
    return this.stateManager.getClass(this.activeClassId)?.name || null
  }

  private _getActiveTerm(): 'hk1' | 'hk2' {
    const term = this.stateManager.getState().activeTerm
    return term === 'year' ? 'hk1' : term
  }

  private _escape(s: string): string {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
}

customElements.define('gl-app-shell', GlAppShell)

declare global {
  interface HTMLElementTagNameMap {
    'gl-app-shell': GlAppShell
  }
}
