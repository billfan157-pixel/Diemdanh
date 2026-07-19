// ============================================================
// Sổ Điểm GL — Main App View
// ============================================================

import { StateManager } from '../StateManager'
import { AuthManager } from '../../core/auth/AuthManager'
import { SyncManager } from '../../services/sync/SyncManager'
import { NotificationManager } from '../../services/NotificationManager'
import { COLS, displayName, classifyStudent } from '../../config/constants.ts'
import { studentYearTB } from '../../core/calc.ts'

export class AppView {
  private stateManager: StateManager
  private authManager: AuthManager
  private syncManager: SyncManager
  private notificationManager: NotificationManager

  private element: HTMLElement | null = null
  private currentView: 'dashboard' | 'class' | 'profile' = 'dashboard'
  private activeClassId: string | null = null

  constructor(
    stateManager: StateManager,
    authManager: AuthManager,
    syncManager: SyncManager,
    notificationManager: NotificationManager
  ) {
    this.stateManager = stateManager
    this.authManager = authManager
    this.syncManager = syncManager
    this.notificationManager = notificationManager
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

    // Bottom navigation
    this.element.querySelectorAll('.m-nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement
        const view = target.dataset.mNav
        if (view) this.switchView(view as any)
      })
    })

    // FAB - Add student
    const fab = this.element.querySelector('#mFabAdd') as HTMLButtonElement
    fab?.addEventListener('click', () => this.openAddStudent())

    // Class selector
    const classSelect = this.element.querySelector('#mClassSelect') as HTMLSelectElement
    classSelect?.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement
      if (target.value) this.selectClass(target.value)
    })

    // View more sheet
    const moreSheetTrigger = this.element.querySelector('#mViewMoreTrigger')
    moreSheetTrigger?.addEventListener('click', () => this.openViewMoreSheet())

    const moreSheetClose = this.element.querySelector('#mViewMoreClose')
    moreSheetClose?.addEventListener('click', () => this.closeViewMoreSheet())

    // Search
    const searchInput = this.element.querySelector('#searchInput') as HTMLInputElement
    searchInput?.addEventListener('input', this.debounce((e: Event) => {
      const target = e.target as HTMLInputElement
      this.handleSearch(target.value)
    }, 150))

    // Class list click delegation (select, rename, delete)
    const classList = this.element.querySelector('#classList')
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
        this.selectClass(id)
        const sidebar = this.element!.querySelector('#sidebar')
        sidebar?.classList.remove('open')
        const scrim = this.element!.querySelector('#sidebarScrim')
        scrim?.setAttribute('hidden', 'true')
      }
    })

    // Create class
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

      this.stateManager.createClass(name, year)
      nameInput.value = ''
      yearInput.value = ''
      this.notificationManager.show('Đã tạo lớp thành công', 'success')
      this.renderCurrentView()
      this.updateClassSelector()
    })

    // Mobile sidebar toggle
    const openDrawerBtn = this.element.querySelector('#mOpenDrawer')
    const closeDrawerBtn = this.element.querySelector('#mCloseDrawer')
    const sidebar = this.element.querySelector('#sidebar')
    const scrim = this.element.querySelector('#sidebarScrim')

    openDrawerBtn?.addEventListener('click', () => {
      sidebar?.classList.add('open')
      scrim?.removeAttribute('hidden')
    })

    closeDrawerBtn?.addEventListener('click', () => {
      sidebar?.classList.remove('open')
      scrim?.setAttribute('hidden', 'true')
    })

    scrim?.addEventListener('click', () => {
      sidebar?.classList.remove('open')
      scrim?.setAttribute('hidden', 'true')
    })

    // Profile menu actions click delegation
    const meView = this.element.querySelector('#meView')
    meView?.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement
      const row = target.closest('[data-me-action]')
      if (!row) return

      const action = row.getAttribute('data-me-action')
      if (action === 'logout') {
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
    })

    // Listen for state changes
    this.stateManager.subscribe(() => this.renderCurrentView())

    // Listen for sync status
    document.addEventListener('syncstatuschange', ((e: CustomEvent) => {
      this.updateSyncUI(e.detail)
    }) as EventListener)

    // Initial render
    this.updateClassSelector()
    this.updateSyncUI(this.syncManager.getStatus())
    this.renderCurrentView()
  }

  private debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout>
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => fn(...args), delay)
    }
  }

  private getTemplate(): string {
    return `
      <!-- Mobile: Top Bar -->
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

      <!-- Mobile: Drawer -->
      <div class="sidebar-scrim" id="sidebarScrim" hidden></div>
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
          <button type="button" class="sidebar-toggle" id="classesToggle" aria-expanded="true" aria-controls="classesPanel">
            <span class="sidebar-acc-label">
              <span class="sidebar-acc-title">Các lớp của bạn</span>
              <span class="sidebar-acc-count" id="classesToggleCount"></span>
            </span>
            <span class="sidebar-acc-chevron" aria-hidden="true">▾</span>
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

          <button type="button" class="btn btn-ghost btn-block nav-home-btn" id="openDashboardBtn" title="Tổng quan giáo xứ / năm học" style="margin-bottom:8px">
            📊 Tổng quan năm học
          </button>

          <div class="sidebar-accordion open" id="classesAccordion">
            <button type="button" class="sidebar-acc-toggle" id="classesToggle" aria-expanded="true" aria-controls="classesPanel">
              <span class="sidebar-acc-label">
                <span class="sidebar-acc-title">Các lớp của bạn</span>
                <span class="sidebar-acc-count" id="classesToggleCount"></span>
              </span>
              <span class="sidebar-acc-chevron" aria-hidden="true">▾</span>
            </button>
            <div class="sidebar-acc-panel" id="classesPanel">
              <div class="class-list" id="classList"></div>
              <div class="new-class-form">
                <input type="text" id="newClassName" class="input" placeholder="Tên lớp (vd: Ấu Nhi 1A)" maxlength="60" />
                <div style="display:flex;gap:8px;margin-top:8px">
                  <input type="text" id="newClassYear" class="input" placeholder="Năm học (để trống nếu giữ nguyên)" maxlength="20" style="flex:1" />
                  <button type="button" class="btn btn-primary btn-sm" id="createClassBtn">Tạo</button>
                </div>
              </div>
            </div>
          </div>

          <div class="section-label">Công cụ</div>
          <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="exportBtn">📥 Xuất điểm</button>
          <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="importBtn">📥 Nhập điểm</button>
          <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="reportsBtn">📊 Báo cáo nhanh</button>
          <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="inviteBtn">📝 Mời phụ huynh</button>
          <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="backupBtn">💾 Sao lưu JSON</button>
          <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="settingsBtn">⚙️ Cài đặt</button>
          <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="aboutBtn">ℹ️ Giới thiệu</button>

          <p class="hint sidebar-tip" style="margin-top:14px">💡 Sao lưu JSON định kỳ · Đổi PIN khỏi 1234 · GLV chỉ xuất điểm.</p>
        </div>
      </aside>

      <!-- Mobile: bottom navigation -->
      <nav class="m-bottom-nav" id="mBottomNav" aria-label="Điều hướng chính">
        <div class="m-bottom-nav-inner">
          <button type="button" class="m-nav-item active" data-m-nav="home" aria-current="page">
            <svg class="m-nav-glyph m-nav-glyph-home" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
            <span class="m-nav-lab">Tổng quan</span>
          </button>
          <button type="button" class="m-nav-item" data-m-nav="classes">
            <svg class="m-nav-glyph m-nav-glyph-class" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><path d="M8 7h8M8 11h6"/>
            </svg>
            <span class="m-nav-lab">Lớp</span>
          </button>
          <button type="button" class="m-nav-item m-nav-item-primary" data-m-nav="scores">
            <span class="m-nav-primary-ring" aria-hidden="true">
              <svg class="m-nav-glyph m-nav-glyph-score" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/><path d="M15 4h3a2 2 0 012 2v1"/></svg>
            </span>
            <span class="m-nav-lab">Điểm</span>
          </button>
          <button type="button" class="m-nav-item" data-m-nav="me">
            <svg class="m-nav-glyph m-nav-glyph-me" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <span class="m-nav-lab">Cá nhân</span>
          </button>
        </div>
      </nav>

      <!-- FAB: Add Student -->
      <button type="button" class="m-fab hidden" id="mFabAdd" title="Thêm học viên" aria-label="Thêm học viên">
        <span class="m-fab-ico">＋</span>
        <span class="m-fab-label">Thêm học viên</span>
      </button>

      <!-- Mobile: View More Sheet -->
      <div class="m-sheet-overlay hidden" id="mViewMoreSheet" role="dialog" aria-modal="true" aria-labelledby="mViewMoreTitle">
        <div class="m-sheet m-sheet-sm">
          <div class="m-sheet-handle" aria-hidden="true"></div>
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
          <p class="m-sheet-hint">Chạm ngoài để đóng</p>
        </div>
      </div>

      <!-- Class Selector (Mobile) -->
      <select id="mClassSelect" class="m-class-select hidden" aria-label="Chọn lớp"></select>

      <!-- MAIN CONTENT -->
      <main class="main" id="mainContent">
        <div id="dashboardView" class="view-panel" role="region" aria-label="Tổng quan"></div>
        <div id="classView" class="view-panel hidden" role="region" aria-label="Điểm lớp"></div>
        <div id="meView" class="view-panel hidden" role="region" aria-label="Cá nhân"></div>
      </main>

      <!-- Toast Host -->
      <div class="toast-host" id="toastHost" aria-live="polite" aria-relevant="additions"></div>



      <!-- Sync Status Indicator -->
      <div class="sync-indicator hidden" id="syncIndicator" aria-live="polite">
        <span class="sync-spinner" aria-hidden="true"></span>
        <span class="sync-text">Đang đồng bộ...</span>
      </div>
    `
  }

  // ============================================================
  // View Management
  // ============================================================

  private switchView(view: 'dashboard' | 'class' | 'profile'): void {
    if (view === this.currentView) return

    this.currentView = view

    // Update nav buttons
    this.element?.querySelectorAll('.m-nav-item').forEach(btn => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.mNav === view)
      btn.setAttribute('aria-current', (btn as HTMLElement).dataset.mNav === view ? 'page' : 'false')
    })

    // Update view panels
    this.element?.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.toggle('hidden', panel.id !== `${view}View`)
    })

    // Update top title
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

    // Show/hide FAB
    const fab = this.element?.querySelector('#mFabAdd') as HTMLElement
    if (fab) {
      if (view === 'class') {
        fab.classList.remove('hidden')
      } else {
        fab.classList.add('hidden')
      }
    }

    // Update class selector visibility
    const classSelect = this.element?.querySelector('#mClassSelect') as HTMLSelectElement
    if (classSelect) {
      classSelect.classList.toggle('hidden', view !== 'class')
    }

    // Render view content
    this.renderCurrentView()
  }

  private getActiveClassName(): string | null {
    if (!this.activeClassId) return null
    const cls = this.stateManager.getClass(this.activeClassId)
    return cls?.name || null
  }

  private selectClass(classId: string): void {
    this.activeClassId = classId
    this.stateManager.setActiveClass(classId)
    this.switchView('class')
  }

  private async openAddStudent(): Promise<void> {
    if (!this.activeClassId) return

    // Open add student modal
    const { AddStudentModal } = await import('./modals/AddStudentModal')
    const modal = new AddStudentModal(this.stateManager, this.authManager)
    modal.open(this.activeClassId)
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
  // Render Helpers
  // ============================================================

  private renderCurrentView(): void {
    if (!this.element) return

    this.updateClassList()

    switch (this.currentView) {
      case 'dashboard':
        this.renderDashboard()
        break
      case 'class':
        this.renderClassView()
        break
      case 'profile':
        this.renderProfile()
        break
    }
  }

  private renderDashboard(): void {
    const container = this.element?.querySelector('#dashboardView') as HTMLElement
    if (!container) return

    container.innerHTML = `
      <div class="dashboard">
        <div class="dash-header">
          <h2>Tổng quan${this.stateManager.getState().yearFilter ? ` · ${this.stateManager.getState().yearFilter}` : ''}</h2>
          ${this.authManager.isAdmin() ? `
            <button class="btn btn-ghost btn-sm" id="dashRefreshBtn">🔄 Làm mới</button>
          ` : ''}
        </div>

        <div class="dash-stats">
          <div class="stat"><span class="stat-label">Lớp</span><span class="stat-value">${this.stateManager.getAllClasses().length}</span></div>
          <div class="stat"><span class="stat-label">Học viên</span><span class="stat-value">${this.getTotalStudents()}</span></div>
          <div class="stat"><span class="stat-label">TB cả năm</span><span class="stat-value">${this.getAvgYearTB().toFixed(2)}</span></div>
          <div class="stat"><span class="stat-label">Tốt</span><span class="stat-value">${this.getGoodPercent()}%</span></div>
        </div>

        <section class="dash-section">
          <h3>🏆 Xuất sắc</h3>
          ${this.renderTopStudents(5)}
        </section>

        <section class="dash-section">
          <h3>📉 Cần quan tâm</h3>
          ${this.renderAttentionStudents()}
        </section>

        <section class="dash-section">
          <h3>⚠️ Yếu (TB < 5)</h3>
          ${this.renderWeakStudents()}
        </section>

        <section class="dash-section">
          <h3>📋 Thiếu điểm</h3>
          ${this.renderMissingScores()}
        </section>
      </div>
    `
  }

  private renderClassView(): void {
    const container = this.element?.querySelector('#classView') as HTMLElement
    if (!container || !this.activeClassId) return

    const cls = this.stateManager.getClass(this.activeClassId)
    if (!cls) return

    container.innerHTML = `
      <div class="class-view">
        <div class="class-header">
          <h2>${cls.name} ${cls.year ? `· ${cls.year}` : ''}</h2>
          <div class="class-actions">
            <button class="btn btn-secondary btn-sm" id="addStudentBtn">➕ Thêm HV</button>
            <button class="btn btn-ghost btn-sm" id="classSettingsBtn">⚙️ Cài đặt</button>
          </div>
        </div>

        <div class="toolbar">
          <div class="m-seg term-switcher">
            <button type="button" class="term-btn ${this.stateManager.getState().activeTerm === 'hk1' ? 'active' : ''}" data-term="hk1">HK1</button>
            <button type="button" class="term-btn ${this.stateManager.getState().activeTerm === 'hk2' ? 'active' : ''}" data-term="hk2">HK2</button>
            <button type="button" class="term-btn ${this.stateManager.getState().activeTerm === 'year' ? 'active' : ''}" data-term="year">Cả năm</button>
          </div>

          <div class="m-seg view-switcher">
            <button type="button" class="view-btn ${this.stateManager.getState().viewMode === 'cards' ? 'active' : ''}" data-view="cards">🃏 Thẻ</button>
            <button type="button" class="view-btn ${this.stateManager.getState().viewMode === 'table' ? 'active' : ''}" data-view="table">📊 Bảng</button>
            <button type="button" class="view-btn ${this.stateManager.getState().viewMode === 'rank' ? 'active' : ''}" data-view="rank">🏆 Xếp hạng</button>
          </div>

          <div class="m-search-bar toolbar">
            <div class="search-wrap" style="flex:1">
              <input type="search" id="searchInput" class="input" placeholder="Tìm học viên..." aria-label="Tìm học viên" />
            </div>
          </div>
        </div>

        <div class="m-stat-strip" id="classStats"></div>

        <div id="studentsContainer"></div>
      </div>
    `
  }

  private renderProfile(): void {
    const container = this.element?.querySelector('#meView') as HTMLElement
    if (!container) return

    const user = this.authManager.getCurrentUser()

    container.innerHTML = `
      <div class="me-view">
        <div class="me-header">
          <div class="me-avatar">${user?.displayName?.charAt(0) || '?'}</div>
          <h2>${user?.displayName || 'Người dùng'}</h2>
          <p class="me-role">${user?.role === 'ban_gl' ? 'Ban Giáo lý' : 'Giáo lý viên'}</p>
        </div>

        <div class="me-section">
          <h3>Tài khoản</h3>
          <div class="me-row" data-me-action="pin">
            <div class="me-info">
              <strong>Đổi PIN</strong>
              <small>Thay đổi mã PIN đăng nhập</small>
            </div>
            <span class="me-chevron">▸</span>
          </div>
          <div class="me-row" data-me-action="biometric">
            <div class="me-info">
              <strong>Sinh trắc học</strong>
              <small>${this.authManager.getCurrentUser()?.biometricEnabled ? 'Đã bật' : 'Chưa bật'}</small>
            </div>
            <span class="me-chevron">▸</span>
          </div>
        </div>

        <div class="me-section">
          <h3>Dữ liệu</h3>
          <div class="me-row" data-me-action="backup">
            <div class="me-info">
              <strong>Sao lưu JSON</strong>
              <small>Tải file backup toàn bộ dữ liệu</small>
            </div>
            <span class="me-chevron">▸</span>
          </div>
          <div class="me-row" data-me-action="restore">
            <div class="me-info">
              <strong>Khôi phục backup</strong>
              <small>Chọn file để khôi phục</small>
            </div>
            <span class="me-chevron">▸</span>
          </div>
          <div class="me-row" data-me-action="export">
            <div class="me-info">
              <strong>Xuất Excel</strong>
              <small>Xuất điểm ra file Excel</small>
            </div>
            <span class="me-chevron">▸</span>
          </div>
        </div>

        <div class="me-section">
          <h3>Cài đặt</h3>
          <div class="me-row" data-me-action="settings">
            <div class="me-info">
              <strong>Cài đặt ứng dụng</strong>
              <small>Cấu hình Supabase, sao lưu tự động...</small>
            </div>
            <span class="me-chevron">▸</span>
          </div>
          <div class="me-row" data-me-action="print-settings">
            <div class="me-info">
              <strong>Mẫu in / Phiếu mời</strong>
              <small>Cấu hình giáo hạt, giáo xứ, tiêu đề...</small>
            </div>
            <span class="me-chevron">▸</span>
          </div>
        </div>

        <div class="me-section">
          <h3>Hỗ trợ</h3>
          <div class="me-row" data-me-action="help">
            <div class="me-info">
              <strong>Hướng dẫn</strong>
              <small>Xem cách sử dụng ứng dụng</small>
            </div>
            <span class="me-chevron">▸</span>
          </div>
          <div class="me-row" data-me-action="feedback">
            <div class="me-info">
              <strong>Góp ý / Báo lỗi</strong>
              <small>Gửi phản hồi cho nhà phát triển</small>
            </div>
            <span class="me-chevron">▸</span>
          </div>
        </div>

        <div class="me-section">
          <h3>Tài khoản</h3>
          <div class="me-row danger" data-me-action="logout">
            <div class="me-info">
              <strong>Đăng xuất</strong>
              <small>Thoát khỏi tài khoản hiện tại</small>
            </div>
          </div>
        </div>
      </div>
    `
  }

  // ============================================================
  // Dashboard Render Helpers
  // ============================================================

  private getTotalStudents(): number {
    return this.stateManager.getAllClasses().reduce((sum, c) => sum + c.students.length, 0)
  }

  private getAvgYearTB(): number {
    const classes = this.stateManager.getAllClasses()
    if (!classes.length) return 0
    const totals = classes.map(c => {
      const students = c.students
      if (!students.length) return 0
      const tbs = students.map(s => studentYearTB(s, c.weights)).filter((tb): tb is number => tb !== null)
      return tbs.length ? tbs.reduce((a, b) => a + b, 0) / tbs.length : 0
    })
    return totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0
  }

  private getGoodPercent(): number {
    const classes = this.stateManager.getAllClasses()
    const students = classes.flatMap(c => c.students.map(s => ({ ...s, classWeights: c.weights })))
    if (!students.length) return 0
    const good = students.filter(s => {
      const tb = studentYearTB(s, s.classWeights)
      return tb !== null && tb >= 8
    }).length
    return Math.round((good / students.length) * 100)
  }

  private renderTopStudents(limit: number): string {
    const students = this.stateManager.getAllClasses()
      .flatMap(c => c.students.map(s => ({
        ...s,
        className: c.name,
        classId: c.id,
        yearTB: studentYearTB(s, c.weights)
      })))
      .filter(s => s.yearTB !== null)
      .sort((a, b) => (b.yearTB || 0) - (a.yearTB || 0))
      .slice(0, limit)

    return students.map((s, i) => `
      <div class="dash-student ${i < 3 ? 'top-' + (i + 1) : ''}">
        <span class="rank">${i + 1}</span>
        <div class="info">
          <strong>${displayName(s as any)}</strong>
          <small>${s.className}</small>
        </div>
        <span class="tb score-${s.yearTB !== null ? classifyStudent(s.yearTB || 0).rank : 'none'}">${s.yearTB !== null ? s.yearTB.toFixed(2) : '—'}</span>
      </div>
    `).join('')
  }

  private renderAttentionStudents(): string {
    const students = this.stateManager.getAllClasses()
      .flatMap(c => c.students.map(s => ({
        ...s,
        className: c.name,
        yearTB: studentYearTB(s, c.weights)
      })))
      .filter(s => s.yearTB !== null && s.yearTB >= 5 && s.yearTB < 6.5)
      .sort((a, b) => (a.yearTB || 0) - (b.yearTB || 0))
      .slice(0, 10)

    return students.map(s => `
      <div class="dash-student">
        <div class="info">
          <strong>${displayName(s as any)}</strong>
          <small>${s.className}</small>
        </div>
        <span class="tb score-${classifyStudent(s.yearTB || 0).rank}">${s.yearTB?.toFixed(2)}</span>
      </div>
    `).join('')
  }

  private renderWeakStudents(): string {
    const students = this.stateManager.getAllClasses()
      .flatMap(c => c.students.map(s => ({
        ...s,
        className: c.name,
        yearTB: studentYearTB(s, c.weights)
      })))
      .filter(s => s.yearTB !== null && s.yearTB < 5)
      .sort((a, b) => (a.yearTB || 0) - (b.yearTB || 0))
      .slice(0, 10)

    return students.map(s => `
      <div class="dash-student weak">
        <div class="info">
          <strong>${displayName(s as any)}</strong>
          <small>${s.className}</small>
        </div>
        <span class="tb score-${classifyStudent(s.yearTB || 0).rank}">${s.yearTB?.toFixed(2)}</span>
      </div>
    `).join('')
  }

  private renderMissingScores(): string {
    const students = this.stateManager.getAllClasses()
      .flatMap(c => c.students.map(s => ({ ...s, className: c.name, classId: c.id })))
      .filter(s => this.hasMissingScores(s))
      .slice(0, 10)

    return students.map(s => `
      <div class="dash-student missing">
        <div class="info">
          <strong>${displayName(s as any)}</strong>
          <small>${s.className}</small>
        </div>
        <button class="btn btn-ghost btn-sm" data-missing-class="${s.classId}" data-missing-student="${s.id}">Xem</button>
      </div>
    `).join('')
  }

  private hasMissingScores(student: any): boolean {
    const term = this.stateManager.getState().activeTerm
    const scores = student.scoresByTerm?.[term]
    if (!scores) return false
    return COLS.some((col: any) => !scores[col.key]?.length)
  }

  // ============================================================
  // UI Update Helpers
  // ============================================================

  private updateClassList(): void {
    const el = this.element?.querySelector('#classList') as HTMLElement
    if (!el) return

    const classes = this.stateManager.getAllClasses()
    if (!classes.length) {
      el.innerHTML = `
        <div class="class-item empty hidden" style="display:none"></div>
        <div class="empty" style="padding:16px 8px;font-size:0.85rem">
          Chưa có lớp được giao.<br>
          ${this.authManager.isAdmin() ? 'Tạo lớp bên dưới 👇' : 'Liên hệ Ban GL để được gán lớp.'}
        </div>
      `
      return
    }

    const sorted = [...classes].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    const activeId = this.stateManager.getState().activeClassId
    const canDel = this.authManager.isAdmin()

    el.innerHTML = sorted.map(c => `
      <div class="class-item ${c.id === activeId ? 'active' : ''}" data-select-class="${c.id}" role="button" tabindex="0">
        <span class="class-dot" style="background:#2563eb"></span>
        <div class="class-info">
          <div class="class-name">${this.escapeHtml(c.name)}</div>
          <div class="class-meta">
            ${c.students.length} học viên ${c.year ? `· ${this.escapeHtml(c.year)}` : ''}
          </div>
        </div>
        <div class="class-actions">
          <button type="button" class="icon-btn" data-rename-class="${c.id}" title="Đổi tên">✏️</button>
          ${canDel ? `<button type="button" class="icon-btn danger" data-del-class="${c.id}" title="Xóa lớp">🗑️</button>` : ''}
        </div>
      </div>
    `).join('')
  }

  private escapeHtml(s: string): string {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  private promptDialog(title: string, message: string, defaultValue: string): Promise<string | null> {
    return new Promise((resolve) => {
      // Ensure dynamic dialog is created in NotificationManager if not already there
      this.notificationManager.init()

      const overlay = document.getElementById('appDialog')!
      const titleEl = document.getElementById('appDialogTitle')!
      const messageEl = document.getElementById('appDialogMessage')!
      const okBtn = document.getElementById('appDialogOk')!
      const cancelBtn = document.getElementById('appDialogCancel')!

      titleEl.textContent = title
      messageEl.innerHTML = `
        <div style="margin-bottom:8px">${message}</div>
        <input type="text" id="dialogPromptInput" value="${defaultValue}" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:4px;box-sizing:border-box" />
      `
      okBtn.textContent = 'Đồng ý'
      cancelBtn.textContent = 'Hủy'

      overlay.classList.remove('hidden')
      const input = document.getElementById('dialogPromptInput') as HTMLInputElement
      input?.focus()
      input?.select()

      const cleanup = (result: string | null) => {
        overlay.classList.add('hidden')
        resolve(result)
      }

      const onOk = () => cleanup(input.value.trim())
      const onCancel = () => cleanup(null)

      okBtn.replaceWith(okBtn.cloneNode(true))
      cancelBtn.replaceWith(cancelBtn.cloneNode(true))

      const newOkBtn = document.getElementById('appDialogOk')!
      const newCancelBtn = document.getElementById('appDialogCancel')!

      newOkBtn.addEventListener('click', onOk)
      newCancelBtn.addEventListener('click', onCancel)
    })
  }

  private handleSearch(_query: string): void {
    this.renderCurrentView()
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

  private updateSyncUI(status: any): void {
    const indicator = this.element?.querySelector('#syncIndicator') as HTMLElement
    if (!indicator) return

    if (status.status === 'syncing') {
      indicator.classList.remove('hidden')
    } else {
      indicator.classList.add('hidden')
    }
  }
}