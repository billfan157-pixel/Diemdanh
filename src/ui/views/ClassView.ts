import { StateManager } from '../StateManager'
import { AuthManager } from '../../core/auth/AuthManager'
import { NotificationManager } from '../../services/NotificationManager'
import { resolveClassColumns, displayName, debounce } from '../../config/constants.ts'
import { renderStudents, StudentFilter } from '../../views/StudentRenderer.ts'
import { renderSingleStudentCard } from '../../views/cardsView.ts'
import { studentTBContext, studentTB, studentYearTB, classify } from '../../core/calc.ts'
import { fmt } from '../../views/helpers.ts'
import { setupSwipe, setupLongPress, setupItemSwipe, setupPullRefresh, nextView, prevView } from '../gestures.ts'
import { validateScoreInputEl, focusNextScoreInput } from '../../utils/scoreInput.ts'

export class ClassView {
  private container: HTMLElement | null = null
  private activeClassId: string | null = null
  private searchQuery = ''
  private studentFilter: StudentFilter = {}
  private selectedStudents: Set<string> = new Set()
  private _skipNextRender = false
  private containerGestureCleanups: (() => void)[] = []
  private studentGestureCleanups: (() => void)[] = []
  private contextMenuSid: string | null = null
  private contextMenuBound = false

  constructor(
    private stateManager: StateManager,
    private authManager: AuthManager,
    private notificationManager: NotificationManager
  ) {}

  render(container: HTMLElement, classId: string): void {
    this.container = container
    this.activeClassId = classId

    const cls = this.stateManager.getClass(classId)
    if (!cls) return

    const isDesktop = window.innerWidth > 900

    container.innerHTML = `
      <div class="class-view">
        <div class="class-header">
          <h2>${this.escapeHtml(cls.name)} ${cls.year ? `· ${this.escapeHtml(cls.year)}` : ''}${this.stateManager.isYearArchived(cls.year) ? ' · lưu trữ' : ''}</h2>
          <div class="class-actions">
            <button class="btn btn-secondary btn-sm" id="addStudentBtn" ${this.stateManager.isClassArchived(cls.id) ? 'disabled' : ''}>➕ Thêm HV</button>
            <button class="btn btn-ghost btn-sm" id="classColumnsBtn">⚖️ Cột điểm</button>
            <button class="btn btn-ghost btn-sm" id="classInviteBtn">📝 Phiếu PH</button>
          </div>
        </div>

        ${isDesktop ? `
        <div class="cv-side" id="cvStudentList">
          <div class="cv-side-header">
            Học viên · <span id="cvStudentCount">${cls.students.length}</span>
          </div>
          <div class="cv-side-search">
            <input type="text" id="cvStudentFilter" placeholder="Tìm nhanh..." aria-label="Tìm học viên theo tên" />
          </div>
          <div id="cvStudentItems"></div>
        </div>
        <div class="cv-main">
        ` : ''}

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
              <div class="search-wrap flex-1">
                <input type="search" id="searchInput" class="input" placeholder="Tìm học viên..." aria-label="Tìm học viên" value="${this.escapeHtml(this.searchQuery)}" />
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
          <div id="classChartContainer" style="display:none"></div>
          <div id="studentsContainer">
            <div class="skeleton-list px-4" id="studentSkeleton">
              <div class="skeleton skeleton-table-row"><div class="skeleton skeleton-avatar"></div><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text-sm"></div><div class="skeleton skeleton-text-sm"></div><div class="skeleton skeleton-text-sm"></div></div>
              <div class="skeleton skeleton-table-row"><div class="skeleton skeleton-avatar"></div><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text-sm"></div><div class="skeleton skeleton-text-sm"></div><div class="skeleton skeleton-text-sm"></div></div>
              <div class="skeleton skeleton-table-row"><div class="skeleton skeleton-avatar"></div><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text-sm"></div><div class="skeleton skeleton-text-sm"></div><div class="skeleton skeleton-text-sm"></div></div>
              <div class="skeleton skeleton-table-row"><div class="skeleton skeleton-avatar"></div><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text-sm"></div><div class="skeleton skeleton-text-sm"></div><div class="skeleton skeleton-text-sm"></div></div>
            </div>
          </div>

          <div id="bulkActionBar">
            <span class="bulk-count">Đã chọn 0 học viên</span>
            <div class="bulk-actions">
              <button class="btn btn-primary btn-sm" id="bulkEditBtn">✏️ Sửa điểm</button>
              <button class="btn btn-ghost btn-sm" id="clearSelectionBtn">Bỏ chọn</button>
            </div>
          </div>

        ${isDesktop ? '</div>' : ''}
      </div>
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

    const container = this.container

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
        if (this.activeClassId) {
          this.render(container, this.activeClassId)
        }
      })
    })

    container.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = (btn as HTMLElement).dataset.view!
        this.stateManager.setViewMode(mode as any)
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

    const searchInput = container.querySelector('#searchInput') as HTMLInputElement
    if (searchInput) {
      searchInput.addEventListener('input', debounce((e: Event) => {
        const target = e.target as HTMLInputElement
        this.handleSearch(target.value)
      }, 300))
    }

    const validateScoreDebounced = debounce((input: HTMLInputElement) => {
      validateScoreInputEl(input)
    }, 200)

    // Delegated click events
    container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      
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

      const bulkEditBtn = target.closest('#bulkEditBtn')
      if (bulkEditBtn) {
        this.openBulkEdit()
        return
      }

      const clearSelBtn = target.closest('#clearSelectionBtn')
      if (clearSelBtn) {
        this.clearSelection()
        return
      }
    })

    // Keydown Enter + arrow navigation on score inputs (cards + table)
    container.addEventListener('keydown', (e) => {
      const key = (e as KeyboardEvent).key
      const input = (e.target as HTMLElement).closest<HTMLInputElement>('[data-score-input], [data-table-score]')
      if (!input) return

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
    })

    // Change on table-view score inputs
    container.addEventListener('change', (e) => {
      const input = (e.target as HTMLElement).closest<HTMLInputElement>('[data-table-score]')
      if (!input) return
      const sid = input.getAttribute('data-sid')!
      const col = input.getAttribute('data-col')!
      this.commitScoreInput(input, sid, col)
    })

    // Real-time score validation + note autosave
    let noteTimeout: ReturnType<typeof setTimeout>
    container.addEventListener('input', (e) => {
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
        // Safe notes update: skip state manager full render because _skipNextRender is true,
        // and we don't trigger anything else since notes don't affect average score
        this.stateManager.updateStudent(this.activeClassId!, sid, { ghiChu: textarea.value })
      }, 600)
    })

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
                container.querySelectorAll('[data-view]').forEach(b => {
                  b.classList.toggle('active', (b as HTMLElement).dataset.view === next)
                })
                this.rerenderStudents()
              }
            },
            onSwipeRight: () => {
              const mode = this.stateManager.getState().viewMode
              const prev = prevView(mode)
              if (prev !== mode) {
                this.stateManager.setViewMode(prev as any)
                container.querySelectorAll('[data-view]').forEach(b => {
                  b.classList.toggle('active', (b as HTMLElement).dataset.view === prev)
                })
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
        <div class="empty-icon">✏️</div>
        <strong>Lớp chưa có học viên</strong>
        <p class="hint" style="margin-top:6px">Thêm học viên mới hoặc nhập điểm từ file CSV (xuất từ app).</p>
      </div>`
      const statsEl = this.container?.querySelector('#classStats') as HTMLElement
      if (statsEl) statsEl.innerHTML = ''
      return
    }

    container.innerHTML = renderStudents(cls, state.activeTerm, state.viewMode as any, this.searchQuery, this.studentFilter, this.selectedStudents)
    this.renderClassStats()

    // Restore selection state in DOM checkboxes
    container.querySelectorAll<HTMLInputElement>('.student-select').forEach(cb => {
      cb.checked = this.selectedStudents.has(cb.dataset.selectStudent!)
    })

    // Update desktop student list sidebar
    this.renderStudentList()
    const countEl = this.container?.querySelector('#cvStudentCount')
    if (countEl) countEl.textContent = String(cls.students.length)

    this.bindStudentGestures()
    this.setupColumnResizers()
    this.setupDragDrop()
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
    const selected = this.selectedStudents.has(studentId)

    if (state.viewMode === 'cards') {
      const newHtml = renderSingleStudentCard(student, cls.students.indexOf(student), cols, cls.weights, term, cols.length, selected)
      studentEl.outerHTML = newHtml
    } else if (state.viewMode === 'table') {
      const tb = studentTB(student, cls.weights, term, cols)
      const tbCell = studentEl.querySelector('.tb-cell')
      if (tbCell) {
        tbCell.textContent = fmt(tb)
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

    statsEl.innerHTML = `
      <div class="stat"><span class="stat-label">👥 HV</span><span class="stat-value">${students.length}</span></div>
      <div class="stat"><span class="stat-label">📊 TB</span><span class="stat-value">${avgTB}</span></div>
      <div class="stat"><span class="stat-label">✅ Đủ điểm</span><span class="stat-value">${complete}/${students.length}</span></div>
      <div class="stat"><span class="stat-label">📈 Đã nhập</span><span class="stat-value">${completeness}%</span></div>
    `
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
    const side = this.container.querySelector('#cvStudentItems')
    if (side) {
      side.querySelectorAll('.cv-student-item').forEach(el => el.classList.remove('active'))
      const item = side.querySelector(`[data-cv-id="${studentId}"]`) as HTMLElement
      if (item) {
        item.classList.add('active')
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }

  private renderStudentList(): void {
    const side = this.container?.querySelector('#cvStudentItems')
    if (!side || !this.activeClassId) return
    const cls = this.stateManager.getClass(this.activeClassId)
    if (!cls) return

    const state = this.stateManager.getState()
    const term = state.activeTerm === 'year' ? 'hk1' : state.activeTerm
    const cols = resolveClassColumns(cls)
    const weights = cls.weights

    side.innerHTML = cls.students.map(st => {
      const tb = studentTB(st, weights, term, cols)
      const disp = displayName(st)
      return `<div class="cv-student-item" data-cv-id="${st.id}">
        <span class="cv-student-name">${this.escapeHtml(disp)}</span>
        <span class="cv-student-tb">${fmt(tb)}</span>
      </div>`
    }).join('')
  }

  private bindStudentList(): void {
    const side = this.container?.querySelector('#cvStudentItems')
    if (!side) return

    side.addEventListener('click', (e) => {
      const item = (e.target as HTMLElement).closest('.cv-student-item') as HTMLElement
      if (item) {
        const id = item.dataset.cvId
        if (id) {
          side.querySelectorAll('.cv-student-item').forEach(el => el.classList.remove('active'))
          item.classList.add('active')
          this.scrollToStudent(id)
        }
      }
    })

    const filterInput = this.container?.querySelector('#cvStudentFilter') as HTMLInputElement
    if (filterInput) {
      filterInput.addEventListener('input', debounce(() => {
        const q = filterInput.value.toLowerCase().trim()
        side.querySelectorAll('.cv-student-item').forEach(el => {
          const name = (el.querySelector('.cv-student-name') as HTMLElement)?.textContent?.toLowerCase() || ''
          el.classList.toggle('hidden', !!q && !name.includes(q))
        })
      }, 300))
    }
  }

  // ------- Modals & Dialogs -------

  private getActiveTerm(): 'hk1' | 'hk2' {
    const term = this.stateManager.getState().activeTerm
    return term === 'year' ? 'hk1' : term
  }

  private async openAddStudent(): Promise<void> {
    if (!this.activeClassId) return
    const { AddStudentModal } = await import('./modals/AddStudentModal')
    const modal = new AddStudentModal(this.stateManager, this.authManager)
    modal.open(this.activeClassId)
  }

  private async openColumnsModal(): Promise<void> {
    if (!this.activeClassId) return
    const { ColumnsModal } = await import('./modals/ColumnsModal')
    const modal = new ColumnsModal(this.stateManager, this.notificationManager)
    modal.open(this.activeClassId, () => this.rerenderStudents())
  }

  private async openParentInvite(): Promise<void> {
    if (!this.activeClassId) return
    const { ParentInviteModal } = await import('./modals/ParentInviteModal')
    const modal = new ParentInviteModal(this.stateManager, this.authManager, this.notificationManager)
    modal.open(this.activeClassId)
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
    const bar = this.container?.querySelector('#bulkActionBar') as HTMLElement
    if (!bar) return
    const count = this.selectedStudents.size
    if (count > 0) {
      bar.classList.add('visible')
      const bc = bar.querySelector('.bulk-count')
      if (bc) bc.textContent = `Đã chọn ${count} học viên`
    } else {
      bar.classList.remove('visible')
    }
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

  private updateFilterUI(): void {
    const el = this.container
    if (!el) return
    const f = this.studentFilter
    const selClass = el.querySelector<HTMLSelectElement>('#filterClassification')
    if (selClass) selClass.value = f.classification || 'all'
    const selComp = el.querySelector<HTMLSelectElement>('#filterCompletion')
    if (selComp) selComp.value = f.completion || 'all'
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

    document.addEventListener('click', (e) => {
      if (!(e.target as HTMLElement).closest('#gestureContextMenu')) {
        this.hideContextMenu()
      }
    })
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

    // Remove previous handler if exists
    const oldHandler = (menu as any)._ctxHandler
    if (oldHandler) {
      menu.removeEventListener('keydown', oldHandler)
    }

    // Keyboard navigation for context menu
    const items = menu.querySelectorAll<HTMLButtonElement>('button')
    const handler = (ke: KeyboardEvent) => {
      const current = document.activeElement as HTMLElement
      let idx = Array.from(items).indexOf(current as HTMLButtonElement)
      switch (ke.key) {
        case 'ArrowDown':
          ke.preventDefault()
          idx = Math.min(idx + 1, items.length - 1)
          items[idx]?.focus()
          break
        case 'ArrowUp':
          ke.preventDefault()
          idx = Math.max(idx - 1, 0)
          items[idx]?.focus()
          break
        case 'Escape':
          ke.preventDefault()
          this.hideContextMenu()
          break
      }
    }
    menu.addEventListener('keydown', handler)
    ;(menu as any)._ctxHandler = handler
    items[0]?.focus()
  }

  private hideContextMenu(): void {
    const menu = document.getElementById('gestureContextMenu')
    if (menu) {
      menu.classList.add('hidden')
      const handler = (menu as any)._ctxHandler
      if (handler) {
        menu.removeEventListener('keydown', handler)
        delete (menu as any)._ctxHandler
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
        const saved = localStorage.getItem(`col-width:${classId}:${colKey}`)
        if (saved) {
          thEl.style.width = saved + 'px'
        }
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
            localStorage.setItem(`col-width:${classId}:${colKey}`, String(newWidth))
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

  private escapeHtml(s: string): string {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
}
