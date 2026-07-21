import { StateManager } from '../../StateManager'
import { resolveClassColumns } from '../../../config/columns.ts'
import { displayName, termLabel, studentMissingCols } from '../../../core/legacyCompat.ts'
import { createFocusTrap } from '../../../utils/focusTrap.ts'

export class MissingScoresModal {
  private stateManager: StateManager
  private overlay: HTMLElement | null = null
  private _focusTrap: ReturnType<typeof createFocusTrap> | null = null

  constructor(stateManager: StateManager, _notificationManager: any) {
    this.stateManager = stateManager
  }

  open(): void {
    this.render()
  }

  close(): void {
    this._focusTrap?.destroy()
    this._focusTrap = null
    if (this.overlay) {
      this.overlay.remove()
      this.overlay = null
    }
  }

  private render(): void {
    const state = this.stateManager.getState()
    const term: 'hk1' | 'hk2' = state.activeTerm === 'year' ? 'hk1' : state.activeTerm
    const classes = state.classes.filter(c => !state.yearFilter || c.year === state.yearFilter)
    const classStats = classes.map(cls => {
      const cols = resolveClassColumns(cls)
      const students = cls.students.map(st => ({
        student: st,
        missing: studentMissingCols(st, term, cols)
      }))
      const hasMissing = students.filter(s => s.missing.length > 0)
      return { cls, students, hasMissing }
    }).filter(c => c.hasMissing.length > 0)

    this.overlay = document.createElement('div')
    this.overlay.className = 'modal-overlay'
    this.overlay.setAttribute('role', 'dialog')
    this.overlay.setAttribute('aria-modal', 'true')
    this.overlay.setAttribute('aria-labelledby', 'missingScoresTitle')
    this.overlay.innerHTML = `
<div class="modal-panel overflow-y-auto" style="max-width:600px;max-height:80vh">
  <h2 id="missingScoresTitle">📋 Học viên thiếu điểm <button class="modal-close" id="missingModalClose" aria-label="Đóng">×</button></h2>
  <p class="hint mb-3">Học kỳ: ${termLabel(term)}</p>
  ${classStats.length ? classStats.map(cs => `
    <div class="mb-4">
      <h3 style="font-size:.95rem;margin-bottom:6px">${cs.cls.name} (${cs.hasMissing.length}/${cs.students.length})</h3>
      <table class="w-full" style="border-collapse:collapse;font-size:.85rem">
        <thead>
          <tr>
            <th scope="col" class="text-left border-b" style="padding:4px 6px">Học viên</th>
            <th scope="col" class="text-left border-b" style="padding:4px 6px">Thiếu</th>
          </tr>
        </thead>
        <tbody>
          ${cs.hasMissing.map(({ student, missing }) => `
            <tr>
              <td class="border-b" style="padding:4px 6px">${displayName(student)}</td>
              <td class="border-b" style="padding:4px 6px;color:var(--color-danger)">${missing.map((c: any) => c.label).join(', ')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `).join('') : '<p class="hint text-center p-5">Tất cả học viên đã đủ điểm.</p>'}
</div>`
    document.body.appendChild(this.overlay)
    this._focusTrap = createFocusTrap(this.overlay)

    this.overlay.querySelector('#missingModalClose')?.addEventListener('click', () => this.close())
    this.overlay.addEventListener('click', (e: Event) => {
      if (e.target === this.overlay) this.close()
    })
  }
}
