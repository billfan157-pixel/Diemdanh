import { AuthManager } from '../../../core/auth/AuthManager'
import { NotificationManager } from '../../../services/NotificationManager'

export class UserManagementModal {
  private authManager: AuthManager
  private notificationManager: NotificationManager
  private element: HTMLElement | null = null

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
    const modal = this.element as any
    if (modal) { modal.open = false }
  }

  private userDisplay(u: { displayName?: string; username?: string }): string {
    return u.displayName || u.username || ''
  }

  private escapeHtml(s: any): string {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
  }

  private render(): void {
    const users = this.authManager.getAllUsers() || []

    this.ensureModal()
    const body = this.element?.querySelector('#usersList')
    if (!body) return

    body.innerHTML = `
      <gl-button variant="primary" size="sm" id="createUserBtn" style="margin-bottom:10px">＋ Tạo tài khoản</gl-button>
      ${users.map(u => `
        <div class="user-row d-flex justify-between items-center py-2 px-2 border-b">
          <div>
            <strong>${this.escapeHtml(this.userDisplay(u))}</strong>
            <span class="hint ml-2" style="font-size:.8rem">@${this.escapeHtml(u.username)}</span>
            <span class="badge" style="font-size:.7rem;margin-left:6px;background:${u.role === 'ban_gl' ? 'var(--color-primary)' : 'var(--color-text-muted-2)'}20;color:${u.role === 'ban_gl' ? 'var(--color-primary)' : 'var(--color-text-muted-2)'}">${u.role === 'ban_gl' ? 'Ban GL' : 'GLV'}</span>
            ${!u.active ? '<span class="badge ml-2 text-danger" style="font-size:.7rem;background:var(--color-danger)20">Vô hiệu</span>' : ''}
          </div>
          <div class="d-flex" style="gap:4px">
            <gl-button variant="ghost" size="sm" class="user-edit-btn" data-id="${u.id}" aria-label="Sửa người dùng">✏️</gl-button>
            <gl-button variant="ghost" size="sm" class="user-del-btn" data-id="${u.id}" data-name="${this.escapeHtml(this.userDisplay(u))}" aria-label="Xóa người dùng">🗑️</gl-button>
          </div>
        </div>
      `).join('')}
    `

    body.querySelector('#createUserBtn')?.addEventListener('click', () => this.showCreateForm())
    body.querySelectorAll('.user-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e: Event) => {
        const id = (e.currentTarget as HTMLElement).dataset.id!
        this.showEditForm(id)
      })
    })
    body.querySelectorAll('.user-del-btn').forEach(btn => {
      btn.addEventListener('click', (e: Event) => {
        const el = e.currentTarget as HTMLElement
        const id = el.dataset.id!
        const name = el.dataset.name!
        this.deleteUser(id, name)
      })
    })
  }

  private ensureModal(): void {
    let modal = document.getElementById('usersModal')
    if (!modal) {
      modal = document.createElement('gl-modal')
      modal.id = 'usersModal'
      modal.setAttribute('heading', '👤 Quản lý tài khoản')
      modal.setAttribute('size', 'md')

      modal.innerHTML = `<div id="usersList"></div>`
      document.body.appendChild(modal)
      modal.addEventListener('gl-close', () => this.close())
    }
    this.element = modal
    const modalEl = this.element as any
    modalEl.open = true
  }

  private showCreateForm(): void {
    const body = this.element!.querySelector('#usersList')!
    body.innerHTML = `
      <div class="p-3 rounded-lg" style="background:var(--color-bg-subtle)">
        <h3 style="font-size:.95rem" class="mb-2">Tạo tài khoản mới</h3>
        <div class="grid gap-2">
          <input type="text" id="userFormUsername" placeholder="Tên đăng nhập" autocomplete="off" aria-label="Tên đăng nhập" />
          <input type="text" id="userFormDisplay" placeholder="Tên hiển thị" autocomplete="off" aria-label="Tên hiển thị" />
          <input type="password" id="userFormPin" placeholder="PIN (ít nhất 4 số)" inputmode="numeric" autocomplete="new-password" aria-label="Mã PIN" />
          <select id="userFormRole">
            <option value="glv">Giáo lý viên (GLV)</option>
            <option value="ban_gl">Ban Giáo lý (Admin)</option>
          </select>
          <div class="d-flex gap-2">
            <gl-button variant="ghost" id="userFormCancel">Hủy</gl-button>
            <gl-button variant="primary" id="userFormSave">💾 Lưu</gl-button>
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

    const body = this.element!.querySelector('#usersList')!
    body.innerHTML = `
      <div class="p-3 rounded-lg" style="background:var(--color-bg-subtle)">
        <h3 style="font-size:.95rem" class="mb-2">Sửa tài khoản: ${this.escapeHtml(this.userDisplay(u))}</h3>
        <div class="grid gap-2">
          <input type="text" id="userFormDisplay" value="${this.escapeHtml(u.displayName)}" placeholder="Tên hiển thị" aria-label="Tên hiển thị" />
          <input type="password" id="userFormPin" placeholder="PIN mới (để trống nếu không đổi)" inputmode="numeric" autocomplete="new-password" aria-label="Mã PIN" />
          <select id="userFormRole">
            <option value="glv" ${u.role === 'glv' ? 'selected' : ''}>Giáo lý viên (GLV)</option>
            <option value="ban_gl" ${u.role === 'ban_gl' ? 'selected' : ''}>Ban Giáo lý (Admin)</option>
          </select>
          <label class="d-flex items-center" style="gap:6px;font-size:.85rem">
            <input type="checkbox" id="userFormActive" ${u.active !== false ? 'checked' : ''} /> Đang hoạt động
          </label>
          <div class="d-flex gap-2">
            <gl-button variant="ghost" id="userFormCancel">Hủy</gl-button>
            <gl-button variant="primary" id="userFormSave">💾 Lưu</gl-button>
          </div>
        </div>
      </div>`
    body.querySelector('#userFormCancel')?.addEventListener('click', () => this.render())
    body.querySelector('#userFormSave')?.addEventListener('click', () => this.saveEditUser(userId))
  }

  private async saveNewUser(): Promise<void> {
    const username = (this.element!.querySelector('#userFormUsername') as HTMLInputElement).value.trim()
    const display = (this.element!.querySelector('#userFormDisplay') as HTMLInputElement).value.trim()
    const pin = (this.element!.querySelector('#userFormPin') as HTMLInputElement).value
    const role = (this.element!.querySelector('#userFormRole') as HTMLSelectElement).value as 'ban_gl' | 'glv'

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
    const display = (this.element!.querySelector('#userFormDisplay') as HTMLInputElement).value.trim()
    const pin = (this.element!.querySelector('#userFormPin') as HTMLInputElement).value
    const role = (this.element!.querySelector('#userFormRole') as HTMLSelectElement).value as 'ban_gl' | 'glv'
    const active = (this.element!.querySelector('#userFormActive') as HTMLInputElement).checked

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
