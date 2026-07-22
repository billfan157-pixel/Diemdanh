import { StateManager } from '../../StateManager'
import { resolveClassColumns } from '../../../config/columns.ts'
import { displayName, termLabel, studentMissingCols } from '../../../core/legacyCompat.ts'

export class MissingScoresModal {
  private stateManager: StateManager
  private element: HTMLElement | null = null

  constructor(stateManager: StateManager, _notificationManager: any) {
    this.stateManager = stateManager
  }

  open(): void {
    this.ensureModal()
    this.renderContent()
    const modal = this.element as any
    if (modal) { modal.open = true }
  }

  close(): void {
    const modal = this.element as any
    if (modal) { modal.open = false }
  }

  private ensureModal(): void {
    let modal = document.getElementById('missingScoresModal')
    if (!modal) {
      modal = document.createElement('gl-modal')
      modal.id = 'missingScoresModal'
      modal.setAttribute('heading', '📋 Học viên thiếu điểm')
      modal.setAttribute('size', 'md')

      modal.innerHTML = `
        <div id="missingScoresBody"></div>
        <gl-button slot="footer" variant="ghost" id="missingModalClose">Đóng</gl-button>
      `
      document.body.appendChild(modal)
      modal.addEventListener('gl-close', () => this.close())
      modal.querySelector('#missingModalClose')?.addEventListener('click', () => this.close())
    }
    this.element = modal
  }

  private renderContent(): void {
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

    const body = this.element?.querySelector('#missingScoresBody')
    if (!body) return
    body.innerHTML = `
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
    `
  }
}
