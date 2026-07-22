// ============================================================
// Sổ Điểm GL — Class Bulk Student Actions Controller
// Lit ReactiveController pattern + backward-compat bind
// ============================================================

import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { StateManager } from '../StateManager'
import { NotificationManager } from '../../services/NotificationManager'

export interface ClassBulkActionsOptions {
  stateManager: StateManager
  notificationManager: NotificationManager
  getContainer: () => HTMLElement | null
  getActiveClassId: () => string | null
  rerenderStudents: () => void
}

export class ClassBulkActions implements ReactiveController {
  private options: ClassBulkActionsOptions
  private selectedStudents: Set<string> = new Set()

  constructor(host: (ReactiveControllerHost & HTMLElement) | null, options: ClassBulkActionsOptions) {
    this.options = options
    if (host) host.addController(this)
  }

  hostConnected(): void {
    this.bind()
  }

  hostDisconnected(): void {
    // ClassBulkActions uses delegated events on container, no unbind needed
  }

  getSelectedStudents(): Set<string> {
    return this.selectedStudents
  }

  clearSelection(): void {
    this.selectedStudents.clear()
    this.updateBulkActionBar()
  }

  toggleStudentSelection(studentId: string): void {
    if (this.selectedStudents.has(studentId)) {
      this.selectedStudents.delete(studentId)
    } else {
      this.selectedStudents.add(studentId)
    }
    this.updateBulkActionBar()
  }

  updateBulkActionBar(): void {
    const container = this.options.getContainer()
    const bar = container?.querySelector('#bulkActionBar') as HTMLElement
    if (!bar) return

    const count = this.selectedStudents.size
    bar.classList.toggle('visible', count > 0)

    const countEl = bar.querySelector('.bulk-count')
    if (countEl) {
      countEl.textContent = `Đã chọn ${count} học viên`
    }
  }

  bind(): void {
    const container = this.options.getContainer()
    if (!container) return

    container.querySelector('#clearSelectionBtn')?.addEventListener('click', () => {
      this.clearSelection()
      this.options.rerenderStudents()
    })

    container.querySelector('#bulkEditBtn')?.addEventListener('click', async () => {
      if (this.selectedStudents.size === 0) return
      const classId = this.options.getActiveClassId()
      if (!classId) return
      const cls = this.options.stateManager.getClass(classId)
      if (!cls) return
      const selectedStudentObjs = cls.students.filter(s => this.selectedStudents.has(s.id))

      const { BulkEditModal } = await import('../views/modals/BulkEditModal')
      const modal = new BulkEditModal(
        this.options.stateManager,
        this.options.notificationManager
      )
      modal.open(classId, selectedStudentObjs, () => {
        this.clearSelection()
        this.options.rerenderStudents()
      })
    })
  }
}
