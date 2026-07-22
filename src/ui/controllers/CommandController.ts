import type { ReactiveController, ReactiveControllerHost } from 'lit'
import type { StateManager } from '../StateManager'
import type { AuthManager } from '../../core/auth/AuthManager'
import type { NotificationManager } from '../../services/NotificationManager'

export interface CommandControllerOptions {
  stateManager: StateManager
  authManager: AuthManager
  notificationManager: NotificationManager
  selectClass: (classId: string) => void
  switchView: (view: 'dashboard' | 'class' | 'profile') => void
  openAddStudent: () => void
  importClassScores: () => void
  openBulkExportModal: () => void
  openBackupModal: () => void
  openSettingsModal: () => void
  openParentInvite: () => void
  scrollToStudent: (studentId: string) => void
  changePin: () => Promise<void>
  openReportsModal: () => void
  openMissingScoresModal: () => void
  openUserManagementModal: () => void
  openHelpModal: () => void
  getActiveClassId: () => string | null
  getRootElement: () => HTMLElement | null
}

export class CommandController implements ReactiveController {
  private host: (ReactiveControllerHost & HTMLElement) | null
  private options: CommandControllerOptions

  constructor(host: (ReactiveControllerHost & HTMLElement) | null, options: CommandControllerOptions) {
    this.host = host
    this.options = options
    if (host) host.addController(this)
  }

  hostConnected(): void {}
  hostDisconnected(): void {}

  openCommandPalette(onlyClasses = false): void {
    const root = this.host || this.options.getRootElement()
    const palette = root?.querySelector('#commandPalette') as any
    if (!palette) return

    const commands: any[] = onlyClasses ? [] : this.getStaticPaletteCommands()
    const classes = this.options.stateManager.getVisibleClasses()
    const sortedClasses = [...classes].sort((a, b) => a.name.localeCompare(b.name))

    for (const c of sortedClasses) {
      commands.push({
        id: `select-class-${c.id}`,
        label: `🏫 Đến lớp: ${c.name}`,
        description: `Năm học ${c.year || '—'} · ${c.students.length} học viên`,
        icon: '🏫',
        keywords: ['lop', 'class', c.name],
      })
    }

    if (!onlyClasses) {
      for (const c of sortedClasses) {
        for (const s of c.students) {
          const fullName = [s.tenThanh, s.hoDem, s.ten].filter(Boolean).join(' ') || s.name || ''
          commands.push({
            id: `go-student-${s.id}-${c.id}`,
            label: `👤 Học viên: ${fullName}`,
            description: `Lớp ${c.name} · STT ${c.students.indexOf(s) + 1}`,
            icon: '👤',
            keywords: [fullName, c.name, 'hoc vien', s.ten],
          })
        }
      }
    }

    palette.commands = commands
    palette.open = true
  }

  handleCommand(commandId: string): void {
    const root = this.host || this.options.getRootElement()
    const palette = root?.querySelector('#commandPalette') as any
    if (palette) palette.open = false

    if (commandId.startsWith('select-class-')) {
      const classId = commandId.replace('select-class-', '')
      this.options.selectClass(classId)
      return
    }

    if (commandId.startsWith('go-student-')) {
      const rest = commandId.replace('go-student-', '')
      const clsIdx = rest.indexOf('-cls-')
      let studentId = ''
      let classId = ''
      if (clsIdx !== -1) {
        studentId = rest.slice(0, clsIdx)
        classId = rest.slice(clsIdx + 1)
      } else {
        const lastDash = rest.lastIndexOf('-')
        studentId = rest.slice(0, lastDash)
        classId = rest.slice(lastDash + 1)
      }
      this.options.selectClass(classId)
      setTimeout(() => this.options.scrollToStudent(studentId), 100)
      return
    }

    switch (commandId) {
      case 'go-dashboard':
        this.options.switchView('dashboard')
        break
      case 'add-student':
        if (this.options.getActiveClassId()) this.options.openAddStudent()
        else this.options.notificationManager?.show('Vui lòng chọn một lớp trước', 'warning')
        break
      case 'import-scores':
        this.options.importClassScores()
        break
      case 'bulk-export':
        this.options.openBulkExportModal()
        break
      case 'reports':
        this.options.openReportsModal()
        break
      case 'missing-scores':
        this.options.openMissingScoresModal()
        break
      case 'users':
        this.options.openUserManagementModal()
        break
      case 'backup':
        this.options.openBackupModal()
        break
      case 'settings':
        this.options.openSettingsModal()
        break
      case 'help':
        this.options.openHelpModal()
        break
      case 'cheatsheet':
        this.openCheatsheetModal()
        break
      case 'change-pin':
        this.options.changePin()
        break
    }
  }

  private getStaticPaletteCommands(): any[] {
    return [
      { id: 'go-dashboard', label: '📊 Tổng quan', description: 'Đến tổng quan năm học', icon: '📊', keywords: ['tong quan', 'dashboard', 'home'] },
      { id: 'add-student', label: '➕ Thêm học viên', description: 'Thêm học viên vào lớp đang mở', icon: '➕', keywords: ['them', 'hoc vien', 'new student'] },
      { id: 'import-scores', label: '📥 Nhập điểm (Excel/CSV)', description: 'Nhập danh sách/điểm từ Excel', icon: '📥', keywords: ['nhap', 'excel', 'csv', 'import'] },
      { id: 'bulk-export', label: '📥 Xuất điểm nhiều lớp', description: 'Xuất CSV/Excel cho nhiều lớp', icon: '📥', keywords: ['xuat', 'export', 'bulk'] },
      { id: 'reports', label: '📊 Xem báo cáo nhanh', description: 'Xem tổng kết/thống kê', icon: '📊', keywords: ['bao cao', 'reports'] },
      { id: 'missing-scores', label: '📋 Kiểm tra điểm thiếu', description: 'Tìm học viên chưa đủ cột điểm', icon: '📋', keywords: ['thieu diem', 'missing'] },
      { id: 'users', label: '👤 Quản lý tài khoản', description: 'Danh sách và phân quyền giáo lý viên', icon: '👤', keywords: ['tai khoan', 'users', 'admin'] },
      { id: 'backup', label: '💾 Sao lưu dữ liệu JSON', description: 'Sao lưu hoặc khôi phục dữ liệu', icon: '💾', keywords: ['sao luu', 'backup', 'restore'] },
      { id: 'settings', label: '⚙️ Cài đặt đồng bộ', description: 'Đồng bộ Supabase & Cấu hình', icon: '⚙️', keywords: ['settings', 'cai dat', 'supabase'] },
      { id: 'help', label: 'ℹ️ Hướng dẫn sử dụng', description: 'Xem tài liệu hướng dẫn', icon: 'ℹ️', keywords: ['help', 'huong dan'] },
      { id: 'cheatsheet', label: '⌨️ Danh sách phím tắt', description: 'Xem phím tắt nhanh', icon: '⌨️', keywords: ['shortcuts', 'phim tat'] },
      { id: 'change-pin', label: '🔐 Đổi mã PIN', description: 'Thay đổi mã PIN đăng nhập', icon: '🔐', keywords: ['pin', 'doi pin'] },
    ]
  }

  openCheatsheetModal(): void {
    let modal = document.getElementById('cheatsheetModal') as any
    if (!modal) {
      modal = document.createElement('gl-modal')
      modal.id = 'cheatsheetModal'
      modal.setAttribute('heading', 'Phím tắt hệ thống')
      modal.setAttribute('size', 'sm')
      modal.innerHTML = `
        <div style="padding:10px 0;">
          <table style="width:100%;border-collapse:collapse;font-size:0.9rem;line-height:2;">
            <thead><tr style="border-bottom:2px solid var(--color-border);text-align:left;">
              <th style="padding:6px;font-weight:800;">Phím tắt</th>
              <th style="padding:6px;font-weight:800;">Chức năng</th>
            </tr></thead>
            <tbody>
              <tr style="border-bottom:1px solid var(--color-border);"><td style="padding:6px;"><strong>Ctrl+Z</strong></td><td style="padding:6px;">Hoàn tác (Undo)</td></tr>
              <tr><td style="padding:6px;"><strong>Ctrl+Y / Ctrl+Shift+Z</strong></td><td>Làm lại (Redo)</td></tr>
              <tr><td style="padding:6px;"><strong>Ctrl+K</strong></td><td>Bảng lệnh</td></tr>
              <tr><td style="padding:6px;"><strong>Ctrl+Shift+O</strong></td><td>Tìm nhanh lớp học</td></tr>
              <tr><td style="padding:6px;"><strong>Ctrl+N</strong></td><td>Thêm học viên</td></tr>
              <tr><td style="padding:6px;"><strong>Ctrl+S</strong></td><td>Đồng bộ Cloud</td></tr>
              <tr><td style="padding:6px;"><strong>/</strong></td><td>Tìm kiếm</td></tr>
              <tr><td style="padding:6px;"><strong>Esc</strong></td><td>Đóng modal/drawer</td></tr>
              <tr><td style="padding:6px;"><strong>?</strong></td><td>Phím tắt</td></tr>
            </tbody>
          </table>
        </div>
      `
      document.body.appendChild(modal)
      modal.addEventListener('gl-close', () => { modal.open = false })
    }
    modal.open = true
  }

}

