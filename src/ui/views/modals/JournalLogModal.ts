import { StateManager } from '../../StateManager'
import { NotificationManager } from '../../../services/NotificationManager'
import { type StudentData, type LearningLogEntry } from '../../../services/storage/StorageAdapter.types'
import { LOG_TYPES, LOG_LEVELS } from '../../../config/constants.ts'
import { displayName, formatLogDate } from '../../../core/legacyCompat.ts'

export class JournalLogModal {
  private stateManager: StateManager
  private notificationManager: NotificationManager
  private authManager: { getCurrentUserId: () => string | null; getCurrentUser: () => { displayName?: string; username?: string } | null }
  private overlay: HTMLElement | null = null
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
    this.render()
  }

  close(): void {
    if (this.overlay) {
      this.overlay.remove()
      this.overlay = null
    }
  }

  private render(): void {
    const st = this.student
    if (!st) return
    const logs = (st.learningLog || []).slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    this.overlay = document.createElement('div')
    this.overlay.className = 'modal-overlay'
    this.overlay.innerHTML = `
<div class="modal-panel" style="max-width:520px">
  <h2>📓 Nhật ký học vụ <button class="modal-close" id="journalModalClose">×</button></h2>
  <p class="hint" style="margin-bottom:12px">${displayName(st)}</p>

  <div style="margin-bottom:16px;padding:12px;background:var(--color-bg-subtle);border-radius:8px">
    <div style="display:grid;gap:8px">
      <select id="journalLogType" style="width:100%">
        ${LOG_TYPES.map(t => `<option value="${t.key}">${t.label}</option>`).join('')}
      </select>
      <select id="journalLogLevel" style="width:100%">
        ${LOG_LEVELS.map(l => `<option value="${l.key}">${l.label}</option>`).join('')}
      </select>
      <textarea id="journalLogText" rows="2" placeholder="Nội dung nhật ký..." style="width:100%;resize:vertical"></textarea>
      <button class="btn btn-primary" id="journalLogSaveBtn">💾 Lưu nhật ký</button>
    </div>
  </div>

  <div id="journalLogList">
    ${logs.length ? logs.map(log => this.renderLogEntry(log)).join('') : '<p class="hint" style="text-align:center;padding:12px">Chưa có nhật ký.</p>'}
  </div>
</div>`
    document.body.appendChild(this.overlay)

    this.overlay.querySelector('#journalModalClose')?.addEventListener('click', () => this.close())
    this.overlay.querySelector('#journalLogSaveBtn')?.addEventListener('click', () => this.saveEntry())
    this.overlay.addEventListener('click', (e: Event) => {
      if (e.target === this.overlay) this.close()
    })
    this.overlay.querySelectorAll('.journal-del-btn').forEach(btn => {
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
<div class="journal-entry" style="padding:8px 12px;margin-bottom:6px;border:1px solid var(--color-border);border-radius:6px">
  <div style="display:flex;justify-content:space-between;align-items:start">
    <div>
      <span style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:.75rem;background:${typeMeta?.color || '#64748b'}20;color:${typeMeta?.color || '#64748b'}">${typeMeta?.label || log.type}</span>
      <span style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:.75rem;margin-left:4px;background:${levelMeta?.color || '#64748b'}20;color:${levelMeta?.color || '#64748b'}">${levelMeta?.label || log.level}</span>
      <span class="hint" style="font-size:.75rem;margin-left:8px">${formatLogDate(log.date)}</span>
    </div>
    <button type="button" class="btn btn-ghost btn-sm journal-del-btn" data-id="${log.id}" style="color:var(--color-danger)">✕</button>
  </div>
  <p style="margin:4px 0 0;font-size:.85rem">${this.escapeHtml(log.text || '')}</p>
  <p class="hint" style="margin:2px 0 0;font-size:.7rem">${log.byName || ''}</p>
</div>`
  }

  private async saveEntry(): Promise<void> {
    if (!this.student) return
    const type = (this.overlay!.querySelector('#journalLogType') as HTMLSelectElement).value
    const level = (this.overlay!.querySelector('#journalLogLevel') as HTMLSelectElement).value
    const text = (this.overlay!.querySelector('#journalLogText') as HTMLTextAreaElement).value.trim()
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
    ;(this.overlay!.querySelector('#journalLogText') as HTMLTextAreaElement).value = ''
    this.renderList()
  }

  private async deleteEntry(id: string): Promise<void> {
    if (!this.student) return
    this.stateManager.deleteLogEntry(this.classId, this.student.id, id)
    this.renderList()
  }

  private renderList(): void {
    if (!this.student || !this.overlay) return
    const st = this.student
    const logs = (st.learningLog || []).slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    const listEl = this.overlay.querySelector('#journalLogList')
    if (!listEl) return
    listEl.innerHTML = logs.length
      ? logs.map(log => this.renderLogEntry(log)).join('')
      : '<p class="hint" style="text-align:center;padding:12px">Chưa có nhật ký.</p>'

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
