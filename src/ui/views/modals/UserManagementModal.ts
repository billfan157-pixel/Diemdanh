import { AuthManager } from '../../../core/auth/AuthManager'
import { NotificationManager } from '../../../services/NotificationManager'

export class UserManagementModal {
  private authManager: AuthManager
  private notificationManager: NotificationManager
  private overlay: HTMLElement | null = null

  constructor(authManager: AuthManager, notificationManager: NotificationManager) {
    this.authManager = authManager
    this.notificationManager = notificationManager
  }

  open(): void {
    if (!this.authManager.isAdmin()) {
      this.notificationManager.show('Chỉ Ban GL mới quản lý tài khoản.', 'error')
      return
    }
    this.render()
  }

  close(): void {
    if (this.overlay) {
      this.overlay.remove()
      this.overlay = null
    }
  }

  private userDisplay(u: { displayName?: string; username?: string }): string {
    return u.displayName || u.username || ''
  }

  private escapeHtml(s: any): string {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
  }

  private render(): void {
    const users = this.authManager.getAllUsers() || []

    this.overlay = document.createElement('div')
    this.overlay.className = 'modal-overlay'
    this.overlay.innerHTML = `
<div class="modal-panel" style="max-width:520px;max-height:80vh;overflow-y:auto">
  <h2>👤 Quản lý tài khoản <button class="modal-close" id="usersModalClose">×</button></h2>
  <button class="btn btn-primary btn-sm" id="createUserBtn" style="margin-bottom:10px">＋ Tạo tài khoản</button>
  <div id="usersList">
    ${users.map(u => `
      <div class="user-row" style="display:flex;justify-content:space-between;align-items:center;padding:8px 6px;border-bottom:1px solid var(--color-border-subtle)">
        <div>
          <strong>${this.escapeHtml(this.userDisplay(u))}</strong>
          <span class="hint" style="font-size:.8rem;margin-left:6px">@${this.escapeHtml(u.username)}</span>
          <span class="badge" style="font-size:.7rem;margin-left:6px;background:${u.role === 'ban_gl' ? 'var(--color-primary)' : 'var(--color-text-muted-2)'}20;color:${u.role === 'ban_gl' ? 'var(--color-primary)' : 'var(--color-text-muted-2)'}">${u.role === 'ban_gl' ? 'Ban GL' : 'GLV'}</span>
          ${!u.active ? '<span class="badge" style="font-size:.7rem;margin-left:6px;background:var(--color-danger)20;color:var(--color-danger)">Vô hiệu</span>' : ''}
        </div>
        <div style="display:flex;gap:4px">
          <button type="button" class="btn btn-ghost btn-sm user-edit-btn" data-id="${u.id}">✏️</button>
          <button type="button" class="btn btn-ghost btn-sm user-del-btn" data-id="${u.id}" data-name="${this.escapeHtml(this.userDisplay(u))}">🗑️</button>
        </div>
      </div>
    `).join('')}
  </div>
</div>`
    document.body.appendChild(this.overlay)

    this.overlay.querySelector('#usersModalClose')?.addEventListener('click', () => this.close())
    this.overlay.querySelector('#createUserBtn')?.addEventListener('click', () => this.showCreateForm())
    this.overlay.addEventListener('click', (e: Event) => {
      if (e.target === this.overlay) this.close()
    })
    this.overlay.querySelectorAll('.user-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e: Event) => {
        const id = (e.currentTarget as HTMLElement).dataset.id!
        this.showEditForm(id)
      })
    })
    this.overlay.querySelectorAll('.user-del-btn').forEach(btn => {
      btn.addEventListener('click', (e: Event) => {
        const el = e.currentTarget as HTMLElement
        const id = el.dataset.id!
        const name = el.dataset.name!
        this.deleteUser(id, name)
      })
    })
  }

  private showCreateForm(): void {
    const body = this.overlay!.querySelector('#usersList')!
    body.innerHTML = `
<div style="padding:12px;background:var(--color-bg-subtle);border-radius:8px">
  <h3 style="font-size:.95rem;margin-bottom:8px">Tạo tài khoản mới</h3>
  <div style="display:grid;gap:8px">
    <input type="text" id="userFormUsername" placeholder="Tên đăng nhập" autocomplete="off" />
    <input type="text" id="userFormDisplay" placeholder="Tên hiển thị" autocomplete="off" />
    <input type="password" id="userFormPin" placeholder="PIN (ít nhất 4 số)" inputmode="numeric" autocomplete="new-password" />
    <select id="userFormRole">
      <option value="glv">Giáo lý viên (GLV)</option>
      <option value="ban_gl">Ban Giáo lý (Admin)</option>
    </select>
    <div style="display:flex;gap:8px">
      <button class="btn btn-secondary" id="userFormCancel">Hủy</button>
      <button class="btn btn-primary" id="userFormSave">💾 Lưu</button>
    </div>
  </div>
</div>`
    body.querySelector('#userFormCancel')?.addEventListener('click', () => this.render())
    body.querySelector('#userFormSave')?.addEventListener('click', () => this.saveNewUser())
  }

  private showEditForm(userId: string): void {
    const users = this.authManager.getAllUsers()
    const u = users.find(x => x.id === userId)
    if (!u) return

    const body = this.overlay!.querySelector('#usersList')!
    body.innerHTML = `
<div style="padding:12px;background:var(--color-bg-subtle);border-radius:8px">
  <h3 style="font-size:.95rem;margin-bottom:8px">Sửa tài khoản: ${this.escapeHtml(this.userDisplay(u))}</h3>
  <div style="display:grid;gap:8px">
    <input type="text" id="userFormDisplay" value="${this.escapeHtml(u.displayName)}" placeholder="Tên hiển thị" />
    <input type="password" id="userFormPin" placeholder="PIN mới (để trống nếu không đổi)" inputmode="numeric" autocomplete="new-password" />
    <select id="userFormRole">
      <option value="glv" ${u.role === 'glv' ? 'selected' : ''}>Giáo lý viên (GLV)</option>
      <option value="ban_gl" ${u.role === 'ban_gl' ? 'selected' : ''}>Ban Giáo lý (Admin)</option>
    </select>
    <label style="display:flex;align-items:center;gap:6px;font-size:.85rem">
      <input type="checkbox" id="userFormActive" ${u.active !== false ? 'checked' : ''} /> Đang hoạt động
    </label>
    <div style="display:flex;gap:8px">
      <button class="btn btn-secondary" id="userFormCancel">Hủy</button>
      <button class="btn btn-primary" id="userFormSave">💾 Lưu</button>
    </div>
  </div>
</div>`
    body.querySelector('#userFormCancel')?.addEventListener('click', () => this.render())
    body.querySelector('#userFormSave')?.addEventListener('click', () => this.saveEditUser(userId))
  }

  private async saveNewUser(): Promise<void> {
    const username = (this.overlay!.querySelector('#userFormUsername') as HTMLInputElement).value.trim()
    const display = (this.overlay!.querySelector('#userFormDisplay') as HTMLInputElement).value.trim()
    const pin = (this.overlay!.querySelector('#userFormPin') as HTMLInputElement).value
    const role = (this.overlay!.querySelector('#userFormRole') as HTMLSelectElement).value as 'ban_gl' | 'glv'

    if (!username) { this.notificationManager.show('Nhập tên đăng nhập.', 'warning'); return }
    if (!pin || pin.length < 4) { this.notificationManager.show('PIN tối thiểu 4 ký tự.', 'warning'); return }

    const result = await this.authManager.createUser({ username, displayName: display || username, role, pin })
    if (result.ok) {
      this.notificationManager.show('Đã tạo tài khoản.', 'success')
      this.render()
    } else {
      this.notificationManager.show(result.error || 'Lỗi tạo tài khoản.', 'error')
    }
  }

  private async saveEditUser(userId: string): Promise<void> {
    const display = (this.overlay!.querySelector('#userFormDisplay') as HTMLInputElement).value.trim()
    const pin = (this.overlay!.querySelector('#userFormPin') as HTMLInputElement).value
    const role = (this.overlay!.querySelector('#userFormRole') as HTMLSelectElement).value as 'ban_gl' | 'glv'
    const active = (this.overlay!.querySelector('#userFormActive') as HTMLInputElement).checked

    const updates: any = { displayName: display, role, active }
    if (pin) updates.pin = pin

    const result = await this.authManager.updateUser(userId, updates)
    if (result.ok) {
      this.notificationManager.show('Đã cập nhật tài khoản.', 'success')
      this.render()
    } else {
      this.notificationManager.show(result.error || 'Lỗi cập nhật.', 'error')
    }
  }

  private async deleteUser(userId: string, name: string): Promise<void> {
    const confirmed = await this.notificationManager.confirm(`Xóa tài khoản "${name}"?`)
    if (!confirmed) return
    const result = await this.authManager.deleteUser(userId)
    if (result.ok) {
      this.notificationManager.show('Đã xóa tài khoản.', 'success')
      this.render()
    } else {
      this.notificationManager.show(result.error || 'Lỗi xóa.', 'error')
    }
  }
}
