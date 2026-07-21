// ============================================================
// Sổ Điểm GL — Main App View
// ============================================================

import { StateManager } from '../StateManager'
import { AuthManager } from '../../core/auth/AuthManager'
import { SyncManager } from '../../services/sync/SyncManager'
import { NotificationManager } from '../../services/NotificationManager'
import { BackupService } from '../../services/BackupService'
import { displayName, classifyStudent, resolveClassColumns } from '../../config/constants.ts'
import { fmt, parseCSV } from '../../views/helpers.ts'
import { studentYearTB, studentTBContext, hasMissingColumnScores } from '../../core/calc.ts'
import { supabaseService } from '../../services/SupabaseClient.ts'
import { renderStudents, type StudentFilter } from '../../views/StudentRenderer.ts'
import { getInstallPrompt, triggerInstall } from '../../services/PWAInstall.ts'
import { setupSwipe, nextView, prevView } from '../gestures.ts'
import { buildParishDashboard, downloadTextFile, buildParishReportCsv, printParishReport } from '../../features/parishReport.ts'
import { compareYears, summarizeYear } from '../../features/years.ts'
import { JournalLogModal } from './modals/JournalLogModal'
import { MissingScoresModal } from './modals/MissingScoresModal'
import { UserManagementModal } from './modals/UserManagementModal'
import { ReportsModal } from './modals/ReportsModal'
import { HelpModal } from './modals/HelpModal'

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
  private _skipNextRender = false
  private _listeners: Array<{ target: EventTarget; type: string; handler: EventListener }> = []

  // Legacy-compat modals
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
    const NAV_MAP: Record<string, 'dashboard' | 'class' | 'profile'> = {
      home: 'dashboard',
      classes: 'class',
      scores: 'class',
      me: 'profile'
    }
    this.element.querySelectorAll('.m-nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement
        const mNav = target.dataset.mNav
        if (mNav && NAV_MAP[mNav]) this.switchView(NAV_MAP[mNav])
      })
    })

    // FAB - Add student
    const fab = this.element.querySelector('#mFabAdd') as HTMLButtonElement
    fab?.addEventListener('click', () => this.openAddStudent())

    // Classes accordion toggle
    const classesToggle = this.element.querySelector('#classesToggle')
    classesToggle?.addEventListener('click', () => {
      const accordion = this.element?.querySelector('#classesAccordion')
      if (!accordion) return
      const isOpen = accordion.classList.toggle('open')
      classesToggle.setAttribute('aria-expanded', String(isOpen))
    })

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

    // Search (delegated — #searchInput is recreated on each class render)
    const classViewPanel = this.element.querySelector('#classView')
    if (classViewPanel) {
      classViewPanel.addEventListener('input', this.debounce((e: Event) => {
        const target = (e.target as HTMLElement).closest<HTMLInputElement>('#searchInput')
        if (!target) return
        this.handleSearch(target.value)
      }, 150))
    }

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
        const s = this.element!.querySelector('#sidebar')
        const sc = this.element!.querySelector('#sidebarScrim')
        s?.classList.remove('open')
        sc?.classList.remove('is-open')
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

    const openDrawer = () => {
      sidebar?.classList.add('open')
      scrim?.classList.add('is-open')
    }
    const closeDrawer = () => {
      sidebar?.classList.remove('open')
      scrim?.classList.remove('is-open')
    }

    openDrawerBtn?.addEventListener('click', openDrawer)
    closeDrawerBtn?.addEventListener('click', closeDrawer)
    scrim?.addEventListener('click', closeDrawer)

    // Desktop sidebar collapse
    const collapseBtn = this.element.querySelector('#sidebarCollapseBtn')
    collapseBtn?.addEventListener('click', () => this.toggleSidebarCollapse())

    // Backup & Restore
    const backupBtn = this.element.querySelector('#backupBtn')
    backupBtn?.addEventListener('click', () => this.openBackupModal())

    // Year filter
    const yearSelect = this.element.querySelector('#yearFilterSelect') as HTMLSelectElement
    yearSelect?.addEventListener('change', () => {
      const v = yearSelect.value
      this.stateManager.setYearFilter(v || null)
      this.renderCurrentView()
    })

    // Dashboard / parish tools
    this.element.querySelector('#openDashboardBtn')?.addEventListener('click', () => {
      this.switchView('dashboard')
      const s = this.element?.querySelector('#sidebar')
      const sc = this.element?.querySelector('#sidebarScrim')
      s?.classList.remove('open')
      sc?.classList.remove('is-open')
    })

    this.element.querySelector('#inviteBtn')?.addEventListener('click', () => this.openParentInvite())
    this.element.querySelector('#reportsBtn')?.addEventListener('click', () => this.openReportsModal())
    this.element.querySelector('#settingsBtn')?.addEventListener('click', () => this.openSettingsModal())
    this.element.querySelector('#helpBtn')?.addEventListener('click', () => this.openHelpModal())
    this.element.querySelector('#missingScoresBtn')?.addEventListener('click', () => this.openMissingScoresModal())
    this.element.querySelector('#usersBtn')?.addEventListener('click', () => this.openUserManagementModal())
    this.element.querySelector('#exportBtn')?.addEventListener('click', () => this.exportClassScores())
    this.element.querySelector('#importBtn')?.addEventListener('click', () => this.importClassScores())

    // View-more sheet actions
    this.element.querySelector('#mViewMoreSheet')?.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('[data-action], [data-view]') as HTMLElement | null
      if (!btn) return
      this.closeViewMoreSheet()
      const action = btn.dataset.action
      const view = btn.dataset.view
      if (action === 'weights') this.openColumnsModal()
      else if (action === 'reports') this.exportParishReport()
      else if (view === 'print') {
        window.print()
      } else if (view) {
        this.stateManager.setViewMode(view as any)
        this.rerenderStudents()
      }
    })

    // Profile menu actions click delegation
    const meView = this.element.querySelector('#meView')
    meView?.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement
      const row = target.closest('[data-me-action]')
      if (!row) return

      const action = row.getAttribute('data-me-action')
      if (action === 'backup') {
        this.openBackupModal()
      } else if (action === 'restore') {
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
    })

    // Listen for PWA install availability
    this._listeners.push({
      target: window,
      type: 'gl:install-changed',
      handler: () => this.updateInstallButtonVisibility()
    })
    this.updateInstallButtonVisibility()

    // Listen for state changes
    this._unsubState = this.stateManager.subscribe(() => {
      if (this._skipNextRender) {
        this._skipNextRender = false
        this.rerenderStudents()
        return
      }
      this.renderCurrentView()
    })

    // Listen for sync status
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
      })
    }) as EventListener
    this.syncManager.addEventListener('conflict', conflictHandler)

    // Keyboard shortcuts
    const keydownHandler = (e: Event) => {
      const ke = e as KeyboardEvent
      const isInput = ke.target instanceof HTMLInputElement || ke.target instanceof HTMLTextAreaElement || ke.target instanceof HTMLSelectElement

      // Ctrl/Meta shortcuts (work even in inputs)
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

      if (isInput) return

      switch (ke.key) {
        case 'Escape': {
          // Close modals first, then sidebar
          const modalOpen = document.querySelector('.modal-overlay:not(.hidden)')
          if (modalOpen) {
            (modalOpen as HTMLElement).classList.add('hidden')
            return
          }
          const sidebarEl = this.element?.querySelector('#sidebar')
          if (sidebarEl?.classList.contains('open')) {
            sidebarEl.classList.remove('open')
            const scEl = this.element?.querySelector('#sidebarScrim')
            scEl?.classList.remove('is-open')
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

    // Student events delegation
    const classView = this.element.querySelector('#classView')
    if (classView) {
      // Click events: add-score, del-score, del-student, move-student
      classView.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        const addBtn = target.closest('[data-add-score]')
        if (addBtn) {
          e.preventDefault()
          const sid = addBtn.getAttribute('data-sid')!
          const col = addBtn.getAttribute('data-col')!
          const input = addBtn.parentElement?.querySelector<HTMLInputElement>('[data-score-input]')
          if (!input) return
          const value = parseFloat(input.value)
          if (isNaN(value) || value < 0 || value > 10) {
            this.notificationManager.show('Điểm không hợp lệ (0–10)', 'error')
            return
          }
          if (this.stateManager.addScore(this.activeClassId!, sid, col, value, this.getActiveTerm())) {
            input.value = ''
            this.rerenderStudents()
          }
          return
        }

        const delBtn = target.closest('[data-del-score]')
        if (delBtn) {
          e.preventDefault()
          const sid = delBtn.getAttribute('data-sid')!
          const col = delBtn.getAttribute('data-col')!
          const idx = parseInt(delBtn.getAttribute('data-idx') || '', 10)
          if (this.stateManager.removeScore(this.activeClassId!, sid, col, idx, this.getActiveTerm())) {
            this.rerenderStudents()
          }
          return
        }

        const delStudentBtn = target.closest('[data-del-student]')
        if (delStudentBtn) {
          e.preventDefault()
          const sid = delStudentBtn.getAttribute('data-del-student')!
          this.confirmDeleteStudent(sid)
          return
        }

        const moveBtn = target.closest('[data-move-student]')
        if (moveBtn) {
          e.preventDefault()
          const sid = moveBtn.getAttribute('data-move-student')!
          this.openMoveStudentDialog(sid)
          return
        }

        const journalBtn = target.closest('[data-journal]')
        if (journalBtn) {
          e.preventDefault()
          const sid = journalBtn.getAttribute('data-journal')!
          const cls = this.stateManager.getClass(this.activeClassId!)
          const student = cls?.students.find(s => s.id === sid)
          if (student && cls) {
            this.openJournalLogModal(student, this.activeClassId!, cls.name)
          }
          return
        }

        // Select all toggle
        const selectAll = target.closest('[data-select-all]')
        if (selectAll) {
          this.selectAllStudents()
          return
        }

        // Individual student select
        const selectCb = target.closest('[data-select-student]')
        if (selectCb) {
          const sid = selectCb.getAttribute('data-select-student')!
          this.toggleStudentSelection(sid)
          return
        }

        // Bulk edit button
        const bulkEditBtn = target.closest('#bulkEditBtn')
        if (bulkEditBtn) {
          this.openBulkEdit()
          return
        }

        // Clear selection
        const clearSelBtn = target.closest('#clearSelectionBtn')
        if (clearSelBtn) {
          this.clearSelection()
          return
        }
      })

      // Keydown Enter on score inputs
      classView.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key !== 'Enter') return
        const input = (e.target as HTMLElement).closest<HTMLInputElement>('[data-score-input]')
        if (!input) return
        e.preventDefault()
        const sid = input.getAttribute('data-sid')!
        const col = input.getAttribute('data-col')!
        const value = parseFloat(input.value)
        if (isNaN(value) || value < 0 || value > 10) {
          this.notificationManager.show('Điểm không hợp lệ (0–10)', 'error')
          return
        }
        if (this.stateManager.addScore(this.activeClassId!, sid, col, value, this.getActiveTerm())) {
          input.value = ''
          this.rerenderStudents()
        }
      })

      // Change on table-view score inputs
      classView.addEventListener('change', (e) => {
        const input = (e.target as HTMLElement).closest<HTMLInputElement>('[data-table-score]')
        if (!input) return
        const sid = input.getAttribute('data-sid')!
        const col = input.getAttribute('data-col')!
        const value = parseFloat(input.value)
        if (isNaN(value) || value < 0 || value > 10) {
          this.notificationManager.show('Điểm không hợp lệ (0–10)', 'error')
          return
        }
        if (this.stateManager.addScore(this.activeClassId!, sid, col, value, this.getActiveTerm())) {
          this.rerenderStudents()
        }
      })

      // Note change (debounced)
      let noteTimeout: ReturnType<typeof setTimeout>
      classView.addEventListener('input', (e) => {
        const textarea = (e.target as HTMLElement).closest<HTMLTextAreaElement>('[data-note]')
        if (!textarea) return
        clearTimeout(noteTimeout)
        noteTimeout = setTimeout(() => {
          const sid = textarea.getAttribute('data-sid')!
          this._skipNextRender = true
          this.stateManager.updateStudent(this.activeClassId!, sid, { ghiChu: textarea.value })
        }, 600)
      })
    }

    // Initial render
    this.restoreSidebarState()
    this.updateYearFilterSelect()
    this.updateClassSelector()
    this.updateSyncUI(this.syncManager.getStatus())
    this.renderCurrentView()
  }

  // ------- Student event helpers -------

  private getActiveTerm(): 'hk1' | 'hk2' {
    const term = this.stateManager.getState().activeTerm
    return term === 'year' ? 'hk1' : term
  }

  private rerenderStudents(): void {
    const container = this.element?.querySelector('#studentsContainer')
    if (!container || !this.activeClassId) return
    const cls = this.stateManager.getClass(this.activeClassId)
    if (!cls) return
    const state = this.stateManager.getState()
    container.innerHTML = renderStudents(cls, state.activeTerm, state.viewMode as any, this.searchQuery, this.studentFilter)
    this.renderClassStats()
    // Restore selection state
    container.querySelectorAll<HTMLInputElement>('.student-select').forEach(cb => {
      cb.checked = this.selectedStudents.has(cb.dataset.selectStudent!)
    })
  }

  private async confirmDeleteStudent(studentId: string): Promise<void> {
    const cls = this.stateManager.getClass(this.activeClassId!)
    if (!cls) return
    const st = cls.students.find(s => s.id === studentId)
    const name = st ? displayName(st) : studentId
    const ok = await this.notificationManager.confirm(`Xóa học viên "${name}" và toàn bộ điểm?\n\nCó thể Hoàn tác (Ctrl+Z) trong phiên này.`, {
      title: 'Xóa học viên?',
      type: 'danger',
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    })
    if (ok) {
      this.stateManager.deleteStudent(this.activeClassId!, studentId)
      this.notificationManager.show(`Đã xóa "${name}"`, 'info')
      this.rerenderStudents()
    }
  }

  private async openMoveStudentDialog(studentId: string): Promise<void> {
    const cls = this.stateManager.getClass(this.activeClassId!)
    if (!cls) return
    const st = cls.students.find(s => s.id === studentId)
    const name = st ? displayName(st) : studentId
    const allClasses = this.stateManager.getAllClasses()
    const others = allClasses.filter(c => c.id !== this.activeClassId)
    if (!others.length) {
      this.notificationManager.show('Không có lớp khác để chuyển', 'warning')
      return
    }
    const options = others.map(c =>
      `<option value="${c.id}">${c.name}${c.year ? ` · ${c.year}` : ''}</option>`
    ).join('')
    const targetHtml = `<label style="display:block;margin-bottom:8px">Chọn lớp đích:</label><select id="dlgMoveSelect" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:4px;background:var(--surface);color:var(--text)">${options}</select>`
    const result = await this.promptDialog(`Chuyển "${name}"`, targetHtml, '')
    if (result !== null) {
      const select = document.getElementById('dlgMoveSelect') as HTMLSelectElement
      if (select) {
        this.stateManager.transferStudent(studentId, this.activeClassId!, select.value)
        this.notificationManager.show(`Đã chuyển "${name}"`, 'success')
        this.rerenderStudents()
      }
    }
  }

  // ------- Search -------

  private searchQuery = ''

  // ------- Filter -------

  private studentFilter: StudentFilter = {}

  private setFilter(update: Partial<StudentFilter>): void {
    this.studentFilter = { ...this.studentFilter, ...update }
    this.updateFilterUI()
    this.rerenderStudents()
  }

  private updateFilterUI(): void {
    const el = this.element
    const f = this.studentFilter
    const selClass = el?.querySelector<HTMLSelectElement>('#filterClassification')
    if (selClass) selClass.value = f.classification || 'all'
    const selComp = el?.querySelector<HTMLSelectElement>('#filterCompletion')
    if (selComp) selComp.value = f.completion || 'all'
  }

  // ------- Bulk selection -------

  private selectedStudents: Set<string> = new Set()

  private toggleStudentSelection(sid: string): void {
    if (this.selectedStudents.has(sid)) {
      this.selectedStudents.delete(sid)
    } else {
      this.selectedStudents.add(sid)
    }
    this.updateBulkBar()
  }

  private clearSelection(): void {
    this.selectedStudents.clear()
    this.updateBulkBar()
    this.element?.querySelectorAll('.student-select').forEach(cb => (cb as HTMLInputElement).checked = false)
  }

  private selectAllStudents(): void {
    const container = this.element?.querySelector('#studentsContainer')
    if (!container) return
    const cbs = container.querySelectorAll<HTMLInputElement>('.student-select')
    const allChecked = Array.from(cbs).every(cb => cb.checked)
    cbs.forEach(cb => { cb.checked = !allChecked; if (!allChecked) this.selectedStudents.add(cb.dataset.selectStudent!); else this.selectedStudents.delete(cb.dataset.selectStudent!) })
    this.updateBulkBar()
  }

  private updateBulkBar(): void {
    const bar = this.element?.querySelector('#bulkActionBar') as HTMLElement
    if (!bar) return
    const count = this.selectedStudents.size
    if (count > 0) {
      bar.classList.add('visible')
      bar.querySelector('.bulk-count')!.textContent = `Đã chọn ${count} học viên`
    } else {
      bar.classList.remove('visible')
    }
  }

  private async openBulkEdit(): Promise<void> {
    if (!this.activeClassId || this.selectedStudents.size === 0) return
    const cls = this.stateManager.getClass(this.activeClassId)
    if (!cls) return
    const ids = Array.from(this.selectedStudents)
    const students = ids.map(id => cls.students.find(s => s.id === id)).filter(Boolean) as import('../../services/storage/StorageAdapter.types.ts').StudentData[]
    if (!students.length) return
    const { BulkEditModal } = await import('./modals/BulkEditModal')
    const modal = new BulkEditModal(this.stateManager, this.notificationManager)
    modal.open(this.activeClassId!, students, () => {
      this.clearSelection()
      this.rerenderStudents()
    })
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
          <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="missingScoresBtn">📋 Điểm thiếu</button>
          <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="usersBtn">👤 Quản lý TK</button>
          <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="backupBtn">💾 Sao lưu JSON</button>
          <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="settingsBtn">⚙️ Cài đặt</button>
          <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="helpBtn">ℹ️ Hướng dẫn</button>

          <p class="hint sidebar-tip" style="margin-top:14px">💡 Sao lưu JSON định kỳ · Đổi PIN mặc định · GLV chỉ xuất điểm.</p>
          <button type="button" class="sidebar-collapse-btn" id="sidebarCollapseBtn" title="Thu gọn sidebar" aria-label="Thu gọn sidebar">◀</button>
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

    // Update nav buttons (home→dashboard, classes/scores→class, me→profile)
    const NAV_MAP: Record<string, string> = { home: 'dashboard', classes: 'class', scores: 'class', me: 'profile' }
    this.element?.querySelectorAll('.m-nav-item').forEach(btn => {
      const mNav = (btn as HTMLElement).dataset.mNav
      const active = mNav ? NAV_MAP[mNav] === view : false
      btn.classList.toggle('active', active)
      btn.setAttribute('aria-current', active ? 'page' : 'false')
    })

    // Update view panels
    const panelMap: Record<string, string> = {
      dashboard: 'dashboardView',
      class: 'classView',
      profile: 'meView'
    }
    const targetPanel = panelMap[view] || `${view}View`
    this.element?.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.toggle('hidden', panel.id !== targetPanel)
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
    if (this.currentView !== 'class') {
      this.switchView('class')
    } else {
      this.renderCurrentView()
    }
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

  private async openBackupModal(): Promise<void> {
    const { BackupModal } = await import('./modals/BackupModal')
    const modal = new BackupModal(this.backupService, this.notificationManager)
    modal.open(async () => {
      // Refresh view upon backup restore
      this.updateYearFilterSelect()
      this.updateClassSelector()
      this.renderCurrentView()
    })
  }

  private async openColumnsModal(): Promise<void> {
    const classId = this.activeClassId || this.stateManager.getState().activeClassId
    if (!classId) {
      this.notificationManager.show('Chọn lớp trước khi cấu hình cột điểm', 'warning')
      return
    }
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

  private getThemeLabel(): string {
    const theme = this.stateManager.getTheme()
    if (theme === 'light') return 'Giao diện Sáng'
    if (theme === 'dark') return 'Giao diện Tối'
    return 'Mặc định hệ thống'
  }

  private exportParishReport(): void {
    const year = this.stateManager.getState().yearFilter
    const data = buildParishDashboard(this.stateManager.getAllClasses(), year)
    const stamp = (year || 'all').replace(/\s+/g, '-')
    downloadTextFile(
      `bao-cao-ban-gl-${stamp}.csv`,
      buildParishReportCsv(data),
      'text/csv;charset=utf-8'
    )
    printParishReport(data)
    this.notificationManager.show('Đã xuất báo cáo Ban GL (CSV + bản in)', 'success')
  }

  private openAboutDialog(): void {
    this.notificationManager.alert(
      `Sổ Điểm Giáo Lý v2.0.0\n\nỨng dụng nhập điểm, xếp loại, đồng bộ đám mây.\nDữ liệu lưu offline trên trình duyệt.\n\nPhát triển bởi Ban Giáo lý.`,
      'ℹ️ Giới thiệu'
    )
  }

  private openReportsModal(): void {
    if (!this.reportsModal) {
      this.reportsModal = new ReportsModal(this.stateManager, this.notificationManager)
    }
    // Close sidebar on mobile
    this.element?.querySelector('#sidebar')?.classList.remove('open')
    this.element?.querySelector('#sidebarScrim')?.classList.remove('is-open')
    this.reportsModal.open()
  }

  private openMissingScoresModal(): void {
    if (!this.missingScoresModal) {
      this.missingScoresModal = new MissingScoresModal(this.stateManager, this.notificationManager)
    }
    this.element?.querySelector('#sidebar')?.classList.remove('open')
    this.element?.querySelector('#sidebarScrim')?.classList.remove('is-open')
    this.missingScoresModal.open()
  }

  private openUserManagementModal(): void {
    if (!this.userManagementModal) {
      this.userManagementModal = new UserManagementModal(this.authManager, this.notificationManager)
    }
    this.element?.querySelector('#sidebar')?.classList.remove('open')
    this.element?.querySelector('#sidebarScrim')?.classList.remove('is-open')
    this.userManagementModal.open()
  }

  private openHelpModal(): void {
    if (!this.helpModal) {
      this.helpModal = new HelpModal()
    }
    this.element?.querySelector('#sidebar')?.classList.remove('open')
    this.element?.querySelector('#sidebarScrim')?.classList.remove('is-open')
    this.helpModal.open()
  }

  openJournalLogModal(student: import('../../services/storage/StorageAdapter.types').StudentData, classId: string, className: string): void {
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
    // Offer Excel import
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
        // After import: sync activeClassId if modal created a new class
        const newActiveId = this.stateManager.getState().activeClassId
        if (newActiveId && newActiveId !== this.activeClassId) {
          this.activeClassId = newActiveId
        }
        if (this.currentView === 'class' && this.activeClassId) {
          this.rerenderStudents()
          this.renderClassStats()
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
    if (!this.activeClassId) {
      this.notificationManager.show('Chưa chọn lớp — hãy chọn lớp trước khi nhập CSV', 'warning')
      return
    }
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

      let student: typeof cls.students[0] | undefined
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
    this.rerenderStudents()
    this.notificationManager.show(`Đã nhập điểm cho ${imported}/${rows.length - 1} học viên từ CSV`, 'success')
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

    const classes = this.stateManager.getAllClasses()
    const yearFilter = this.stateManager.getState().yearFilter
    const data = buildParishDashboard(classes, yearFilter)
    const archived = yearFilter ? this.stateManager.isYearArchived(yearFilter) : false
    const yearInfo = yearFilter ? summarizeYear(classes, yearFilter) : null

    if (!classes.length) {
      container.innerHTML = `
        <div class="dashboard">
          <div class="dash-header">
            <h2>Tổng quan Ban GL${yearFilter ? ` · ${yearFilter}` : ''}</h2>
          </div>
          <div class="dash-empty">
            <div class="empty-icon">📂</div>
            <strong>Chưa có lớp học nào</strong>
            <p class="hint" style="margin-top:6px">Tạo lớp mới từ menu bên trái để bắt đầu nhập điểm.</p>
          </div>
        </div>
      `
      return
    }

    container.innerHTML = `
      <div class="dashboard">
        <div class="dash-header">
          <h2>Tổng quan Ban GL${yearFilter ? ` · ${yearFilter}` : ''}${archived ? ' · đã lưu trữ' : ''}</h2>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${this.authManager.isAdmin() ? `
              <button class="btn btn-ghost btn-sm" id="dashExportBtn">📄 Xuất báo cáo</button>
              <button class="btn btn-ghost btn-sm" id="dashCompareBtn">📊 So sánh năm</button>
              <button class="btn btn-ghost btn-sm" id="dashArchiveBtn">${archived ? 'Mở lại năm' : 'Lưu trữ năm'}</button>
            ` : ''}
          </div>
        </div>

        <div class="dash-stats">
          <div class="stat"><span class="stat-label">Lớp</span><span class="stat-value">${data.classCount}</span></div>
          <div class="stat"><span class="stat-label">Học viên</span><span class="stat-value">${data.studentCount}</span></div>
          <div class="stat"><span class="stat-label">TB cả năm</span><span class="stat-value">${data.avgTB != null ? data.avgTB.toFixed(2) : '—'}</span></div>
          <div class="stat"><span class="stat-label">% đủ điểm</span><span class="stat-value">${data.completePercent}%</span></div>
        </div>

        <section class="dash-section">
          <h3>🏅 Xếp hạng liên lớp</h3>
          ${data.rankings.length ? `
            <div class="dash-rank-table">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Lớp</th>
                    <th style="text-align:right">TB</th>
                    <th style="text-align:right">% đủ</th>
                    <th>TT</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.rankings.map((c, i) => `
                    <tr${c.isRed ? ' data-red' : ''}>
                      <td>${i + 1}</td>
                      <td><button type="button" class="btn btn-ghost btn-sm" data-dash-class="${c.classId}">${this.escapeHtml(c.className)}</button></td>
                      <td style="text-align:right">${c.avgTB != null ? c.avgTB.toFixed(2) : '—'}</td>
                      <td style="text-align:right">${c.completePercent}%</td>
                      <td>${c.isRed ? '🔴' : '🟢'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `           : '<div class="dash-empty"><p class="hint">Chưa có lớp — tạo lớp và nhập điểm để xem xếp hạng.</p></div>'}
        </section>

        <section class="dash-section">
          <h3>🔴 Lớp cần quan tâm</h3>
          ${data.redClasses.length
            ? data.redClasses.map(c => `
              <div class="dash-student weak">
                <div class="info">
                  <strong>${this.escapeHtml(c.className)}</strong>
                  <small>TB ${c.avgTB != null ? c.avgTB.toFixed(2) : '—'} · đủ điểm ${c.completePercent}%</small>
                </div>
              </div>
            `).join('')
            : '<div class="dash-empty dash-empty-col" style="padding:12px"><p class="hint" style="margin:0">✅ Không có lớp đỏ — tất cả đều ổn.</p></div>'}
        </section>

        <section class="dash-section">
          <h3>🏆 Xuất sắc</h3>
          ${this.renderTopStudents(5)}
        </section>

        <section class="dash-section">
          <h3>📉 Cần quan tâm (HV)</h3>
          ${this.renderAttentionStudents()}
        </section>

        <section class="dash-section">
          <h3>⚠️ Yếu (TB &lt; 5)</h3>
          ${this.renderWeakStudents()}
        </section>

        <section class="dash-section">
          <h3>📋 Thiếu điểm</h3>
          ${this.renderMissingScores()}
        </section>
        ${yearInfo ? `<p class="hint" style="margin-top:12px">Năm ${yearInfo.year}: ${yearInfo.redClasses} lớp cần quan tâm</p>` : ''}
      </div>
    `

    container.querySelector('#dashExportBtn')?.addEventListener('click', () => this.exportParishReport())
    container.querySelector('#dashCompareBtn')?.addEventListener('click', () => this.openYearCompare())
    container.querySelector('#dashArchiveBtn')?.addEventListener('click', () => this.toggleArchiveCurrentYear())
    container.querySelectorAll('[data-dash-class]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.dashClass!
        this.selectClass(id)
      })
    })
    container.querySelectorAll('[data-missing-class]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.missingClass!
        const sid = (btn as HTMLElement).dataset.missingStudent
        this.selectClass(id)
        if (sid) {
          requestAnimationFrame(() => {
            const row = this.element?.querySelector<HTMLElement>(`[data-id="${sid}"]`)
            row?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            row?.classList.add('highlight-flash')
            setTimeout(() => row?.classList.remove('highlight-flash'), 2000)
          })
        }
      })
    })
  }

  private renderClassView(): void {
    const container = this.element?.querySelector('#classView') as HTMLElement
    if (!container || !this.activeClassId) return

    const cls = this.stateManager.getClass(this.activeClassId)
    if (!cls) return

    container.innerHTML = `
      <div class="class-view">
        <div class="class-header">
          <h2>${cls.name} ${cls.year ? `· ${cls.year}` : ''}${this.stateManager.isYearArchived(cls.year) ? ' · lưu trữ' : ''}</h2>
          <div class="class-actions">
            <button class="btn btn-secondary btn-sm" id="addStudentBtn" ${this.stateManager.isClassArchived(cls.id) ? 'disabled' : ''}>➕ Thêm HV</button>
            <button class="btn btn-ghost btn-sm" id="classColumnsBtn">⚖️ Cột điểm</button>
            <button class="btn btn-ghost btn-sm" id="classInviteBtn">📝 Phiếu PH</button>
          </div>
        </div>

        <div class="toolbar" id="classToolbar">
          <div class="m-seg term-switcher">
            <button type="button" class="term-btn ${this.stateManager.getState().activeTerm === 'hk1' ? 'active' : ''}" data-term="hk1">HK1</button>
            <button type="button" class="term-btn ${this.stateManager.getState().activeTerm === 'hk2' ? 'active' : ''}" data-term="hk2">HK2</button>
            <button type="button" class="term-btn ${this.stateManager.getState().activeTerm === 'year' ? 'active' : ''}" data-term="year">Cả năm</button>
          </div>

          <div class="m-seg-scroll view-switcher">
            <button type="button" class="view-btn ${this.stateManager.getState().viewMode === 'cards' ? 'active' : ''}" data-view="cards">🃏 Thẻ</button>
            <button type="button" class="view-btn ${this.stateManager.getState().viewMode === 'table' ? 'active' : ''}" data-view="table">📊 Bảng</button>
            <button type="button" class="view-btn ${this.stateManager.getState().viewMode === 'rank' ? 'active' : ''}" data-view="rank">🏆 Xếp hạng</button>
          </div>

          <div class="m-search-bar toolbar">
            <div class="search-wrap" style="flex:1">
              <input type="search" id="searchInput" class="input" placeholder="Tìm học viên..." aria-label="Tìm học viên" />
            </div>
          </div>

          <div class="filter-bar">
            <select id="filterClassification" class="filter-select" aria-label="Lọc theo xếp loại">
              <option value="all">Xếp loại: Tất cả</option>
              <option value="rank-xs">XS (≥9)</option>
              <option value="rank-g">Giỏi (8–9)</option>
              <option value="rank-k">Khá (6.5–8)</option>
              <option value="rank-tb">TB (5–6.5)</option>
              <option value="rank-y">Yếu (&lt;5)</option>
              <option value="rank-none">Chưa có TB</option>
            </select>
            <select id="filterCompletion" class="filter-select" aria-label="Lọc theo mức độ nhập điểm">
              <option value="all">Điểm: Tất cả</option>
              <option value="complete">Đủ điểm</option>
              <option value="incomplete">Thiếu điểm</option>
              <option value="none">Chưa có điểm</option>
            </select>
          </div>
        </div>

        <div class="m-stat-strip" id="classStats"></div>

        <div id="studentsContainer"></div>

        <div id="bulkActionBar">
          <span class="bulk-count">Đã chọn 0 học viên</span>
          <div class="bulk-actions">
            <button class="btn btn-primary btn-sm" id="bulkEditBtn">✏️ Sửa điểm</button>
            <button class="btn btn-ghost btn-sm" id="clearSelectionBtn">Bỏ chọn</button>
          </div>
        </div>
      </div>
    `

    const state = this.stateManager.getState()
    this.renderStudentsIntoContainer(container, cls, state.activeTerm, state.viewMode)

    container.querySelector('#addStudentBtn')?.addEventListener('click', () => this.openAddStudent())
    container.querySelector('#classColumnsBtn')?.addEventListener('click', () => this.openColumnsModal())
    container.querySelector('#classInviteBtn')?.addEventListener('click', () => this.openParentInvite())
    container.querySelectorAll('[data-term]').forEach(btn => {
      btn.addEventListener('click', () => {
        const term = (btn as HTMLElement).dataset.term as 'hk1' | 'hk2' | 'year'
        this.stateManager.setActiveTerm(term)
        const curMode = this.stateManager.getState().viewMode
        if (term === 'year') {
          this.stateManager.setViewMode('year')
        } else if (curMode === 'year' || curMode === 'stats') {
          this.stateManager.setViewMode('cards')
        }
        this.renderClassView()
      })
    })
    container.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = (btn as HTMLElement).dataset.view!
        this.stateManager.setViewMode(mode as 'cards' | 'table' | 'rank' | 'stats' | 'missing' | 'year' | 'print')
        container.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b === btn))
        this.rerenderStudents()
      })
    })

    container.querySelector('#filterClassification')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value
      this.setFilter({ classification: val === 'all' ? undefined : val })
    })
    container.querySelector('#filterCompletion')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value
      this.setFilter({ completion: val === 'all' ? undefined : val as any })
    })

    // Mobile swipe gesture
    if ('ontouchstart' in window) {
      const state = this.stateManager.getState()
      setupSwipe(container, {
        onSwipeLeft: () => {
          const next = nextView(state.viewMode)
          if (next !== state.viewMode) {
            this.stateManager.setViewMode(next as any)
            this.renderClassView()
          }
        },
        onSwipeRight: () => {
          const prev = prevView(state.viewMode)
          if (prev !== state.viewMode) {
            this.stateManager.setViewMode(prev as any)
            this.renderClassView()
          }
        },
        onPullRefresh: () => {
          this.notificationManager.show('🔄 Đã làm mới', 'info')
          this.rerenderStudents()
        }
      })
    }
  }

  private renderStudentsIntoContainer(
    container: HTMLElement,
    cls: import('../../services/storage/StorageAdapter.types.ts').ClassData,
    term: 'hk1' | 'hk2' | 'year',
    mode: string
  ): void {
    const studentsEl = container.querySelector('#studentsContainer') as HTMLElement
    if (!studentsEl) return
    if (!cls.students.length) {
      studentsEl.innerHTML = `<div class="dash-empty" style="margin-top:16px">
        <div class="empty-icon">✏️</div>
        <strong>Lớp chưa có học viên</strong>
        <p class="hint" style="margin-top:6px">Thêm học viên mới hoặc nhập điểm từ file CSV (xuất từ app).</p>
      </div>`
      return
    }
    studentsEl.innerHTML = renderStudents(cls, term, mode as any, this.searchQuery, this.studentFilter)
    this.renderClassStats()
  }

  private renderClassStats(): void {
    if (!this.activeClassId) return
    const cls = this.stateManager.getClass(this.activeClassId)
    if (!cls || !cls.students.length) return
    const statsEl = this.element?.querySelector('#classStats') as HTMLElement
    if (!statsEl) return

    const state = this.stateManager.getState()
    const cols = resolveClassColumns(cls)
    const { activeTerm } = state
    const students = cls.students

    let totalScores = 0
    let filledScores = 0
    let tbSum = 0
    let tbCount = 0
    let complete = 0

    for (const st of students) {
      let filled = 0
      for (const col of cols) {
        let hasScore = false
        if (activeTerm === 'year') {
          hasScore = st.scoresByTerm?.hk1?.[col.key]?.length > 0 || st.scoresByTerm?.hk2?.[col.key]?.length > 0
        } else {
          hasScore = st.scoresByTerm?.[activeTerm]?.[col.key]?.length > 0
        }
        if (hasScore) {
          filled++
          filledScores++
        }
        totalScores++
      }
      if (filled === cols.length) complete++
      const tb = studentTBContext(st, cls.weights, activeTerm, cols)
      if (tb != null) {
        tbSum += tb
        tbCount++
      }
    }

    const avgTB = tbCount > 0 ? fmt(tbSum / tbCount) : '—'
    const completeness = totalScores > 0 ? Math.round((filledScores / totalScores) * 100) : 0

    statsEl.innerHTML = `
      <div class="stat"><span class="stat-label">👥 HV</span><span class="stat-value">${students.length}</span></div>
      <div class="stat"><span class="stat-label">📊 TB</span><span class="stat-value">${avgTB}</span></div>
      <div class="stat"><span class="stat-label">✅ Đủ điểm</span><span class="stat-value">${complete}/${students.length}</span></div>
      <div class="stat"><span class="stat-label">📈 Đã nhập</span><span class="stat-value">${completeness}%</span></div>
    `
  }

  private renderProfile(): void {
    const container = this.element?.querySelector('#meView') as HTMLElement
    if (!container) return

    const user = this.authManager.getCurrentUser()

    container.innerHTML = `
      <div class="me-view">
        <div class="me-hero">
          <div class="me-avatar">${user?.displayName?.charAt(0) || '?'}</div>
          <div>
            <div class="me-name">${user?.displayName || 'Người dùng'}</div>
            <div class="me-role">${user?.role === 'ban_gl' ? 'Ban Giáo lý' : 'Giáo lý viên'}</div>
            <div class="me-user">${user?.username || ''}</div>
          </div>
        </div>

        <div class="me-section">
          <div class="me-section-title">Tài khoản</div>
          <button class="me-row" data-me-action="pin">
            <div class="me-row-txt">
              <strong>Đổi PIN</strong>
              <small>Thay đổi mã PIN đăng nhập</small>
            </div>
            <span class="me-row-chev">▸</span>
          </button>
          <button class="me-row" data-me-action="biometric">
            <div class="me-row-txt">
              <strong>Sinh trắc học</strong>
              <small>${this.authManager.getCurrentUser()?.biometricEnabled ? 'Đã bật' : 'Chưa bật'}</small>
            </div>
            <span class="me-row-chev">▸</span>
          </button>
        </div>

        <div class="me-section">
          <div class="me-section-title">Dữ liệu</div>
          <button class="me-row" data-me-action="backup">
            <div class="me-row-txt">
              <strong>Sao lưu JSON</strong>
              <small>Tải file backup toàn bộ dữ liệu</small>
            </div>
            <span class="me-row-chev">▸</span>
          </button>
          <button class="me-row" data-me-action="restore">
            <div class="me-row-txt">
              <strong>Khôi phục backup</strong>
              <small>Chọn file để khôi phục</small>
            </div>
            <span class="me-row-chev">▸</span>
          </button>
          <button class="me-row" data-me-action="parish-report">
            <div class="me-row-txt">
              <strong>Báo cáo Ban GL</strong>
              <small>Xuất CSV / bản in họp Ban</small>
            </div>
            <span class="me-row-chev">▸</span>
          </button>
          <button class="me-row" data-me-action="year-compare">
            <div class="me-row-txt">
              <strong>So sánh năm học</strong>
              <small>TB và % đủ điểm giữa các năm</small>
            </div>
            <span class="me-row-chev">▸</span>
          </button>
          <button class="me-row" data-me-action="archive-year">
            <div class="me-row-txt">
              <strong>Lưu trữ / mở năm học</strong>
              <small>Khóa sửa điểm năm đã chọn</small>
            </div>
            <span class="me-row-chev">▸</span>
          </button>
          <button class="me-row" data-me-action="columns">
            <div class="me-row-txt">
              <strong>Cột điểm lớp</strong>
              <small>Thêm / sửa / hệ số cột điểm</small>
            </div>
            <span class="me-row-chev">▸</span>
          </button>
          <button class="me-row" data-me-action="invite">
            <div class="me-row-txt">
              <strong>Phiếu phụ huynh</strong>
              <small>Tạo link chỉ xem, có hết hạn</small>
            </div>
            <span class="me-row-chev">▸</span>
          </button>
        </div>

        <div class="me-section">
          <div class="me-section-title">Cài đặt</div>
          <button class="me-row" data-me-action="settings">
            <div class="me-row-txt">
              <strong>Cài đặt ứng dụng</strong>
              <small>Cấu hình Supabase, sao lưu tự động...</small>
            </div>
            <span class="me-row-chev">▸</span>
          </button>
          <button class="me-row" data-me-action="theme">
            <div class="me-row-txt">
              <strong>Giao diện</strong>
              <small>${this.getThemeLabel()}</small>
            </div>
            <span class="me-row-chev">▸</span>
          </button>
          <button class="me-row" data-me-action="print-settings">
            <div class="me-row-txt">
              <strong>Mẫu in / Phiếu mời</strong>
              <small>Cấu hình giáo hạt, giáo xứ, tiêu đề...</small>
            </div>
            <span class="me-row-chev">▸</span>
          </button>
          <button class="me-row" data-me-action="install" style="display:none">
            <div class="me-row-txt">
              <strong>Cài đặt ứng dụng</strong>
              <small>Cài Sổ Điểm GL lên màn hình chính</small>
            </div>
            <span class="me-row-chev">▸</span>
          </button>
        </div>

        <div class="me-section">
          <div class="me-section-title">Hỗ trợ</div>
          <button class="me-row" data-me-action="help">
            <div class="me-row-txt">
              <strong>Hướng dẫn</strong>
              <small>Xem cách sử dụng ứng dụng</small>
            </div>
            <span class="me-row-chev">▸</span>
          </button>
          <button class="me-row" data-me-action="feedback">
            <div class="me-row-txt">
              <strong>Góp ý / Báo lỗi</strong>
              <small>Gửi phản hồi cho nhà phát triển</small>
            </div>
            <span class="me-row-chev">▸</span>
          </button>
        </div>

        <div class="me-section">
          <div class="me-section-title">Tài khoản</div>
          <button class="me-row me-logout" data-me-action="logout">
            <div class="me-row-txt">
              <strong>Đăng xuất</strong>
              <small>Thoát khỏi tài khoản hiện tại</small>
            </div>
          </button>
        </div>
      </div>
    `
  }

  // ============================================================
  // Dashboard Render Helpers
  // ============================================================

  private updateInstallButtonVisibility(): void {
    const btn = this.element?.querySelector('[data-me-action="install"]') as HTMLElement | null
    if (!btn) return
    btn.style.display = getInstallPrompt() ? '' : 'none'
  }

  private scopedClasses() {
    return this.stateManager.getVisibleClasses()
  }


  private renderTopStudents(limit: number): string {
    const students = this.scopedClasses()
      .flatMap(c => {
        const cols = resolveClassColumns(c)
        return c.students.map(s => ({
          ...s,
          className: c.name,
          classId: c.id,
          yearTB: studentYearTB(s, c.weights, cols)
        }))
      })
      .filter(s => s.yearTB !== null)
      .sort((a, b) => (b.yearTB || 0) - (a.yearTB || 0))
      .slice(0, limit)

    if (!students.length) return '<div class="dash-empty dash-empty-col" style="padding:12px"><p class="hint" style="margin:0">Chưa có điểm — nhập điểm cho học viên để xem xếp hạng.</p></div>'

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
    const students = this.scopedClasses()
      .flatMap(c => {
        const cols = resolveClassColumns(c)
        return c.students.map(s => ({
          ...s,
          className: c.name,
          yearTB: studentYearTB(s, c.weights, cols)
        }))
      })
      .filter(s => s.yearTB !== null && s.yearTB >= 5 && s.yearTB < 6.5)
      .sort((a, b) => (a.yearTB || 0) - (b.yearTB || 0))
      .slice(0, 10)

    if (!students.length) return '<div class="dash-empty dash-empty-col" style="padding:12px"><p class="hint" style="margin:0">✅ Không có học viên cần quan tâm.</p></div>'

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
    const students = this.scopedClasses()
      .flatMap(c => {
        const cols = resolveClassColumns(c)
        return c.students.map(s => ({
          ...s,
          className: c.name,
          yearTB: studentYearTB(s, c.weights, cols)
        }))
      })
      .filter(s => s.yearTB !== null && s.yearTB < 5)
      .sort((a, b) => (a.yearTB || 0) - (b.yearTB || 0))
      .slice(0, 10)

    if (!students.length) return '<div class="dash-empty dash-empty-col" style="padding:12px"><p class="hint" style="margin:0">✅ Không có học viên yếu (TB &lt; 5).</p></div>'

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
    const students = this.scopedClasses()
      .flatMap(c => c.students.map(s => ({
        ...s,
        className: c.name,
        classId: c.id,
        columns: resolveClassColumns(c)
      })))
      .filter(s => this.hasMissingScores(s))
      .slice(0, 10)

    if (!students.length) return '<div class="dash-empty dash-empty-col" style="padding:12px"><p class="hint" style="margin:0">✅ Không thiếu điểm — tất cả học viên đã nhập đủ.</p></div>'

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
    if (term === 'year') {
      return hasMissingColumnScores(student, 'hk1', student.columns) ||
        hasMissingColumnScores(student, 'hk2', student.columns)
    }
    return hasMissingColumnScores(student, term, student.columns)
  }

  // ============================================================
  // UI Update Helpers
  // ============================================================

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

  private updateClassList(): void {
    const el = this.element?.querySelector('#classList') as HTMLElement
    if (!el) return

    const classes = this.stateManager.getVisibleClasses()
    if (!classes.length) {
      el.innerHTML = `
        <div class="class-item empty hidden" style="display:none"></div>
        <div class="dash-empty dash-empty-col" style="padding:20px 12px">
          <div class="empty-icon" style="font-size:2rem;margin-bottom:10px">📂</div>
          <strong style="font-size:0.9rem">Chưa có lớp${this.stateManager.getState().yearFilter ? ' trong năm đã chọn' : ''}</strong>
          <p class="hint" style="margin-top:8px;font-size:0.8rem;line-height:1.4">
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
        <span class="class-dot" style="background:${this.stateManager.isYearArchived(c.year) ? '#94a3b8' : '#2563eb'}"></span>
        <div class="class-info">
          <div class="class-name">${this.escapeHtml(c.name)}</div>
          <div class="class-meta">
            ${c.students.length} học viên ${c.year ? `· ${this.escapeHtml(c.year)}` : ''}${this.stateManager.isYearArchived(c.year) ? ' · lưu trữ' : ''}
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
        this.notificationManager.rebindDialog()
        resolve(result)
      }

      const onOk = () => cleanup(input.value.trim())
      const onCancel = () => cleanup(null)

      // Replace buttons to remove NotificationManager's closeDialog listeners,
      // then re-attach for this prompt (once-only so they auto-clean)
      okBtn.replaceWith(okBtn.cloneNode(true))
      cancelBtn.replaceWith(cancelBtn.cloneNode(true))

      const newOk = document.getElementById('appDialogOk')!
      const newCancel = document.getElementById('appDialogCancel')!

      newOk.addEventListener('click', onOk, { once: true })
      newCancel.addEventListener('click', onCancel, { once: true })
    })
  }

  private handleSearch(query: string): void {
    this.searchQuery = query.trim()
    if (this.currentView === 'class' && this.activeClassId) {
      this.rerenderStudents()
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

  private updateSyncUI(status: any): void {
    const indicator = this.element?.querySelector('#syncIndicator') as HTMLElement
    if (!indicator) return

    if (status.status === 'syncing') {
      indicator.classList.remove('hidden')
    } else {
      indicator.classList.add('hidden')
    }
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

  destroy(): void {
    this._unsubState?.()
    this._unsubState = null
    for (const { target, type, handler } of this._listeners) {
      target.removeEventListener(type, handler)
    }
    this._listeners = []
  }
}