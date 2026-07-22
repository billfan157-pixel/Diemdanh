// ============================================================
// Sổ Điểm GL — Class Filters, Presets & Column Visibility Controller
// Lit ReactiveController pattern + backward-compat bind
// ============================================================

import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { NotificationManager } from '../../services/NotificationManager'
import { StudentFilter } from '../../views/StudentRenderer'

export interface FilterPreset {
  name: string
  filter: StudentFilter
  search?: string
}

export interface ClassFilterControllerOptions {
  notificationManager: NotificationManager
  getContainer: () => HTMLElement | null
  getStudentFilter: () => StudentFilter
  setStudentFilter: (filter: StudentFilter) => void
  getSearchQuery: () => string
  setSearchQuery: (query: string) => void
  updateFilterUI: () => void
  rerenderStudents: () => void
  renderScoreRangeFilters: () => void
  renderColVisibilityPopover: () => void
}

export class ClassFilterController implements ReactiveController {
  private options: ClassFilterControllerOptions

  constructor(host: (ReactiveControllerHost & HTMLElement) | null, options: ClassFilterControllerOptions) {
    this.options = options
    if (host) host.addController(this)
  }

  hostConnected(): void {
    this.bind()
  }

  hostDisconnected(): void {
    // ClassFilterController uses delegated events on container, no unbind needed
  }

  loadFilterPresets(): FilterPreset[] {
    try {
      const data = localStorage.getItem('filter-presets')
      if (data) {
        return JSON.parse(data)
      }
    } catch (e) {
      console.error('Failed to load filter presets:', e)
    }

    return [
      { name: 'Mặc định (Tất cả)', filter: {}, search: '' },
      { name: 'Học sinh yếu', filter: { classification: 'rank-y' } },
      { name: 'Thiếu cột điểm', filter: { completion: 'incomplete' } }
    ]
  }

  saveFilterPresets(presets: FilterPreset[]): void {
    try {
      localStorage.setItem('filter-presets', JSON.stringify(presets))
    } catch (e) {
      console.error('Failed to save filter presets:', e)
    }
  }

  populateFilterPresetsSelect(): void {
    const container = this.options.getContainer()
    const select = container?.querySelector('#filterPresetsSelect') as HTMLSelectElement
    if (!select) return

    const presets = this.loadFilterPresets()
    select.innerHTML = presets
      .map(p => `<option value="${this.escapeHtml(p.name)}">${this.escapeHtml(p.name)}</option>`)
      .join('')
  }

  bind(): void {
    const container = this.options.getContainer()
    if (!container) return

    this.populateFilterPresetsSelect()

    container.querySelector('#filterPresetsSelect')?.addEventListener('change', (e) => {
      const name = (e.target as HTMLSelectElement).value
      const presets = this.loadFilterPresets()
      const preset = presets.find(p => p.name === name)
      if (preset) {
        this.options.setStudentFilter({ ...preset.filter })
        this.options.setSearchQuery(preset.search || '')
        this.options.updateFilterUI()

        const searchInput = container.querySelector('#searchInput') as any
        if (searchInput) searchInput.value = preset.search || ''

        this.options.rerenderStudents()
      }
    })

    container.querySelector('#btnSaveFilterPreset')?.addEventListener('click', () => {
      const name = prompt('Đặt tên cho bộ lọc mẫu này:')
      if (!name || !name.trim()) return
      const presets = this.loadFilterPresets()
      const existingIdx = presets.findIndex(p => p.name.toLowerCase() === name.trim().toLowerCase())
      const newPreset = {
        name: name.trim(),
        filter: { ...this.options.getStudentFilter() },
        search: this.options.getSearchQuery()
      }
      if (existingIdx >= 0) {
        presets[existingIdx] = newPreset
      } else {
        presets.push(newPreset)
      }
      this.saveFilterPresets(presets)
      this.populateFilterPresetsSelect()

      const select = container.querySelector('#filterPresetsSelect') as HTMLSelectElement
      if (select) select.value = name.trim()

      this.options.notificationManager.show(`Đã lưu bộ lọc "${name.trim()}"`, 'success')
    })

    container.querySelector('#btnDelFilterPreset')?.addEventListener('click', () => {
      const select = container.querySelector('#filterPresetsSelect') as HTMLSelectElement
      if (!select || !select.value) return
      const name = select.value
      if (['Mặc định (Tất cả)', 'Học sinh yếu', 'Thiếu cột điểm'].includes(name)) {
        this.options.notificationManager.show('Không thể xóa bộ lọc mẫu mặc định', 'warning')
        return
      }
      if (!confirm(`Xóa bộ lọc mẫu "${name}"?`)) return
      let presets = this.loadFilterPresets()
      presets = presets.filter(p => p.name !== name)
      this.saveFilterPresets(presets)
      this.populateFilterPresetsSelect()
      this.options.setStudentFilter({})
      this.options.setSearchQuery('')
      this.options.updateFilterUI()
      const searchInput = container.querySelector('#searchInput') as any
      if (searchInput) searchInput.value = ''
      this.options.rerenderStudents()
      this.options.notificationManager.show(`Đã xóa bộ lọc mẫu "${name}"`, 'success')
    })

    container.querySelector('#toggleScoreFilterBtn')?.addEventListener('click', () => {
      const panel = container.querySelector('#scoreRangeFilters') as HTMLElement
      if (!panel) return
      const visible = panel.style.display !== 'none'
      panel.style.display = visible ? 'none' : 'block'
      if (!visible) {
        this.options.renderScoreRangeFilters()
      } else {
        const filter = { ...this.options.getStudentFilter(), scoreRanges: undefined }
        this.options.setStudentFilter(filter)
        this.options.updateFilterUI()
        this.options.rerenderStudents()
      }
    })

    // Column visibility popover
    container.querySelector('#colVisibilityBtn')?.addEventListener('click', () => {
      const popover = container.querySelector('#colVisibilityPopover') as HTMLElement
      if (!popover) return
      const visible = popover.style.display !== 'none'
      popover.style.display = visible ? 'none' : 'block'
      if (!visible) this.options.renderColVisibilityPopover()
    })
  }

  private escapeHtml(str: string): string {
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m] || m))
  }
}
