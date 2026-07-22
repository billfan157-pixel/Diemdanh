import { StateManager } from '../../StateManager'
import { NotificationManager } from '../../../services/NotificationManager'
import { type StudentData, type LearningLogEntry } from '../../../services/storage/StorageAdapter.types'
import { LOG_TYPES, LOG_LEVELS } from '../../../config/constants.ts'
import { displayName, formatLogDate } from '../../../core/legacyCompat.ts'

export class JournalLogModal {
  private stateManager: StateManager
  private notificationManager: NotificationManager
  private authManager: { getCurrentUserId: () => string | null; getCurrentUser: () => { displayName?: string; username?: string } | null }
  private element: HTMLElement | null = null
  private student: StudentData | null = null
  private classId: string = ''

  constructor(
    stateManager: StateManager,
    notificationManager: NotificationManager,
    authManager: { getCurrentUserId: () => string | null; getCurrentUser: () => { displayName?: string; username?: string } | null }
  ) {
    this.stateManager = stateManager
    this.notificationManager = notificationManager
    this.authManager = authManager
  }

  open(student: StudentData, classId: string, _className?: string): void {
    this.student = student
    this.classId = classId
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
    let modal = document.getElementById('journalLogModal')
    if (!modal) {
      modal = document.createElement('gl-modal')
      modal.id = 'journalLogModal'
      modal.setAttribute('heading', '📓 Nhật ký học vụ')
      modal.setAttribute('size', 'md')

      modal.innerHTML = `
        <div id="journalLogBody"></div>
        <gl-button slot="footer" variant="ghost" id="journalModalClose">Đóng</gl-button>
      `
      document.body.appendChild(modal)
      modal.addEventListener('gl-close', () => this.close())
      modal.querySelector('#journalModalClose')?.addEventListener('click', () => this.close())
      modal.querySelector('#journalLogSaveBtn')?.addEventListener('click', () => this.saveEntry())
    }
    this.element = modal
  }

  private renderContent(): void {
    const st = this.student
    if (!st) return
    const logs = (st.learningLog || []).slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const body = this.element?.querySelector('#journalLogBody')
    if (!body) return
    body.innerHTML = `
      <p class="hint mb-3">${displayName(st)}</p>
      <div class="mb-4 p-3 rounded-lg" style="background:var(--color-bg-subtle)">
        <div class="grid gap-2">
          <select id="journalLogType" class="w-full">
            ${LOG_TYPES.map(t => `<option value="${t.key}">${t.label}</option>`).join('')}
          </select>
          <select id="journalLogLevel" class="w-full">
            ${LOG_LEVELS.map(l => `<option value="${l.key}">${l.label}</option>`).join('')}
          </select>
          <textarea id="journalLogText" rows="2" placeholder="Nội dung nhật ký..." class="w-full" style="resize:vertical" aria-label="Nội dung nhật ký"></textarea>
          <gl-button variant="primary" id="journalLogSaveBtn">💾 Lưu nhật ký</gl-button>
        </div>
      </div>
      <div id="journalLogList">
        ${logs.length ? logs.map(log => this.renderLogEntry(log)).join('') : '<p class="hint text-center p-3">Chưa có nhật ký.</p>'}
      </div>
    `

    body.querySelectorAll('.journal-del-btn').forEach(btn => {
      btn.addEventListener('click', (e: Event) => {
        const id = (e.currentTarget as HTMLElement).dataset.id
        if (id) this.deleteEntry(id)
      })
    })
  }

  private renderLogEntry(log: LearningLogEntry): string {
    const typeMeta = LOG_TYPES.find(t => t.key === log.type)
    const levelMeta = LOG_LEVELS.find(l => l.key === log.level)
    return `
<div class="journal-entry px-3 py-2 border rounded-md" style="margin-bottom:6px">
  <div class="d-flex justify-between items-start">
    <div>
      <span style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:.75rem;background:${typeMeta?.color || '#64748b'}20;color:${typeMeta?.color || '#64748b'}">${typeMeta?.label || log.type}</span>
      <span style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:.75rem;margin-left:4px;background:${levelMeta?.color || '#64748b'}20;color:${levelMeta?.color || '#64748b'}">${levelMeta?.label || log.level}</span>
      <span class="hint text-xs ml-2">${formatLogDate(log.date)}</span>
    </div>
    <button type="button" class="btn btn-ghost btn-sm journal-del-btn" data-id="${log.id}" aria-label="Xóa" style="color:var(--color-danger)">✕</button>
  </div>
  <p class="mt-1 text-sm">${this.escapeHtml(log.text || '')}</p>
  <p class="hint" style="margin:2px 0 0;font-size:.7rem">${log.byName || ''}</p>
</div>`
  }

  private async saveEntry(): Promise<void> {
    if (!this.student || !this.element) return
    const type = (this.element.querySelector('#journalLogType') as HTMLSelectElement).value
    const level = (this.element.querySelector('#journalLogLevel') as HTMLSelectElement).value
    const text = (this.element.querySelector('#journalLogText') as HTMLTextAreaElement).value.trim()
    if (!text) {
      this.notificationManager.show('Nhập nội dung nhật ký.', 'warning')
      return
    }

    const user = this.authManager.getCurrentUser()
    this.stateManager.addLogEntry(this.classId, this.student.id, {
      type,
      level,
      text,
      byUserId: this.authManager.getCurrentUserId() || '',
      byName: user?.displayName || user?.username || '',
    })
    this.notificationManager.show('Đã lưu nhật ký.', 'success')
    ;(this.element.querySelector('#journalLogText') as HTMLTextAreaElement).value = ''
    this.renderList()
  }

  private async deleteEntry(id: string): Promise<void> {
    if (!this.student) return
    this.stateManager.deleteLogEntry(this.classId, this.student.id, id)
    this.renderList()
  }

  private renderList(): void {
    if (!this.student || !this.element) return
    const st = this.student
    const logs = (st.learningLog || []).slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    const listEl = this.element.querySelector('#journalLogList')
    if (!listEl) return
    listEl.innerHTML = logs.length
      ? logs.map(log => this.renderLogEntry(log)).join('')
      : '<p class="hint text-center p-3">Chưa có nhật ký.</p>'

    listEl.querySelectorAll('.journal-del-btn').forEach(btn => {
      btn.addEventListener('click', (e: Event) => {
        const id = (e.currentTarget as HTMLElement).dataset.id
        if (id) this.deleteEntry(id)
      })
    })
  }

  private escapeHtml(s: any): string {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
  }
}
