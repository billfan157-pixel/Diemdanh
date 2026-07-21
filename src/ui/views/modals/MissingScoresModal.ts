import { StateManager } from '../../StateManager'
import { resolveClassColumns } from '../../../config/columns.ts'
import { displayName, termLabel, studentMissingCols } from '../../../core/legacyCompat.ts'

export class MissingScoresModal {
  private stateManager: StateManager
  private overlay: HTMLElement | null = null

  constructor(stateManager: StateManager, _notificationManager: any) {
    this.stateManager = stateManager
  }

  open(): void {
    this.render()
  }

  close(): void {
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
    this.overlay.innerHTML = `
<div class="modal-panel" style="max-width:600px;max-height:80vh;overflow-y:auto">
  <h2>📋 Học viên thiếu điểm <button class="modal-close" id="missingModalClose">×</button></h2>
  <p class="hint" style="margin-bottom:12px">Học kỳ: ${termLabel(term)}</p>
  ${classStats.length ? classStats.map(cs => `
    <div style="margin-bottom:16px">
      <h3 style="font-size:.95rem;margin-bottom:6px">${cs.cls.name} (${cs.hasMissing.length}/${cs.students.length})</h3>
      <table style="width:100%;border-collapse:collapse;font-size:.85rem">
        <thead>
          <tr>
            <th style="text-align:left;padding:4px 6px;border-bottom:1px solid var(--color-border)">Học viên</th>
            <th style="text-align:left;padding:4px 6px;border-bottom:1px solid var(--color-border)">Thiếu</th>
          </tr>
        </thead>
        <tbody>
          ${cs.hasMissing.map(({ student, missing }) => `
            <tr>
              <td style="padding:4px 6px;border-bottom:1px solid var(--color-border-subtle)">${displayName(student)}</td>
              <td style="padding:4px 6px;border-bottom:1px solid var(--color-border-subtle);color:var(--color-danger)">${missing.map((c: any) => c.label).join(', ')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `).join('') : '<p class="hint" style="text-align:center;padding:20px">Tất cả học viên đã đủ điểm.</p>'}
</div>`
    document.body.appendChild(this.overlay)

    this.overlay.querySelector('#missingModalClose')?.addEventListener('click', () => this.close())
    this.overlay.addEventListener('click', (e: Event) => {
      if (e.target === this.overlay) this.close()
    })
  }
}
