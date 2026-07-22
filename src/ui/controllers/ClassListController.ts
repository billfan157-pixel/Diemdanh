import type { ReactiveController, ReactiveControllerHost } from 'lit'
import type { StateManager } from '../StateManager'
import type { AuthManager } from '../../core/auth/AuthManager'
import type { NotificationManager } from '../../services/NotificationManager'
import { VirtualList } from '../views/VirtualList'
import { iconFolderStr } from '../views/components/gl-icons'

export interface ClassListControllerOptions {
  stateManager: StateManager
  authManager: AuthManager
  notificationManager: NotificationManager
  promptDialog: (title: string, message: string, defaultValue?: string) => Promise<string | null>
  selectClass: (classId: string) => void
  closeMobileDrawer: () => void
  renderCurrentView: () => void
  getRootElement: () => HTMLElement | null
}

export class ClassListController implements ReactiveController {
  private host: (ReactiveControllerHost & HTMLElement) | null
  private options: ClassListControllerOptions
  private classListVList: VirtualList<any> | null = null
  private bulkClassMode = false
  private selectedClasses: Set<string> = new Set()

  constructor(host: (ReactiveControllerHost & HTMLElement) | null, options: ClassListControllerOptions) {
    this.host = host
    this.options = options
    if (host) host.addController(this)
  }

  hostConnected(): void {
    this.attach()
  }

  hostDisconnected(): void {
    this.detach()
  }

  attach(): void {
  }

  detach(): void {
    this.classListVList?.destroy()
    this.classListVList = null
  }

  getBulkClassMode(): boolean { return this.bulkClassMode }
  getSelectedClasses(): Set<string> { return this.selectedClasses }
  getClassListVList(): VirtualList<any> | null { return this.classListVList }

  updateClassList(): void {
    const root = this.host || this.options.getRootElement()
    const el = root?.querySelector('#classList') as HTMLElement
    if (!el) return

    const classes = this.options.stateManager.getVisibleClasses()
    if (!classes.length) {
      if (this.classListVList) {
        this.classListVList.destroy()
        this.classListVList = null
      }
      el.innerHTML = `
        <div class="class-item empty hidden"></div>
        <div class="dash-empty dash-empty-col px-3 py-5">
          <div class="empty-icon" style="margin-bottom:10px">${iconFolderStr()}</div>
          <strong style="font-size:0.9rem">Chưa có lớp${this.options.stateManager.getState().yearFilter ? ' trong năm đã chọn' : ''}</strong>
          <p class="hint mt-2" style="font-size:0.8rem;line-height:1.4">
            ${this.options.authManager?.isAdmin()
              ? 'Tạo lớp mới từ ô bên dưới để bắt đầu nhập điểm.'
              : 'Liên hệ Ban GL để được gán lớp.'}
          </p>
        </div>
      `
      return
    }

    const sorted = [...classes].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    const activeId = this.options.stateManager.getState().activeClassId
    const canDel = this.options.authManager?.isAdmin() ?? false

    if (this.classListVList) {
      this.classListVList.destroy()
    }

    const colors = [
      'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      'linear-gradient(135deg, #10b981, #047857)',
      'linear-gradient(135deg, #8b5cf6, #6d28d9)',
      'linear-gradient(135deg, #f59e0b, #b45309)',
      'linear-gradient(135deg, #ec4899, #be185d)',
    ]

    this.classListVList = new VirtualList({
      container: el,
      scrollContainer: el.closest('.sidebar-body') as HTMLElement || el,
      items: sorted,
      itemHeight: 64,
      renderItem: (c: any) => {
        const firstLetter = c.name ? c.name.charAt(0).toUpperCase() : 'L'
        const isArchived = this.options.stateManager.isYearArchived(c.year)
        const isSelected = c.id === activeId
        const colorIdx = (c.name.charCodeAt(0) + c.name.charCodeAt(c.name.length - 1 || 0)) % colors.length
        const avatarBg = isArchived ? 'linear-gradient(135deg, #94a3b8, #475569)' : colors[colorIdx]
        const isChecked = this.selectedClasses.has(c.id)

        return `
          <div class="class-item ${isSelected ? 'active' : ''}" data-select-class="${c.id}" role="button" tabindex="0">
            ${this.bulkClassMode ? `<input type="checkbox" class="class-bulk-select mr-2 cursor-pointer" data-class-id="${c.id}" ${isChecked ? 'checked' : ''} onclick="event.stopPropagation()" />` : ''}
            <div class="class-avatar" style="background:${avatarBg}">${firstLetter}</div>
            <div class="class-info">
              <div class="class-name">${this.escape(c.name)}</div>
              <div class="class-meta">${c.students.length} học viên ${c.year ? `· ${this.escape(c.year)}` : ''}${isArchived ? ' · Lưu trữ' : ''}</div>
            </div>
            <div class="class-actions">
              <button type="button" class="icon-btn" data-rename-class="${c.id}" title="Đổi tên" aria-label="Đổi tên lớp">✏️</button>
              ${canDel && !this.bulkClassMode ? `<button type="button" class="icon-btn danger" data-del-class="${c.id}" title="Xóa lớp" aria-label="Xóa lớp">🗑️</button>` : ''}
            </div>
          </div>
        `
      },
    })

    const toggleBulkBtn = root?.querySelector('#btnToggleBulkClass') as HTMLElement
    if (toggleBulkBtn) {
      toggleBulkBtn.style.display = canDel ? '' : 'none'
      toggleBulkBtn.textContent = this.bulkClassMode ? 'Hủy' : 'Chọn nhiều'
    }
    this.updateBulkClassDelBtn()

    const classesToggleCount = root?.querySelector('#classesToggleCount')
    if (classesToggleCount) {
      classesToggleCount.textContent = `(${classes.length})`
    }
    this.updateRecentClasses()
  }

  updateBulkClassDelBtn(): void {
    const root = this.host || this.options.getRootElement()
    const bulkDelBtn = root?.querySelector('#btnBulkDelClass') as HTMLElement
    if (bulkDelBtn) {
      bulkDelBtn.style.display = (this.bulkClassMode && this.selectedClasses.size > 0) ? '' : 'none'
      bulkDelBtn.textContent = `🗑️ Xóa (${this.selectedClasses.size})`
    }
    const toggleBulkBtn = root?.querySelector('#btnToggleBulkClass') as HTMLElement
    if (toggleBulkBtn) {
      toggleBulkBtn.textContent = this.bulkClassMode ? 'Hủy' : 'Chọn nhiều'
    }
  }

  toggleBulkMode(): void {
    this.bulkClassMode = !this.bulkClassMode
    if (!this.bulkClassMode) {
      this.selectedClasses.clear()
    }
    this.updateClassList()
  }

  toggleClassSelection(id: string): void {
    if (this.selectedClasses.has(id)) {
      this.selectedClasses.delete(id)
    } else {
      this.selectedClasses.add(id)
    }
    this.updateClassList()
  }

  async renameClass(id: string): Promise<void> {
    const cls = this.options.stateManager.getClass(id)
    if (!cls) return
    const newName = await this.options.promptDialog('Đổi tên lớp', 'Nhập tên mới:', cls.name)
    if (newName) {
      this.options.stateManager.updateClass(id, { name: newName })
      this.options.notificationManager?.show('Đã đổi tên lớp.')
    }
  }

  async confirmDeleteClass(id: string): Promise<void> {
    const cls = this.options.stateManager.getClass(id)
    if (!cls) return
    const ok = await this.options.notificationManager!.confirm(
      `Xóa lớp "${cls.name}" và toàn bộ điểm học viên?\n\nCó thể Hoàn tác (Ctrl+Z) trong phiên này.`,
      { title: 'Xóa lớp?', type: 'danger', confirmText: 'Xóa', cancelText: 'Hủy' }
    )
    if (ok) {
      this.options.stateManager.deleteClass(id)
      this.options.notificationManager?.show('Đã xóa lớp.')
    }
  }

  onCreateClass(event?: Event): void {
    const root = this.host || this.options.getRootElement()
    if (event) event.preventDefault()
    const nameInput = root?.querySelector<HTMLInputElement>('#newClassName')
    const yearInput = root?.querySelector<HTMLInputElement>('#newClassYear')
    if (!nameInput) return
    const name = nameInput.value.trim()
    if (!name) {
      this.options.notificationManager?.show('Vui lòng nhập tên lớp', 'warning')
      return
    }
    const year = yearInput?.value.trim() || ''
    this.options.stateManager.createClass(name, year)
    nameInput.value = ''
    if (yearInput) yearInput.value = ''
    this.options.notificationManager?.show(`Đã tạo lớp "${name}"`, 'success')
  }

  onClassListClick(e: Event): void {
    const target = e.target as HTMLElement
    const delBtn = target.closest('[data-del-class]')
    if (delBtn) {
      e.stopPropagation()
      const id = delBtn.getAttribute('data-del-class')!
      this.confirmDeleteClass(id)
      return
    }
    const renameBtn = target.closest('[data-rename-class]')
    if (renameBtn) {
      e.stopPropagation()
      const id = renameBtn.getAttribute('data-rename-class')!
      this.renameClass(id)
      return
    }
    const selectClass = target.closest('[data-select-class]')
    if (selectClass) {
      const id = selectClass.getAttribute('data-select-class')!
      if (this.bulkClassMode) {
        e.preventDefault()
        e.stopPropagation()
        this.toggleClassSelection(id)
        return
      }
      this.options.selectClass(id)
      this.options.closeMobileDrawer()
    }
  }

  onClassListChange(e: Event): void {
    const target = e.target as HTMLInputElement
    if (target.classList.contains('class-bulk-select')) {
      e.stopPropagation()
      const id = target.dataset.classId
      if (!id) return
      if (target.checked) {
        this.selectedClasses.add(id)
      } else {
        this.selectedClasses.delete(id)
      }
      this.updateBulkClassDelBtn()
    }
  }

  trackRecentClass(classId: string): void {
    const ids = this.loadRecentClassIds().filter(id => id !== classId)
    ids.unshift(classId)
    this.saveRecentClassIds(ids)
    this.updateRecentClasses()
  }

  private loadRecentClassIds(): string[] {
    try {
      const data = localStorage.getItem('recent-classes')
      if (!data || data === 'undefined' || data === 'null') return []
      const parsed = JSON.parse(data)
      return Array.isArray(parsed) ? parsed : []
    } catch { return [] }
  }

  private saveRecentClassIds(ids: string[]): void {
    try {
      localStorage.setItem('recent-classes', JSON.stringify(ids.slice(0, 5)))
    } catch {}
  }

  private updateRecentClasses(): void {
    const root = this.host || this.options.getRootElement()
    const section = root?.querySelector('#recentClassesSection') as HTMLElement
    const panel = root?.querySelector('#recentClassesPanel') as HTMLElement
    if (!section || !panel) return
    const ids = this.loadRecentClassIds()
    if (!ids.length) {
      section.style.display = 'none'
      return
    }
    const classes = ids.map(id => this.options.stateManager.getClass(id)).filter(Boolean)
    if (!classes.length) {
      section.style.display = 'none'
      return
    }
    section.style.display = ''
    panel.innerHTML = classes.map(c => `
      <div class="class-item" data-select-class="${c!.id}" role="button" tabindex="0" style="padding:8px 12px;">
        <div class="class-info">
          <div class="class-name">${this.escape(c!.name)}</div>
          <div class="class-meta">${c!.students.length} học viên ${c!.year ? `· ${this.escape(c!.year)}` : ''}</div>
        </div>
      </div>
    `).join('')
  }

  private escape(s: string): string {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
}
