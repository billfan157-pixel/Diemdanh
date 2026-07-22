import { StateManager } from '../StateManager'
import { AuthManager } from '../../core/auth/AuthManager'
import { NotificationManager } from '../../services/NotificationManager'
import { resolveClassColumns, displayName, debounce, INFO_FIELD_DEFS, type InfoField } from '../../config/constants.ts'
import { iconEditStr, iconSearchStr } from './components/gl-icons'
import { createFocusTrap } from '../../utils/focusTrap'
import { renderStudents, StudentFilter, filterStudents, applyFilters } from '../../views/StudentRenderer.ts'
import type { ClassData, AppState } from '../../services/storage/StorageAdapter.types'
import '../views/components/gl-student-card'
import '../views/components/gl-student-row'
import '../views/components/gl-student-list'
import '../views/components/gl-class-toolbar'
import '../views/components/gl-bulk-action-bar'
import '../views/components/gl-student-detail'
import { studentTBContext, studentTB, studentYearTB, classify } from '../../core/calc.ts'
import { fmt } from '../../views/helpers.ts'
import { setupSwipe, setupLongPress, setupItemSwipe, setupPullRefresh, nextView, prevView } from '../gestures.ts'
import { validateScoreInputEl, focusNextScoreInput } from '../../utils/scoreInput.ts'
import { ClassFilterController } from '../controllers/ClassFilterController'
import { ClassBulkActions } from '../controllers/ClassBulkActions'

export class ClassView {
  private container: HTMLElement | null = null
  private activeClassId: string | null = null
  private searchQuery = ''
  private studentFilter: StudentFilter = {}
  private selectedStudents: Set<string> = new Set()
  private _skipNextRender = false
  private containerGestureCleanups: (() => void)[] = []
  private studentGestureCleanups: (() => void)[] = []
  private _documentCleanups: (() => void)[] = []
  private _containerCleanups: (() => void)[] = []
  private contextMenuSid: string | null = null
  private contextMenuBound = false

  // Controllers
  private filterController: ClassFilterController
  private bulkActionsController: ClassBulkActions

  constructor(
    private stateManager: StateManager,
    private authManager: AuthManager,
    private notificationManager: NotificationManager
  ) {
    this.filterController = new ClassFilterController(null, {
      notificationManager: this.notificationManager,
      getContainer: () => this.container,
      getStudentFilter: () => this.studentFilter,
      setStudentFilter: (f) => { this.studentFilter = f },
      getSearchQuery: () => this.searchQuery,
      setSearchQuery: (q) => { this.searchQuery = q },
      updateFilterUI: () => this.updateFilterUI(),
      rerenderStudents: () => this.rerenderStudents(),
      renderScoreRangeFilters: () => this.renderScoreRangeFilters(),
      renderColVisibilityPopover: () => this.renderColVisibilityPopover()
    })

    this.bulkActionsController = new ClassBulkActions(null, {
      stateManager: this.stateManager,
      notificationManager: this.notificationManager,
      getContainer: () => this.container,
      getActiveClassId: () => this.activeClassId,
      rerenderStudents: () => this.rerenderStudents()
    })
  }

  render(container: HTMLElement, classId: string): void {
    this.container = container
    this.activeClassId = classId

    const cls = this.stateManager.getClass(classId)
    if (!cls) return

    const isDesktop = window.innerWidth > 900

    container.innerHTML = `
      <div class="class-view">
        <gl-class-toolbar
          class-name="${this.escapeHtml(cls.name)}"
          class-year="${this.escapeHtml(cls.year || '')}"
          ${this.stateManager.isYearArchived(cls.year) ? 'is-archived' : ''}
          ${this.stateManager.isClassArchived(cls.id) ? 'class-archived' : ''}
        ></gl-class-toolbar>

        ${isDesktop ? `
        <div class="cv-side" id="cvStudentList">
          <gl-student-list id="cvStudentListComp"></gl-student-list>
        </div>
        <div class="cv-main">
        ` : ''}

          <div class="toolbar" id="classToolbar">
            <gl-tabs id="termSwitcher" .tabs='${JSON.stringify([{id:"hk1",label:"HK1"},{id:"hk2",label:"HK2"},{id:"year",label:"Cả năm"}])}' activeTab="${this.stateManager.getState().activeTerm}"></gl-tabs>

            <gl-tabs id="viewSwitcher" .tabs='${JSON.stringify([{id:"cards",label:"🃏 Thẻ"},{id:"table",label:"📊 Bảng"},{id:"rank",label:"🏆 Xếp hạng"}])}' activeTab="${this.stateManager.getState().viewMode}"></gl-tabs>

            <div class="m-search-bar toolbar">
              <gl-input type="search" id="searchInput" placeholder="Tìm học viên..." value="${this.escapeHtml(this.searchQuery)}"></gl-input>
            </div>

            <div class="filter-bar">
              <gl-select id="filterClassification" placeholder="Xếp loại: Tất cả" .options='${JSON.stringify([{value:"all",label:"Xếp loại: Tất cả"},{value:"rank-xs",label:"XS (≥9)"},{value:"rank-g",label:"Giỏi (8–9)"},{value:"rank-k",label:"Khá (6.5–8)"},{value:"rank-tb",label:"TB (5–6.5)"},{value:"rank-y",label:"Yếu (<5)"},{value:"rank-none",label:"Chưa có TB"}])}'></gl-select>
              <gl-select id="filterCompletion" placeholder="Điểm: Tất cả" .options='${JSON.stringify([{value:"all",label:"Điểm: Tất cả"},{value:"complete",label:"Đủ điểm"},{value:"incomplete",label:"Thiếu điểm"},{value:"none",label:"Chưa có điểm"}])}'></gl-select>
              <gl-button variant="ghost" size="sm" id="toggleScoreFilterBtn" title="Lọc theo điểm cột">🎯</gl-button>
            <div style="position:relative;">
              <gl-button variant="ghost" size="sm" id="colVisibilityBtn" title="Ẩn/hiện cột">👁️</gl-button>
              <div id="colVisibilityPopover" class="popover hidden" style="position:absolute;top:100%;right:0;z-index:100;min-width:180px;max-height:300px;overflow-y:auto;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:8px;box-shadow:0 4px 16px rgba(0,0,0,0.12);display:none;"></div>
            </div>
              <div class="preset-filters" style="display: flex; align-items: center; gap: 4px; margin-left: auto;">
                <select id="filterPresetsSelect" class="input" style="width:auto; min-width:140px; font-size:0.75rem; padding:4px 8px; border-radius:var(--radius-sm); background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text);" aria-label="Bộ lọc mẫu"></select>
                <gl-button variant="ghost" size="sm" id="btnSaveFilterPreset" title="Lưu bộ lọc mẫu">💾</gl-button>
                <gl-button variant="ghost" size="sm" id="btnDelFilterPreset" title="Xóa bộ lọc mẫu">🗑️</gl-button>
              </div>
            </div>
            <div id="scoreRangeFilters" class="score-range-filters hidden" style="display:none;padding:8px 12px;background:var(--surface2);border-radius:var(--radius-md);border:1px solid var(--border);margin-top:6px;"></div>
            <div id="filterChips" class="filter-chips" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:4px;min-height:0;"></div>
          </div>

          <div class="m-stat-strip" id="classStats"></div>
          <div id="classSizeHint" style="display:none;"></div>
          <div id="classChartContainer" style="display:none"></div>
          <div id="studentsContainer">
            <div class="skeleton-list px-4" id="studentSkeleton">
              <gl-skeleton variant="table-row"></gl-skeleton>
              <gl-skeleton variant="table-row"></gl-skeleton>
              <gl-skeleton variant="table-row"></gl-skeleton>
              <gl-skeleton variant="table-row"></gl-skeleton>
            </div>
          </div>

          <gl-bulk-action-bar id="bulkActionBar"></gl-bulk-action-bar>

        ${isDesktop ? '</div>' : ''}
      </div>
      <gl-student-detail id="studentDetailPanel"></gl-student-detail>
    `

    this.updateFilterUI()
    this.rerenderStudents()
    this.setupColumnResizers()
    this.setupDragDrop()
    this.bindEvents()

    if (isDesktop) {
      this.bindStudentList()
    }
  }

  private bindEvents(): void {
    if (!this.container) return

    // Cleanup previous listeners to prevent accumulation
    this._documentCleanups.forEach(fn => fn())
    this._documentCleanups = []
    this._containerCleanups.forEach(fn => fn())
    this._containerCleanups = []

    const container = this.container

    // Bind sub-controllers
    this.filterController.bind()
    this.bulkActionsController.bind()

    container.querySelector('gl-class-toolbar')?.addEventListener('add-student', () => this.openAddStudent())
    container.querySelector('gl-class-toolbar')?.addEventListener('columns', () => this.openColumnsModal())
    container.querySelector('gl-class-toolbar')?.addEventListener('invite', () => this.openParentInvite())

    const bulkBar = container.querySelector('gl-bulk-action-bar')
    bulkBar?.addEventListener('bulk-edit', () => this.openBulkEdit())
    bulkBar?.addEventListener('bulk-clear', () => this.clearSelection())

    const detailPanel = container.querySelector('gl-student-detail')
    detailPanel?.addEventListener('detail-edit', ((e: CustomEvent) => {
      this.openEditStudent(e.detail.studentId)
    }) as EventListener)
    detailPanel?.addEventListener('detail-journal', ((e: CustomEvent) => {
      const cls = this.stateManager.getClass(this.activeClassId!)
      const student = cls?.students.find(s => s.id === e.detail.studentId)
      if (student && cls) {
        window.dispatchEvent(new CustomEvent('gl:open-journal', { detail: { student, classId: this.activeClassId!, className: cls.name } }))
      }
    }) as EventListener)

    container.querySelector('#termSwitcher')?.addEventListener('gl-tab-change', (e: Event) => {
      const term = (e as CustomEvent).detail.tabId as 'hk1' | 'hk2' | 'year'
      this.stateManager.setActiveTerm(term)
      const curMode = this.stateManager.getState().viewMode
      if (term === 'year') {
        this.stateManager.setViewMode('year')
      } else if (curMode === 'year' || curMode === 'stats') {
        this.stateManager.setViewMode('cards')
      }
      if (this.activeClassId) {
        this.render(container, this.activeClassId)
      }
    })

    container.querySelector('#viewSwitcher')?.addEventListener('gl-tab-change', (e: Event) => {
      const mode = (e as CustomEvent).detail.tabId
      this.stateManager.setViewMode(mode as any)
      this.rerenderStudents()
    })

    // Populate and bind Saved Presets
    this.populateFilterPresetsSelect()
    container.querySelector('#filterPresetsSelect')?.addEventListener('change', (e) => {
      const name = (e.target as HTMLSelectElement).value
      const presets = this.loadFilterPresets()
      const preset = presets.find(p => p.name === name)
      if (preset) {
        this.studentFilter = { ...preset.filter }
        this.searchQuery = preset.search || ''
        this.updateFilterUI()
        
        const searchInput = this.container?.querySelector('#searchInput') as any
        if (searchInput) searchInput.value = this.searchQuery

        this.rerenderStudents()
      }
    })

    container.querySelector('#btnSaveFilterPreset')?.addEventListener('click', () => {
      const name = prompt('Đặt tên cho bộ lọc mẫu này:')
      if (!name || !name.trim()) return
      const presets = this.loadFilterPresets()
      const existingIdx = presets.findIndex(p => p.name.toLowerCase() === name.trim().toLowerCase())
      const newPreset = {
        name: name.trim(),
        filter: { ...this.studentFilter },
        search: this.searchQuery
      }
      if (existingIdx >= 0) {
        presets[existingIdx] = newPreset
      } else {
        presets.push(newPreset)
      }
      this.saveFilterPresets(presets)
      this.populateFilterPresetsSelect()
      
      const select = this.container?.querySelector('#filterPresetsSelect') as HTMLSelectElement
      if (select) select.value = name.trim()
      
      this.notificationManager.show(`Đã lưu bộ lọc "${name.trim()}"`, 'success')
    })

    container.querySelector('#btnDelFilterPreset')?.addEventListener('click', () => {
      const select = this.container?.querySelector('#filterPresetsSelect') as HTMLSelectElement
      if (!select || !select.value) return
      const name = select.value
      if (['Mặc định (Tất cả)', 'Học sinh yếu', 'Thiếu cột điểm'].includes(name)) {
        this.notificationManager.show('Không thể xóa bộ lọc mẫu mặc định', 'warning')
        return
      }
      if (!confirm(`Xóa bộ lọc mẫu "${name}"?`)) return
      let presets = this.loadFilterPresets()
      presets = presets.filter(p => p.name !== name)
      this.saveFilterPresets(presets)
      this.populateFilterPresetsSelect()
      this.studentFilter = {}
      this.searchQuery = ''
      this.updateFilterUI()
      const searchInput = this.container?.querySelector('#searchInput') as any
      if (searchInput) searchInput.value = ''
      this.rerenderStudents()
      this.notificationManager.show(`Đã xóa bộ lọc mẫu "${name}"`, 'success')
    })

    container.querySelector('#filterClassification')?.addEventListener('gl-change', (e: Event) => {
      const val = (e as CustomEvent).detail.value
      this.setFilter({ classification: val === 'all' ? undefined : val })
    })

    container.querySelector('#filterCompletion')?.addEventListener('gl-change', (e: Event) => {
      const val = (e as CustomEvent).detail.value
      this.setFilter({ completion: val === 'all' ? undefined : val as any })
    })

    container.querySelector('#toggleScoreFilterBtn')?.addEventListener('click', () => {
      const panel = container.querySelector('#scoreRangeFilters') as HTMLElement
      if (!panel) return
      const visible = panel.style.display !== 'none'
      panel.style.display = visible ? 'none' : 'block'
      if (!visible) {
        this.renderScoreRangeFilters()
      } else {
        this.studentFilter = { ...this.studentFilter, scoreRanges: undefined }
        this.updateFilterUI()
        this.rerenderStudents()
      }
    })

    const onScoreRangeChange = (e: Event) => {
      const input = (e.target as HTMLElement).closest<HTMLInputElement>('[data-score-range]')
      if (!input) return
      const colKey = input.dataset.col!
      const rangeType = input.dataset.range! as 'min' | 'max'
      const val = input.value.trim()

      const ranges = { ...(this.studentFilter.scoreRanges || {}) }
      if (!ranges[colKey]) ranges[colKey] = {}
      if (val === '') {
        delete ranges[colKey][rangeType]
        if (!Object.keys(ranges[colKey]).length) delete ranges[colKey]
      } else {
        ranges[colKey][rangeType] = parseFloat(val)
      }
      this.studentFilter = { ...this.studentFilter, scoreRanges: Object.keys(ranges).length ? ranges : undefined }
      this.updateFilterUI()
      this.rerenderStudents()
    }
    container.addEventListener('change', onScoreRangeChange)
    this._containerCleanups.push(() => container.removeEventListener('change', onScoreRangeChange))

    // Column visibility popover
    container.querySelector('#colVisibilityBtn')?.addEventListener('click', () => {
      const popover = container.querySelector('#colVisibilityPopover') as HTMLElement
      if (!popover) return
      const visible = popover.style.display !== 'none'
      popover.style.display = visible ? 'none' : 'block'
      if (!visible) this.renderColVisibilityPopover()
    })
    const hideColPopover = (e: MouseEvent) => {
      const btn = container.querySelector('#colVisibilityBtn')
      const popover = container.querySelector('#colVisibilityPopover') as HTMLElement
      if (popover && btn && !btn.contains(e.target as Node) && !popover.contains(e.target as Node)) {
        popover.style.display = 'none'
      }
    }
    document.addEventListener('click', hideColPopover)
    this._documentCleanups.push(() => document.removeEventListener('click', hideColPopover))

    container.querySelector('#searchInput')?.addEventListener('gl-change', debounce((e: Event) => {
      const target = e as CustomEvent
      this.handleSearch(target.detail.value)
    }, 300))

    const validateScoreDebounced = debounce((input: HTMLInputElement) => {
      validateScoreInputEl(input)
    }, 200)

    // Delegated click events
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      
      // Focus input when tapping se-cell
      const seCell = target.closest('.se-cell')
      if (seCell && !target.closest('input, button')) {
        const input = seCell.querySelector<HTMLInputElement>('[data-score-input]')
        if (input) {
          e.preventDefault()
          input.focus()
          return
        }
      }

      // Empty state action handlers
      const emptyAddBtn = target.closest('#emptyAddStudentBtn')
      if (emptyAddBtn) {
        e.preventDefault()
        this.openAddStudent()
        return
      }

      const emptyClearBtn = target.closest('#emptyClearFiltersBtn')
      if (emptyClearBtn) {
        e.preventDefault()
        this.studentFilter = {
          classification: 'all',
          completion: 'all'
        }
        this.searchQuery = ''
        const filterClass = this.container?.querySelector('#filterClassification') as any
        const filterComp = this.container?.querySelector('#filterCompletion') as any
        const searchInput = this.container?.querySelector('#searchInput') as any
        if (filterClass) filterClass.value = 'all'
        if (filterComp) filterComp.value = 'all'
        if (searchInput) searchInput.value = ''
        this.rerenderStudents()
        return
      }

      const addBtn = target.closest('[data-add-score]')
      if (addBtn) {
        e.preventDefault()
        const sid = addBtn.getAttribute('data-sid')!
        const col = addBtn.getAttribute('data-col')!
        const input = addBtn.parentElement?.querySelector<HTMLInputElement>('[data-score-input]')
        if (!input) return
        this.commitScoreInput(input, sid, col)
        return
      }

      const delBtn = target.closest('[data-del-score]')
      if (delBtn) {
        e.preventDefault()
        const sid = delBtn.getAttribute('data-sid')!
        const col = delBtn.getAttribute('data-col')!
        const idx = parseInt(delBtn.getAttribute('data-idx') || '', 10)
        this._skipNextRender = true
        if (this.stateManager.removeScore(this.activeClassId!, sid, col, idx, this.getActiveTerm())) {
          this.updateStudentDOM(sid)
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
          window.dispatchEvent(new CustomEvent('gl:open-journal', { detail: { student, classId: this.activeClassId!, className: cls.name } }))
        }
        return
      }

      const tdName = target.closest('.score-table tbody td.name-col')
      if (tdName) {
        e.preventDefault()
        e.stopPropagation()
        const tr = tdName.closest('tr')!
        const sid = tr.getAttribute('data-id')!
        this.toggleStudentRowExpansion(tr, sid)
        return
      }

      const btnDetailJournal = target.closest('.btn-detail-journal')
      if (btnDetailJournal) {
        e.preventDefault()
        const sid = btnDetailJournal.getAttribute('data-sid')!
        const cls = this.stateManager.getClass(this.activeClassId!)
        const student = cls?.students.find(s => s.id === sid)
        if (student && cls) {
          window.dispatchEvent(new CustomEvent('gl:open-journal', { detail: { student, classId: this.activeClassId!, className: cls.name } }))
        }
        return
      }

      const btnDetailEdit = target.closest('.btn-detail-edit')
      if (btnDetailEdit) {
        e.preventDefault()
        const sid = btnDetailEdit.getAttribute('data-sid')!
        this.openEditStudent(sid)
        return
      }

      const selectAll = target.closest('[data-select-all]')
      if (selectAll) {
        this.selectAllStudents()
        return
      }

      const selectCb = target.closest('[data-select-student]')
      if (selectCb) {
        const sid = selectCb.getAttribute('data-select-student')!
        this.toggleStudentSelection(sid)
        return
      }


    }
    container.addEventListener('click', onClick)
    this._containerCleanups.push(() => container.removeEventListener('click', onClick))

    // Keydown Enter + arrow navigation on score inputs (cards + table)
    const onKeydown = (e: KeyboardEvent) => {
      let key = e.key
      const alt = e.altKey
      const input = (e.target as HTMLElement).closest<HTMLInputElement>('[data-score-input], [data-table-score]')
      if (!input) return

      // Handle Vim-like Alt + h/j/k/l navigation
      if (alt) {
        if (key === 'h') key = 'ArrowLeft'
        else if (key === 'l') key = 'ArrowRight'
        else if (key === 'j') key = 'ArrowDown'
        else if (key === 'k') key = 'ArrowUp'
      }

      if (key === 'Enter') {
        e.preventDefault()
        const sid = input.getAttribute('data-sid')!
        const col = input.getAttribute('data-col')!
        if (input.value.trim()) {
          if (this.commitScoreInput(input, sid, col)) {
            focusNextScoreInput(input, this.container!)
          }
        } else {
          focusNextScoreInput(input, this.container!)
        }
        return
      }

      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) {
        e.preventDefault()
        const allInputs = Array.from(
          this.container!.querySelectorAll<HTMLInputElement>('[data-score-input], [data-table-score]')
        )
        const currentIdx = allInputs.indexOf(input)
        if (currentIdx === -1) return
        const cols = new Set(allInputs.map(inp => inp.dataset.col))
        const nCols = cols.size
        let nextIdx = currentIdx
        switch (key) {
          case 'ArrowRight': nextIdx = Math.min(currentIdx + 1, allInputs.length - 1); break
          case 'ArrowLeft':  nextIdx = Math.max(currentIdx - 1, 0); break
          case 'ArrowDown':  nextIdx = Math.min(currentIdx + nCols, allInputs.length - 1); break
          case 'ArrowUp':    nextIdx = Math.max(currentIdx - nCols, 0); break
        }
        if (nextIdx !== currentIdx) {
          allInputs[nextIdx].focus()
          allInputs[nextIdx].select()
        }
      }
    }
    container.addEventListener('keydown', onKeydown)
    this._containerCleanups.push(() => container.removeEventListener('keydown', onKeydown))

    // Change on table-view score inputs
    const onTableScoreChange = (e: Event) => {
      const input = (e.target as HTMLElement).closest<HTMLInputElement>('[data-table-score]')
      if (!input) return
      const sid = input.getAttribute('data-sid')!
      const col = input.getAttribute('data-col')!
      this.commitScoreInput(input, sid, col)
    }
    container.addEventListener('change', onTableScoreChange)
    this._containerCleanups.push(() => container.removeEventListener('change', onTableScoreChange))

    // Real-time score validation + note autosave
    let noteTimeout: ReturnType<typeof setTimeout>
    const onInput = (e: Event) => {
      const scoreInput = (e.target as HTMLElement).closest<HTMLInputElement>('[data-score-input], [data-table-score]')
      if (scoreInput) {
        validateScoreDebounced(scoreInput)
        return
      }

      const textarea = (e.target as HTMLElement).closest<HTMLTextAreaElement>('[data-note]')
      if (!textarea) return
      clearTimeout(noteTimeout)
      noteTimeout = setTimeout(() => {
        const sid = textarea.getAttribute('data-sid')!
        this._skipNextRender = true
        this.stateManager.updateStudent(this.activeClassId!, sid, { ghiChu: textarea.value })
      }, 600)
    }
    container.addEventListener('input', onInput)
    this._containerCleanups.push(() => container.removeEventListener('input', onInput))

    // Mobile touch gestures (view switch + pull-to-refresh)
    this.cleanupContainerGestures()
    this.ensureContextMenu()

    if ('ontouchstart' in window) {
      const studentsContainer = container.querySelector('#studentsContainer') as HTMLElement
      if (studentsContainer) {
        this.containerGestureCleanups.push(
          setupSwipe(studentsContainer, {
            onSwipeLeft: () => {
              const mode = this.stateManager.getState().viewMode
              const next = nextView(mode)
              if (next !== mode) {
                this.stateManager.setViewMode(next as any)
                const viewSwitcher = container.querySelector('#viewSwitcher') as any
                if (viewSwitcher) viewSwitcher.activeTab = next
                this.rerenderStudents()
              }
            },
            onSwipeRight: () => {
              const mode = this.stateManager.getState().viewMode
              const prev = prevView(mode)
              if (prev !== mode) {
                this.stateManager.setViewMode(prev as any)
                const viewSwitcher = container.querySelector('#viewSwitcher') as any
                if (viewSwitcher) viewSwitcher.activeTab = prev
                this.rerenderStudents()
              }
            },
          }),
          setupPullRefresh(studentsContainer, {
            onRefresh: () => {
              this.notificationManager.show('🔄 Đã làm mới', 'info')
              this.rerenderStudents()
            },
          })
        )
      }
    }

    const studentsContainer = container.querySelector('#studentsContainer') as HTMLElement
    if (studentsContainer) {
      const handler = (e: MouseEvent) => {
        e.preventDefault()
        const target = (e.target as HTMLElement).closest('[data-id]') as HTMLElement
        if (target?.dataset.id) {
          this.showContextMenu(e.clientX, e.clientY, target.dataset.id)
        }
      }
      studentsContainer.addEventListener('contextmenu', handler)
      this.containerGestureCleanups.push(() => studentsContainer.removeEventListener('contextmenu', handler))
    }
  }

  // ------- State Change Notification / Local Rerender -------

  onStateChange(): void {
    if (this._skipNextRender) {
      this._skipNextRender = false
      return
    }
    this.rerenderStudents()
  }

  rerenderStudents(): void {
    const container = this.container?.querySelector('#studentsContainer') as HTMLElement
    if (!container || !this.activeClassId) return
    const cls = this.stateManager.getClass(this.activeClassId)
    if (!cls) return
    const state = this.stateManager.getState()

    const chartContainer = this.container?.querySelector('#classChartContainer') as HTMLElement
    if (chartContainer) {
      if (state.viewMode === 'rank' && cls.students.length > 0) {
        chartContainer.innerHTML = this.buildClassDistributionChartSvg(cls)
        chartContainer.style.display = ''
      } else {
        chartContainer.innerHTML = ''
        chartContainer.style.display = 'none'
      }
    }

    if (!cls.students.length) {
      container.innerHTML = `<div class="dash-empty mt-4">
        <div class="empty-icon">${iconEditStr()}</div>
        <strong>Lớp chưa có học viên</strong>
        <p class="hint" style="margin-top:6px">Thêm học viên mới hoặc nhập điểm từ file CSV (xuất từ app).</p>
      </div>`
      const statsEl = this.container?.querySelector('#classStats') as HTMLElement
      if (statsEl) statsEl.innerHTML = ''
      return
    }

    const isCardView = state.viewMode === 'cards' || (state.viewMode === 'year' && state.activeTerm !== 'year')
    const isTableView = state.viewMode === 'table'
    if (isCardView) {
      this._renderCardsMode(container, cls, state)
      this.renderClassStats()
      this.renderFilterChips()
      this.renderStudentList()
      this.bindStudentGestures()
      this.setupDragDrop()
      return
    }
    if (isTableView) {
      this._renderTableMode(container, cls, state)
      this.renderClassStats()
      this.renderFilterChips()
      this.renderStudentList()
      this.bindStudentGestures()
      this.setupColumnResizers()
      this.setupDragDrop()
      return
    }

    container.innerHTML = renderStudents(cls, state.activeTerm, state.viewMode as any, this.searchQuery, this.studentFilter, this.selectedStudents)
    this.renderClassStats()
    this.renderFilterChips()

    // Restore selection state in DOM checkboxes
    container.querySelectorAll<HTMLInputElement>('.student-select').forEach(cb => {
      cb.checked = this.selectedStudents.has(cb.dataset.selectStudent!)
    })

    // Update desktop student list sidebar
    this.renderStudentList()

    this.bindStudentGestures()
    this.setupColumnResizers()
    this.setupDragDrop()
    this.applyColVisibility()
  }

  private _renderCardsMode(container: HTMLElement, cls: ClassData, state: AppState): void {
    const actualTerm = state.activeTerm === 'year' ? 'hk1' : state.activeTerm
    const cols = resolveClassColumns(cls)

    let students = filterStudents(cls.students, this.searchQuery)
    students = applyFilters(students, cls, state.activeTerm, this.studentFilter)

    if (!students.length) {
      const isFiltered = this.searchQuery || this.studentFilter.classification || this.studentFilter.completion || this.studentFilter.scoreRanges
      if (isFiltered) {
        container.innerHTML = `<div class="dash-empty mt-4 pt-10 pb-10 px-4" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:250px;text-align:center;">
          <div class="empty-icon" style="margin-bottom:8px;">${iconSearchStr()}</div>
          <strong style="font-size:1rem;color:var(--color-text);">Không có học viên phù hợp</strong>
          <p class="hint mt-2" style="line-height:1.45;max-width:280px;margin:6px auto 0;">Thử điều chỉnh hoặc xóa bộ lọc hiện tại của bạn.</p>
          <gl-button variant="ghost" size="sm" id="emptyClearFiltersBtn" style="margin-top:12px;">🧹 Xóa bộ lọc</gl-button>
        </div>`
        container.querySelector('#emptyClearFiltersBtn')?.addEventListener('click', () => this.clearAllFilters())
      } else {
        container.innerHTML = `<div class="dash-empty mt-4 pt-10 pb-10 px-4" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:250px;text-align:center;">
          <div class="empty-icon" style="margin-bottom:8px;">${iconEditStr()}</div>
          <strong style="font-size:1rem;color:var(--color-text);">Lớp chưa có học viên</strong>
          <p class="hint mt-2" style="line-height:1.45;max-width:280px;margin:6px auto 0;">Thêm học viên mới để bắt đầu ghi điểm học kỳ.</p>
        </div>`
      }
      return
    }

    const legendHtml = `<div class="se-legend" aria-hidden="true">
      <span class="se-leg-stt">#</span>
      <span class="se-leg-name">Học viên</span>
      ${cols.map(c => `<span class="se-leg-col" title="${this.escapeHtml(c.label)} ×${cls.weights[c.key] || 1}">${this.escapeHtml(c.short)}<small>×${cls.weights[c.key] || 1}</small></span>`).join('')}
      <span class="se-leg-tb">TB</span>
    </div>`

    container.innerHTML = `<div class="score-entry">${legendHtml}</div>`
    const entry = container.querySelector('.score-entry')!

    for (let i = 0; i < students.length; i++) {
      const st = students[i]
      const card = document.createElement('gl-student-card') as any
      card.student = st
      card.cols = cols
      card.weights = cls.weights
      card.term = actualTerm
      card.index = i
      card.totalCols = cols.length
      card.selected = this.selectedStudents.has(st.id)
      entry.appendChild(card)
    }
  }

  private _renderTableMode(container: HTMLElement, cls: any, state: any): void {
    const actualTerm = state.activeTerm === 'year' ? 'hk1' : state.activeTerm
    const cols = resolveClassColumns(cls)

    let students = filterStudents(cls.students, this.searchQuery)
    students = applyFilters(students, cls, state.activeTerm, this.studentFilter)

    if (!students.length) {
      const isFiltered = this.searchQuery || this.studentFilter.classification || this.studentFilter.completion || this.studentFilter.scoreRanges
      if (isFiltered) {
        container.innerHTML = `<div class="dash-empty mt-4 pt-10 pb-10 px-4" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:250px;text-align:center;">
          <div class="empty-icon" style="margin-bottom:8px;">${iconSearchStr()}</div>
          <strong style="font-size:1rem;color:var(--color-text);">Không có học viên phù hợp</strong>
          <p class="hint mt-2" style="line-height:1.45;max-width:280px;margin:6px auto 0;">Thử điều chỉnh hoặc xóa bộ lọc hiện tại của bạn.</p>
          <gl-button variant="ghost" size="sm" id="emptyClearFiltersBtn" style="margin-top:12px;">🧹 Xóa bộ lọc</gl-button>
        </div>`
        container.querySelector('#emptyClearFiltersBtn')?.addEventListener('click', () => this.clearAllFilters())
      } else {
        container.innerHTML = `<div class="dash-empty mt-4 pt-10 pb-10 px-4" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:250px;text-align:center;">
          <div class="empty-icon" style="margin-bottom:8px;">${iconEditStr()}</div>
          <strong style="font-size:1rem;color:var(--color-text);">Lớp chưa có học viên</strong>
          <p class="hint mt-2" style="line-height:1.45;max-width:280px;margin:6px auto 0;">Thêm học viên mới để bắt đầu ghi điểm học kỳ.</p>
        </div>`
      }
      return
    }

    const headerCols = cols.map((c: any, ci: number) => {
      const priorityClass = ci >= 4 ? 'col-hide-sm' : ci >= 2 ? 'col-hide-xs' : ''
      return `<th scope="col" class="${priorityClass}" title="${c.label}×${cls.weights[c.key] || 1}">${c.short}<br><span>×${cls.weights[c.key] || 1}</span></th>`
    }).join('')

    container.innerHTML = `<div class="table-wrap">
      <table class="score-table">
        <thead><tr><th scope="col" class="sel-col col-hide-xs"><input type="checkbox" id="selectAllTable" data-select-all aria-label="Chọn tất cả" /></th><th scope="col">STT</th><th scope="col" class="name-col col-hide-xs">Họ đệm</th><th scope="col" class="name-col">Tên</th>${headerCols}<th scope="col">TB</th><th scope="col" class="col-hide-xs">Ghi chú</th></tr></thead>
        <tbody></tbody>
      </table>
    </div>
    <p class="hint mt-2">Gõ điểm vào ô — Enter hoặc Tab để sang ô kế tiếp.</p>`

    const tbody = container.querySelector('tbody')!
    for (let i = 0; i < students.length; i++) {
      const st = students[i]
      const row = document.createElement('gl-student-row') as any
      row.student = st
      row.cols = cols
      row.weights = cls.weights
      row.term = actualTerm
      row.index = i
      row.selected = this.selectedStudents.has(st.id)
      tbody.appendChild(row)
    }
  }

  updateStudentDOM(studentId: string): void {
    if (!this.container || !this.activeClassId) return
    const cls = this.stateManager.getClass(this.activeClassId)
    if (!cls) return
    const student = cls.students.find(s => s.id === studentId)
    if (!student) return

    const studentEl = this.container.querySelector(`[data-id="${studentId}"]`) as HTMLElement
    if (!studentEl) return

    const state = this.stateManager.getState()
    const cols = resolveClassColumns(cls)
    const term = state.activeTerm === 'year' ? 'hk1' : state.activeTerm

    if (state.viewMode === 'cards') {
      const card = studentEl.closest('gl-student-card') as any
      if (card) {
        card.student = student
        card.cols = cols
        card.weights = cls.weights
        card.term = term
        card.selected = this.selectedStudents.has(studentId)
      } else {
        this.rerenderStudents()
      }
    } else if (state.viewMode === 'table') {
      const row = studentEl.closest('gl-student-row') as any
      if (row) {
        row.student = student
        row.cols = cols
        row.weights = cls.weights
        row.term = term
        row.selected = this.selectedStudents.has(studentId)
      } else {
        this.rerenderStudents()
      }
    } else {
      this.rerenderStudents()
    }

    this.renderClassStats()
  }

  renderClassStats(): void {
    if (!this.activeClassId) return
    const cls = this.stateManager.getClass(this.activeClassId)
    if (!cls || !cls.students.length) return
    const statsEl = this.container?.querySelector('#classStats') as HTMLElement
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

    const hasFilter = this.searchQuery || this.studentFilter.classification || this.studentFilter.completion || this.studentFilter.scoreRanges
    const filteredTotal = hasFilter ? `<span class="stat-value" style="font-size:0.8rem;">${this.countFilteredStudents()}/${students.length}</span>` : `<span class="stat-value">${students.length}</span>`
    statsEl.innerHTML = `
      <div class="stat"><span class="stat-label">👥 HV</span>${filteredTotal}</div>
      <div class="stat"><span class="stat-label">📊 TB</span><span class="stat-value">${avgTB}</span></div>
      <div class="stat"><span class="stat-label">✅ Đủ điểm</span><span class="stat-value">${complete}/${students.length}</span></div>
      <div class="stat"><span class="stat-label">📈 Đã nhập</span><span class="stat-value">${completeness}%</span></div>
    `

    const hintEl = this.container?.querySelector('#classSizeHint') as HTMLElement
    if (hintEl) {
      if (students.length >= 80 && state.viewMode === 'cards') {
        hintEl.style.display = ''
        hintEl.innerHTML = `<div class="notice notice-info" style="margin-top:6px;font-size:0.8rem;display:flex;align-items:center;gap:8px;">
          <span>📌 Lớp có <strong>${students.length} học viên</strong>. Chuyển sang chế độ <strong>Bảng</strong> để nhập nhanh hơn.</span>
          <gl-button variant="ghost" size="sm" id="switchToTableViewBtn" style="font-size:0.75rem;white-space:nowrap;">📊 Chuyển</gl-button>
        </div>`
        hintEl.querySelector('#switchToTableViewBtn')?.addEventListener('click', () => {
          this.stateManager.setViewMode('table')
          const viewSwitcher = this.container?.querySelector('#viewSwitcher') as any
          if (viewSwitcher) viewSwitcher.activeTab = 'table'
          this.rerenderStudents()
        })
      } else {
        hintEl.style.display = 'none'
        hintEl.innerHTML = ''
      }
    }
  }

  // ------- Scrolled focus -------

  scrollToStudent(studentId: string): void {
    if (!this.container) return
    const row = this.container.querySelector(`[data-id="${studentId}"]`) as HTMLElement
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' })
      row.classList.add('highlight-flash')
      setTimeout(() => row.classList.remove('highlight-flash'), 2000)
    }

    // Also highlight in student list sidebar
    const side = this.container?.querySelector('#cvStudentListComp') as any
    if (side && side.setActiveId) {
      side.setActiveId(studentId)
    }
  }

  private renderStudentList(): void {
    const list = this.container?.querySelector('#cvStudentListComp') as any
    if (!list || !this.activeClassId) return
    const cls = this.stateManager.getClass(this.activeClassId)
    if (!cls) return

    const state = this.stateManager.getState()
    const term = state.activeTerm === 'year' ? 'hk1' : state.activeTerm
    const cols = resolveClassColumns(cls)
    const weights = cls.weights

    list.students = cls.students
    list.cols = cols
    list.weights = weights
    list.term = term
    list.totalCount = cls.students.length
    if (typeof list.setFilter === 'function') {
      list.setFilter(this.searchQuery)
    }
  }

  private bindStudentList(): void {
    const list = this.container?.querySelector('#cvStudentListComp') as HTMLElement
    if (!list) return

    list.addEventListener('student-select', ((e: CustomEvent) => {
      const { studentId } = e.detail
      if (studentId) {
        ;(list as any).setActiveId(studentId)
        this.scrollToStudent(studentId)
      }
    }) as EventListener)
  }

  // ------- Modals & Dialogs -------

  private getActiveTerm(): 'hk1' | 'hk2' {
    const term = this.stateManager.getState().activeTerm
    return term === 'year' ? 'hk1' : term
  }

  private async openAddStudent(): Promise<void> {
    if (!this.activeClassId) return
    await import('./components/gl-add-student')
    let el = document.getElementById('addStudentModal') as any
    if (!el) {
      el = document.createElement('gl-add-student')
      el.id = 'addStudentModal'
      el.stateManager = this.stateManager
      el.notification = this.notificationManager
      document.body.appendChild(el)
    }
    el.classId = this.activeClassId
    el.open = true
  }

  private async openColumnsModal(): Promise<void> {
    if (!this.activeClassId) return
    const { ColumnsModal } = await import('./modals/ColumnsModal')
    const modal = new ColumnsModal(this.stateManager, this.notificationManager)
    modal.open(this.activeClassId, () => this.rerenderStudents())
  }

  private async openParentInvite(): Promise<void> {
    if (!this.activeClassId) return
    await import('./components/gl-parent-invite')
    let el = document.getElementById('parentInviteModal') as any
    if (!el) {
      el = document.createElement('gl-parent-invite')
      el.id = 'parentInviteModal'
      el.stateManager = this.stateManager
      el.authManager = this.authManager
      el.notification = this.notificationManager
      document.body.appendChild(el)
    }
    el.classId = this.activeClassId
    el.open = true
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
    const targetHtml = `<label class="block mb-2">Chọn lớp đích:</label><select id="dlgMoveSelect" class="w-full p-2 rounded-sm bg-surface" style="border:1px solid var(--border);color:var(--text)">${options}</select>`
    
    // Dispatch a request to show the dialog to AppView
    window.dispatchEvent(new CustomEvent('gl:open-prompt', {
      detail: {
        title: `Chuyển "${name}"`,
        message: targetHtml,
        defaultValue: '',
        callback: (result: string | null) => {
          if (result !== null) {
            const select = document.getElementById('dlgMoveSelect') as HTMLSelectElement
            if (select) {
              this.stateManager.transferStudent(studentId, this.activeClassId!, select.value)
              this.notificationManager.show(`Đã chuyển "${name}"`, 'success')
              this.rerenderStudents()
            }
          }
        }
      }
    }))
  }

  // ------- Bulk selection -------

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
    this.container?.querySelectorAll('.student-select').forEach(cb => (cb as HTMLInputElement).checked = false)
  }

  private selectAllStudents(): void {
    const container = this.container?.querySelector('#studentsContainer')
    if (!container) return
    const cbs = container.querySelectorAll<HTMLInputElement>('.student-select')
    const allChecked = Array.from(cbs).every(cb => cb.checked)
    cbs.forEach(cb => {
      cb.checked = !allChecked
      const sid = cb.dataset.selectStudent!
      if (!allChecked) {
        this.selectedStudents.add(sid)
      } else {
        this.selectedStudents.delete(sid)
      }
    })
    this.updateBulkBar()
  }

  private updateBulkBar(): void {
    const bar = this.container?.querySelector('gl-bulk-action-bar') as any
    if (!bar) return
    bar.count = this.selectedStudents.size
  }

  private async openBulkEdit(): Promise<void> {
    if (!this.activeClassId || this.selectedStudents.size === 0) return
    const cls = this.stateManager.getClass(this.activeClassId)
    if (!cls) return
    const ids = Array.from(this.selectedStudents)
    const students = ids.map(id => cls.students.find(s => s.id === id)).filter(Boolean) as any[]
    if (!students.length) return
    const { BulkEditModal } = await import('./modals/BulkEditModal')
    const modal = new BulkEditModal(this.stateManager, this.notificationManager)
    modal.open(this.activeClassId!, students, () => {
      this.clearSelection()
      this.rerenderStudents()
    })
  }

  // ------- Filters & Search -------

  private setFilter(update: Partial<StudentFilter>): void {
    this.studentFilter = { ...this.studentFilter, ...update }
    this.updateFilterUI()
    this.rerenderStudents()
  }

  private renderScoreRangeFilters(): void {
    const panel = this.container?.querySelector('#scoreRangeFilters') as HTMLElement
    if (!panel || !this.activeClassId) return
    const cls = this.stateManager.getClass(this.activeClassId)
    if (!cls) return
    const cols = resolveClassColumns(cls)
    const ranges = this.studentFilter.scoreRanges || {}

    panel.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
        <span style="font-size:0.75rem;font-weight:600;color:var(--muted);white-space:nowrap;">Lọc theo cột:</span>
        ${cols.map(c => {
          const r = ranges[c.key] || {}
          return `<div style="display:flex;align-items:center;gap:4px;background:var(--surface);padding:4px 8px;border-radius:var(--radius-sm);border:1px solid var(--border);font-size:0.75rem;">
            <span style="font-weight:600;white-space:nowrap;">${this.escapeHtml(c.short)}</span>
            <input type="number" data-score-range data-col="${c.key}" data-range="min" placeholder="Từ" value="${r.min ?? ''}" min="0" max="10" step="0.25" style="width:52px;padding:2px 4px;border:1px solid var(--border);border-radius:4px;background:var(--bg);color:var(--text);font-size:0.7rem;" />
            <span style="color:var(--muted);">→</span>
            <input type="number" data-score-range data-col="${c.key}" data-range="max" placeholder="Đến" value="${r.max ?? ''}" min="0" max="10" step="0.25" style="width:52px;padding:2px 4px;border:1px solid var(--border);border-radius:4px;background:var(--bg);color:var(--text);font-size:0.7rem;" />
          </div>`
        }).join('')}
        <gl-button variant="ghost" size="sm" id="clearScoreRangesBtn" style="font-size:0.7rem;">✕ Xóa</gl-button>
      </div>
    `

    panel.querySelector('#clearScoreRangesBtn')?.addEventListener('click', () => {
      this.studentFilter = { ...this.studentFilter, scoreRanges: undefined }
      this.updateFilterUI()
      this.rerenderStudents()
      this.renderScoreRangeFilters()
    })
  }

  // ------- Column Visibility -------

  private loadColVisibility(): Record<string, boolean> {
    if (!this.activeClassId) return {}
    try {
      const data = localStorage.getItem(`col-vis:${this.activeClassId}`)
      return data ? JSON.parse(data) : {}
    } catch { return {} }
  }

  private saveColVisibility(vis: Record<string, boolean>): void {
    if (!this.activeClassId) return
    try { localStorage.setItem(`col-vis:${this.activeClassId}`, JSON.stringify(vis)) } catch {}
  }

  private renderColVisibilityPopover(): void {
    const popover = this.container?.querySelector('#colVisibilityPopover') as HTMLElement
    if (!popover || !this.activeClassId) return
    const cls = this.stateManager.getClass(this.activeClassId)
    if (!cls) return
    const cols = resolveClassColumns(cls)
    const vis = this.loadColVisibility()

    popover.innerHTML = `
      <div style="font-size:0.75rem;font-weight:700;color:var(--muted);padding:4px 6px 8px;border-bottom:1px solid var(--border);margin-bottom:6px;">Ẩn/Hiện cột điểm</div>
      ${cols.map(c => {
        const hidden = vis[c.key] === false
        return `<label style="display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:4px;cursor:pointer;font-size:0.8rem;transition:background 0.1s;" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background=''">
          <input type="checkbox" data-col-vis="${c.key}" ${hidden ? '' : 'checked'} style="accent-color:var(--color-primary);" />
          <span>${this.escapeHtml(c.short)}</span>
          <span style="margin-left:auto;color:var(--muted);font-size:0.7rem;">×${cls.weights[c.key] || 1}</span>
        </label>`
      }).join('')}
      <div style="border-top:1px solid var(--border);margin-top:6px;padding-top:6px;display:flex;gap:6px;">
        <gl-button variant="ghost" size="sm" id="colVisShowAll" style="font-size:0.7rem;">Hiện tất cả</gl-button>
        <gl-button variant="ghost" size="sm" id="colVisHideAll" style="font-size:0.7rem;">Ẩn tất cả</gl-button>
      </div>
    `

    popover.querySelector('#colVisShowAll')?.addEventListener('click', () => {
      this.saveColVisibility({})
      this.applyColVisibility()
      this.renderColVisibilityPopover()
    })
    popover.querySelector('#colVisHideAll')?.addEventListener('click', () => {
      const allHidden: Record<string, boolean> = {}
      cols.forEach(c => { allHidden[c.key] = false })
      this.saveColVisibility(allHidden)
      this.applyColVisibility()
      this.renderColVisibilityPopover()
    })
    popover.querySelectorAll('[data-col-vis]').forEach(cb => {
      cb.addEventListener('change', (e: Event) => {
        const input = e.target as HTMLInputElement
        const colKey = input.dataset.colVis!
        const vis = this.loadColVisibility()
        vis[colKey] = input.checked
        this.saveColVisibility(vis)
        this.applyColVisibility()
      })
    })
  }

  private applyColVisibility(): void {
    if (!this.container || !this.activeClassId) return
    const vis = this.loadColVisibility()
    const table = this.container.querySelector('.score-table') as HTMLElement
    if (!table) return

    // Toggle on header cells
    table.querySelectorAll('thead th').forEach(th => {
      const colKey = (th as HTMLElement).querySelector('[data-table-score]')?.getAttribute('data-col')
      if (!colKey) return
      th.classList.toggle('col-hidden', vis[colKey] === false)
    })
    // Toggle on body cells (match by data-col on input)
    table.querySelectorAll('tbody td').forEach(td => {
      const input = (td as HTMLElement).querySelector<HTMLInputElement>('[data-table-score]')
      if (!input) return
      const colKey = input.dataset.col
      if (!colKey) return
      td.classList.toggle('col-hidden', vis[colKey] === false)
    })
  }

  private updateFilterUI(): void {
    const el = this.container
    if (!el) return
    const f = this.studentFilter
    const selClass = el.querySelector('#filterClassification') as any
    if (selClass) selClass.value = f.classification || 'all'
    const selComp = el.querySelector('#filterCompletion') as any
    if (selComp) selComp.value = f.completion || 'all'
    const panel = el.querySelector('#scoreRangeFilters') as HTMLElement
    if (panel && f.scoreRanges) {
      panel.style.display = 'block'
      this.renderScoreRangeFilters()
    }
    this.renderFilterChips()
  }

  private renderFilterChips(): void {
    const el = this.container?.querySelector('#filterChips') as HTMLElement
    if (!el) return
    const f = this.studentFilter
    const chips: string[] = []

    if (f.classification) {
      const labels: Record<string, string> = { 'rank-xs': 'XS (≥9)', 'rank-g': 'Giỏi', 'rank-k': 'Khá', 'rank-tb': 'TB', 'rank-y': 'Yếu', 'rank-none': 'Chưa có TB' }
      chips.push(`<span class="chip chip-filter" data-filter="classification">${labels[f.classification] || f.classification} <span class="chip-remove" data-filter="classification">✕</span></span>`)
    }
    if (f.completion) {
      const labels: Record<string, string> = { complete: 'Đủ điểm', incomplete: 'Thiếu điểm', none: 'Chưa có điểm' }
      chips.push(`<span class="chip chip-filter" data-filter="completion">${labels[f.completion]} <span class="chip-remove" data-filter="completion">✕</span></span>`)
    }
    if (f.scoreRanges) {
      const ranges = Object.entries(f.scoreRanges)
        .map(([k, r]) => `${k} ${r.min ?? '…'}→${r.max ?? '…'}`)
        .join(', ')
      chips.push(`<span class="chip chip-filter" data-filter="scoreRanges">🎯 ${ranges} <span class="chip-remove" data-filter="scoreRanges">✕</span></span>`)
    }

    el.innerHTML = chips.length
      ? `<span style="font-size:0.7rem;color:var(--muted);white-space:nowrap;">Lọc:</span> ${chips.join(' ')}<gl-button variant="ghost" size="sm" id="clearAllFiltersBtn" style="font-size:0.7rem;padding:2px 6px;margin-left:2px;">🧹 Xóa hết</gl-button>`
      : ''

    el.querySelector('#clearAllFiltersBtn')?.addEventListener('click', () => this.clearAllFilters())
    el.querySelectorAll('.chip-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filter = (e.currentTarget as HTMLElement).dataset.filter
        if (filter === 'classification') this.setFilter({ classification: undefined })
        else if (filter === 'completion') this.setFilter({ completion: undefined })
        else if (filter === 'scoreRanges') {
          this.studentFilter = { ...this.studentFilter, scoreRanges: undefined }
          this.updateFilterUI()
          this.rerenderStudents()
        }
      })
    })
  }

  private clearAllFilters(): void {
    this.studentFilter = {}
    this.searchQuery = ''
    const searchInput = this.container?.querySelector('#searchInput') as any
    if (searchInput) searchInput.value = ''
    this.updateFilterUI()
    this.rerenderStudents()
  }

  private countFilteredStudents(): number {
    if (!this.activeClassId) return 0
    const cls = this.stateManager.getClass(this.activeClassId)
    if (!cls) return 0
    const state = this.stateManager.getState()
    const searched = filterStudents(cls.students, this.searchQuery || undefined)
    const filtered = applyFilters(searched, cls, state.activeTerm === 'year' ? 'hk1' : state.activeTerm, this.studentFilter)
    return filtered.length
  }

  private handleSearch(query: string): void {
    this.searchQuery = query.trim()
    this.rerenderStudents()
  }

  // ------- Score input & touch gestures -------

  private commitScoreInput(input: HTMLInputElement, sid: string, col: string): boolean {
    const score = validateScoreInputEl(input)
    if (score === null) {
      if (input.value.trim()) {
        this.notificationManager.show('Điểm không hợp lệ (0–10)', 'error')
      }
      return false
    }
    this._skipNextRender = true
    const ok = this.stateManager.addScore(this.activeClassId!, sid, col, score, this.getActiveTerm())
    if (ok) {
      input.value = ''
      input.classList.remove('is-invalid')
      input.removeAttribute('aria-invalid')
      this.updateStudentDOM(sid)
      if (this.container) focusNextScoreInput(input, this.container)
    }
    return ok
  }

  private cleanupContainerGestures(): void {
    this.containerGestureCleanups.forEach(fn => fn())
    this.containerGestureCleanups = []
  }

  private cleanupStudentGestures(): void {
    this.studentGestureCleanups.forEach(fn => fn())
    this.studentGestureCleanups = []
  }

  private bindStudentGestures(): void {
    this.cleanupStudentGestures()
    if (!('ontouchstart' in window)) return

    const list = this.container?.querySelector('#studentsContainer')
    if (!list) return

    list.querySelectorAll<HTMLElement>('.score-card').forEach(card => {
      const sid = card.dataset.id
      if (!sid) return

      this.studentGestureCleanups.push(
        setupLongPress(card, () => {
          const rect = card.getBoundingClientRect()
          this.showContextMenu(rect.left + rect.width / 2, rect.top + 40, sid)
        }),
        setupItemSwipe(card, {
          onSwipeLeft: () => this.deleteLastScoreForStudent(sid),
          onSwipeRight: () => this.toggleStudentStarred(sid),
        })
      )
    })

    list.querySelectorAll<HTMLElement>('.se-cell').forEach(cell => {
      const card = cell.closest('.score-card') as HTMLElement | null
      if (!card?.dataset.id || !cell.dataset.colKey) return
      const sid = card.dataset.id
      const col = cell.dataset.colKey

      this.studentGestureCleanups.push(
        setupItemSwipe(cell, {
          onSwipeLeft: () => this.deleteLastScoreInColumn(sid, col),
        })
      )
    })

    list.querySelectorAll<HTMLElement>('tr[data-id]').forEach(row => {
      const sid = row.dataset.id
      if (!sid) return

      this.studentGestureCleanups.push(
        setupLongPress(row, () => {
          const rect = row.getBoundingClientRect()
          this.showContextMenu(rect.left + rect.width / 2, rect.top + 24, sid)
        }),
        setupItemSwipe(row, {
          onSwipeLeft: () => this.deleteLastScoreForStudent(sid),
          onSwipeRight: () => this.toggleStudentStarred(sid),
        })
      )
    })
  }

  private deleteLastScoreInColumn(sid: string, col: string): void {
    const cls = this.stateManager.getClass(this.activeClassId!)
    if (!cls) return
    const student = cls.students.find(s => s.id === sid)
    if (!student) return
    const term = this.getActiveTerm()
    const scores = student.scoresByTerm?.[term]?.[col] || []
    if (!scores.length) {
      this.notificationManager.show('Cột này chưa có điểm', 'info')
      return
    }
    this._skipNextRender = true
    if (this.stateManager.removeScore(this.activeClassId!, sid, col, scores.length - 1, term)) {
      this.notificationManager.show('Đã xóa điểm', 'info')
      this.updateStudentDOM(sid)
    }
  }

  private deleteLastScoreForStudent(sid: string): void {
    const cls = this.stateManager.getClass(this.activeClassId!)
    if (!cls) return
    const student = cls.students.find(s => s.id === sid)
    if (!student) return
    const term = this.getActiveTerm()
    const cols = resolveClassColumns(cls)
    for (let i = cols.length - 1; i >= 0; i--) {
      const col = cols[i]
      const scores = student.scoresByTerm?.[term]?.[col.key] || []
      if (scores.length > 0) {
        this.deleteLastScoreInColumn(sid, col.key)
        return
      }
    }
    this.notificationManager.show('Không có điểm để xóa', 'info')
  }

  private toggleStudentStarred(sid: string): void {
    const cls = this.stateManager.getClass(this.activeClassId!)
    const student = cls?.students.find(s => s.id === sid)
    if (!student) return
    const starred = !student.starred
    this._skipNextRender = true
    this.stateManager.updateStudent(this.activeClassId!, sid, { starred })
    this.updateStudentDOM(sid)
    this.notificationManager.show(starred ? '⭐ Đã đánh dấu quan trọng' : 'Đã bỏ đánh dấu', 'info')
  }

  private ensureContextMenu(): void {
    if (this.contextMenuBound) return
    this.contextMenuBound = true

    let menu = document.getElementById('gestureContextMenu') as HTMLElement | null
    if (!menu) {
      menu = document.createElement('div')
      menu.id = 'gestureContextMenu'
      menu.className = 'gesture-context-menu hidden'
      menu.setAttribute('role', 'menu')
      menu.innerHTML = `
        <button type="button" data-ctx="journal">📓 Nhật ký học vụ</button>
        <button type="button" data-ctx="move">⇄ Chuyển lớp</button>
        <button type="button" data-ctx="star">⭐ Đánh dấu quan trọng</button>
        <button type="button" data-ctx="delete">× Xóa học viên</button>
      `
      document.body.appendChild(menu)
    }

    menu.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('[data-ctx]') as HTMLElement | null
      if (!btn || !this.contextMenuSid) return
      const sid = this.contextMenuSid
      this.hideContextMenu()
      switch (btn.dataset.ctx) {
        case 'journal': {
          const cls = this.stateManager.getClass(this.activeClassId!)
          const student = cls?.students.find(s => s.id === sid)
          if (student && cls) {
            window.dispatchEvent(new CustomEvent('gl:open-journal', {
              detail: { student, classId: this.activeClassId!, className: cls.name },
            }))
          }
          break
        }
        case 'move':
          this.openMoveStudentDialog(sid)
          break
        case 'star':
          this.toggleStudentStarred(sid)
          break
        case 'delete':
          this.confirmDeleteStudent(sid)
          break
      }
    })

    const hideCtxMenu = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('#gestureContextMenu')) {
        this.hideContextMenu()
      }
    }
    document.addEventListener('click', hideCtxMenu)
    this._documentCleanups.push(() => document.removeEventListener('click', hideCtxMenu))
  }

  private showContextMenu(x: number, y: number, sid: string): void {
    const menu = document.getElementById('gestureContextMenu')
    if (!menu) return
    this.contextMenuSid = sid
    menu.classList.remove('hidden')
    const maxX = window.innerWidth - 200
    const maxY = window.innerHeight - 220
    menu.style.left = `${Math.min(Math.max(x - 90, 8), maxX)}px`
    menu.style.top = `${Math.min(Math.max(y, 8), maxY)}px`

    const cls = this.stateManager.getClass(this.activeClassId!)
    const st = cls?.students.find(s => s.id === sid)
    const starBtn = menu.querySelector('[data-ctx="star"]')
    if (starBtn && st) {
      starBtn.textContent = st.starred ? '☆ Bỏ đánh dấu' : '⭐ Đánh dấu quan trọng'
    }

    // Cleanup previous focus trap
    const oldTrap = (menu as any)._ctxFocusTrap
    if (oldTrap) {
      oldTrap.destroy()
      delete (menu as any)._ctxFocusTrap
    }

    // Focus trap + Escape to close
    const trap = createFocusTrap(menu)
    ;(menu as any)._ctxFocusTrap = trap

    const escHandler = (ke: KeyboardEvent) => {
      if (ke.key === 'Escape') {
        ke.preventDefault()
        this.hideContextMenu()
      }
    }
    menu.addEventListener('keydown', escHandler)
    ;(menu as any)._ctxEscHandler = escHandler
  }

  private hideContextMenu(): void {
    const menu = document.getElementById('gestureContextMenu')
    if (menu) {
      menu.classList.add('hidden')
      const trap = (menu as any)._ctxFocusTrap
      if (trap) {
        trap.destroy()
        delete (menu as any)._ctxFocusTrap
      }
      const escHandler = (menu as any)._ctxEscHandler
      if (escHandler) {
        menu.removeEventListener('keydown', escHandler)
        delete (menu as any)._ctxEscHandler
      }
    }
    this.contextMenuSid = null
  }

  // ------- Helper -------

  private buildClassDistributionChartSvg(cls: any): string {
    const cols = resolveClassColumns(cls)
    const state = this.stateManager.getState()
    
    let xs = 0, g = 0, k = 0, tbCount = 0, y = 0, none = 0
    
    for (const student of cls.students) {
      let score: number | null = null
      if (state.activeTerm === 'year') {
        score = studentYearTB(student, cls.weights, cols)
      } else {
        score = studentTB(student, cls.weights, state.activeTerm, cols)
      }
      
      if (score === null) {
        none++
      } else {
        const cl = classify(score)
        if (cl.rank === 'rank-xs') xs++
        else if (cl.rank === 'rank-g') g++
        else if (cl.rank === 'rank-k') k++
        else if (cl.rank === 'rank-tb') tbCount++
        else if (cl.rank === 'rank-y') y++
      }
    }
    
    const data = [
      { label: 'XS', count: xs, color: '#10b981' },
      { label: 'Giỏi', count: g, color: '#3b82f6' },
      { label: 'Khá', count: k, color: '#eab308' },
      { label: 'TB', count: tbCount, color: '#f97316' },
      { label: 'Yếu', count: y, color: '#ef4444' },
      { label: 'Chưa có', count: none, color: '#94a3b8' }
    ]

    const maxCount = Math.max(...data.map(d => d.count), 1)
    const width = 460
    const height = 150
    const colW = width / 6
    const barW = 28
    const maxBarH = 90

    let barsHtml = ''
    data.forEach((d, i) => {
      const barH = (d.count / maxCount) * maxBarH
      const x = i * colW + (colW - barW) / 2
      const yPos = 120 - barH
      const labelY = yPos - 6
      const countLabel = d.count > 0 ? `<text x="${x + barW / 2}" y="${labelY}" font-family="system-ui,sans-serif" font-size="10" font-weight="bold" fill="var(--text-main)" text-anchor="middle">${d.count}</text>` : ''

      barsHtml += `
        <rect x="${x}" y="30" width="${barW}" height="${maxBarH}" rx="4" fill="var(--border)" opacity="0.1" />
        <rect x="${x}" y="${yPos}" width="${barW}" height="${barH}" rx="4" fill="${d.color}" />
        ${countLabel}
        <text x="${x + barW / 2}" y="140" font-family="system-ui,sans-serif" font-size="10" fill="var(--text-main)" opacity="0.8" text-anchor="middle">${d.label}</text>
      `
    })

    return `
      <div class="class-distribution-chart my-4 p-4 rounded-lg" style="border:1px solid var(--border-color, var(--border));background:var(--card-bg, var(--surface))">
        <h4 class="mb-4 uppercase opacity-80" style="font-size:0.85rem;letter-spacing:0.05em;color:var(--text-main, var(--text))">📊 Phổ học lực của lớp</h4>
        <svg viewBox="0 0 ${width} ${height}" class="w-full" style="height:auto;overflow:visible">
          ${barsHtml}
        </svg>
      </div>
    `
  }

  private setupColumnResizers(): void {
    if (!this.container) return
    const table = this.container.querySelector('.score-table')
    if (!table) return

    const headerCells = table.querySelectorAll('thead th')
    const classId = this.activeClassId

    headerCells.forEach((th, index) => {
      const thEl = th as HTMLElement
      if (index < 4) return
      if (index >= headerCells.length - 2) return

      if (thEl.querySelector('.col-resizer')) return

      const resizer = document.createElement('div')
      resizer.className = 'col-resizer'
      thEl.appendChild(resizer)

      const colKey = thEl.querySelector('[data-table-score]')?.getAttribute('data-col')
      if (colKey && classId) {
        try {
          const saved = localStorage.getItem(`col-width:${classId}:${colKey}`)
          if (saved) {
            thEl.style.width = saved + 'px'
          }
        } catch {}
      }

      let startX = 0
      let startWidth = 0

      resizer.addEventListener('mousedown', (e) => {
        e.preventDefault()
        startX = e.clientX
        startWidth = thEl.offsetWidth
        resizer.classList.add('is-resizing')

        const onMouseMove = (e2: MouseEvent) => {
          const delta = e2.clientX - startX
          const newWidth = Math.max(48, startWidth + delta)
          thEl.style.width = `${newWidth}px`

          if (colKey && classId) {
            try { localStorage.setItem(`col-width:${classId}:${colKey}`, String(newWidth)) } catch {}
          }
        }

        const onMouseUp = () => {
          resizer.classList.remove('is-resizing')
          document.removeEventListener('mousemove', onMouseMove)
          document.removeEventListener('mouseup', onMouseUp)
        }

        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
      })
    })
  }

  private setupDragDrop(): void {
    if (!this.container) return

    // Desktop only: skip on touch devices and narrow screens
    if (window.innerWidth < 900 || 'ontouchstart' in window) return

    const list = this.container.querySelector('#studentsContainer')
    if (!list) return

    let dragSrcId: string | null = null

    const handleDragStart = (e: Event) => {
      const ev = e as DragEvent
      const el = (ev.target as HTMLElement).closest('[data-id]') as HTMLElement
      if (!el) return
      dragSrcId = el.dataset.id!
      ev.dataTransfer?.setData('text/plain', dragSrcId)
      el.classList.add('is-dragging')
      ev.dataTransfer!.effectAllowed = 'move'
    }

    const handleDragOver = (e: Event) => {
      const ev = e as DragEvent
      ev.preventDefault()
      ev.dataTransfer!.dropEffect = 'move'

      const el = (ev.target as HTMLElement).closest('[data-id]') as HTMLElement
      if (!el || el.dataset.id === dragSrcId) return

      list.querySelectorAll('.is-drag-over').forEach(el => el.classList.remove('is-drag-over'))
      el.classList.add('is-drag-over')
    }

    const handleDrop = (e: Event) => {
      const ev = e as DragEvent
      ev.preventDefault()
      const targetId = ((ev.target as HTMLElement).closest('[data-id]') as HTMLElement)?.dataset.id
      if (!dragSrcId || !targetId || dragSrcId === targetId) return

      if (this.activeClassId) {
        this.stateManager.reorderStudent(this.activeClassId, dragSrcId, targetId)
        this.rerenderStudents()
      }

      dragSrcId = null
      list.querySelectorAll('.is-drag-over, .is-dragging').forEach(el => el.classList.remove('is-drag-over', 'is-dragging'))
    }

    const handleDragEnd = () => {
      dragSrcId = null
      list.querySelectorAll('.is-drag-over, .is-dragging').forEach(el => el.classList.remove('is-drag-over', 'is-dragging'))
    }

    list.addEventListener('dragstart', handleDragStart)
    list.addEventListener('dragover', handleDragOver)
    list.addEventListener('drop', handleDrop)
    list.addEventListener('dragend', handleDragEnd)

    list.querySelectorAll<HTMLElement>('[data-id]').forEach(el => {
      el.draggable = true
    })

    const cleanups = [
      () => list.removeEventListener('dragstart', handleDragStart),
      () => list.removeEventListener('dragover', handleDragOver),
      () => list.removeEventListener('drop', handleDrop),
      () => list.removeEventListener('dragend', handleDragEnd),
    ]

    this.studentGestureCleanups.push(() => {
      cleanups.forEach(fn => fn())
      list.querySelectorAll<HTMLElement>('[data-id]').forEach(el => { el.draggable = false })
    })
  }

  private toggleStudentRowExpansion(tr: HTMLTableRowElement, _sid: string): void {
    const row = tr.closest('gl-student-row') as any
    if (row) {
      row.toggleExpand()
      tr.classList.toggle('is-expanded')
    }
  }



  private async openEditStudent(studentId: string): Promise<void> {
    const cls = this.stateManager.getClass(this.activeClassId!)
    if (!cls) return
    const student = cls.students.find(s => s.id === studentId)
    if (!student) return

    let modal = document.getElementById('editStudentModal') as any
    if (modal) {
      modal.remove()
    }
    
    modal = document.createElement('gl-modal')
    modal.id = 'editStudentModal'
    modal.setAttribute('heading', 'Chỉnh sửa thông tin học viên')
    modal.setAttribute('size', 'md')

    const infoFieldsHtml = INFO_FIELD_DEFS.map(f => {
      const id = `editInfo_${f.key}`
      const val = (student as any)[f.key] || ''
      if (f.type === 'select') {
        const opts = (f.options || []).map(o =>
          `<option value="${this.escapeHtml(o)}" ${o === val ? 'selected' : ''}>${o || '—'}</option>`
        ).join('')
        return `<div><label class="field-label" for="${id}">${f.label}</label><select id="${id}" class="input">${opts}</select></div>`
      }
      const inputmode = f.inputmode ? ` inputmode="${f.inputmode}"` : ''
      const placeholder = f.placeholder ? ` placeholder="${this.escapeHtml(f.placeholder)}"` : ''
      return `<div><label class="field-label" for="${id}">${f.label}</label><input id="${id}" class="input" type="${f.type}" value="${this.escapeHtml(val)}"${inputmode}${placeholder} autocomplete="off" /></div>`
    }).join('')

    modal.innerHTML = `
      <form id="editForm" class="add-name-form" autocomplete="off" style="display: flex; flex-direction: column; gap: 12px;">
        <div class="name-fields" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
          <div>
            <label class="field-label" for="editTenThanh">Tên thánh</label>
            <input id="editTenThanh" class="input" type="text" value="${this.escapeHtml(student.tenThanh || '')}" placeholder="VD: Anna" autocomplete="off" />
          </div>
          <div>
            <label class="field-label" for="editHoDem">Họ và tên đệm</label>
            <input id="editHoDem" class="input" type="text" value="${this.escapeHtml(student.hoDem || '')}" placeholder="VD: Nguyễn Ngọc Kim" autocomplete="off" />
          </div>
          <div>
            <label class="field-label" for="editTen">Tên</label>
            <input id="editTen" class="input" type="text" value="${this.escapeHtml(student.ten || student.name)}" placeholder="VD: Anh" required autocomplete="off" />
          </div>
        </div>
        <div style="margin-top: 10px;">
          <h4 style="margin: 0 0 10px; color: var(--color-primary); font-weight: 750;">Thông tin liên lạc & Khác</h4>
          <div class="add-info-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            ${infoFieldsHtml}
          </div>
        </div>
      </form>
      <div slot="footer" class="add-form-actions">
        <gl-button variant="ghost" id="editStudentModalCancel">Hủy</gl-button>
        <gl-button variant="primary" type="submit" form="editForm">Lưu thay đổi</gl-button>
      </div>
    `
    document.body.appendChild(modal)
    modal.open = true

    modal.addEventListener('gl-close', () => {
      modal.open = false
      modal.remove()
    })

    modal.querySelector('#editStudentModalCancel')?.addEventListener('click', () => {
      modal.open = false
      modal.remove()
    })

    const form = modal.querySelector('#editForm') as HTMLFormElement
    form?.addEventListener('submit', (e: Event) => {
      e.preventDefault()
      const holyNameInput = modal.querySelector('#editTenThanh') as HTMLInputElement
      const lastNameInput = modal.querySelector('#editHoDem') as HTMLInputElement
      const firstNameInput = modal.querySelector('#editTen') as HTMLInputElement

      const holyName = holyNameInput.value.trim()
      const lastName = lastNameInput.value.trim()
      const firstName = firstNameInput.value.trim()

      if (!firstName) return

      const infoValues = Object.fromEntries(
        INFO_FIELD_DEFS.map(f => {
          const el = modal.querySelector(`#editInfo_${f.key}`) as HTMLInputElement | HTMLSelectElement
          return [f.key, el?.value?.trim() || '']
        })
      ) as Record<InfoField, string>

      this.stateManager.updateStudent(this.activeClassId!, studentId, {
        tenThanh: holyName,
        hoDem: lastName,
        ten: firstName,
        name: [holyName, lastName, firstName].filter(Boolean).join(' '),
        maHV: infoValues.maHV,
        ngaySinh: infoValues.ngaySinh,
        gioiTinh: infoValues.gioiTinh,
        tenPhuHuynh: infoValues.tenPhuHuynh,
        sdPhuHuynh: infoValues.sdPhuHuynh,
        diaChi: infoValues.diaChi,
        email: infoValues.email
      })

      modal.open = false
      modal.remove()
      this.notificationManager.show('Đã cập nhật thông tin học viên', 'success')
      this.rerenderStudents()
    })
  }

  private loadFilterPresets(): Array<{ name: string, filter: StudentFilter, search: string }> {
    try {
      const data = localStorage.getItem('student-filter-presets')
      if (data) return JSON.parse(data)
    } catch {}
    return [
      { name: 'Mặc định (Tất cả)', filter: { classification: undefined, completion: undefined }, search: '' },
      { name: 'Học sinh yếu', filter: { classification: 'rank-y', completion: undefined }, search: '' },
      { name: 'Thiếu cột điểm', filter: { classification: undefined, completion: 'incomplete' }, search: '' }
    ]
  }

  private saveFilterPresets(presets: any[]): void {
    try {
      localStorage.setItem('student-filter-presets', JSON.stringify(presets))
    } catch {}
  }

  private populateFilterPresetsSelect(): void {
    const select = this.container?.querySelector('#filterPresetsSelect') as HTMLSelectElement
    if (!select) return
    const presets = this.loadFilterPresets()
    select.innerHTML = presets.map(p => `<option value="${this.escapeHtml(p.name)}">${this.escapeHtml(p.name)}</option>`).join('')
  }

  openStudentDetail(studentId: string): void {
    if (!this.activeClassId) return
    const cls = this.stateManager.getClass(this.activeClassId)
    if (!cls) return
    const student = cls.students.find(s => s.id === studentId)
    if (!student) return
    const state = this.stateManager.getState()
    const cols = resolveClassColumns(cls)
    const term = state.activeTerm === 'year' ? 'hk1' : state.activeTerm
    const panel = this.container?.querySelector('gl-student-detail') as any
    if (!panel) return
    panel.student = student
    panel.cols = cols
    panel.weights = cls.weights
    panel.term = term
    panel.open = true
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
