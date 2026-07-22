import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import './CommandPalette.ts'

const meta: Meta = {
  title: 'CommandPalette',
  component: 'gl-command-palette',
}

export default meta

const commands = [
  { id: 'go-classes', label: 'Đến lớp học', description: 'Chuyển đến danh sách lớp', icon: '📚' },
  { id: 'go-dashboard', label: 'Tổng quan', description: 'Xem thống kê', icon: '📊' },
  { id: 'add-student', label: 'Thêm học viên', description: 'Thêm học viên mới vào lớp', icon: '➕' },
  { id: 'import-excel', label: 'Nhập từ Excel', description: 'Nhập danh sách từ file Excel', icon: '📄' },
  { id: 'export', label: 'Xuất báo cáo', description: 'In / xuất danh sách', icon: '🖨️' },
  { id: 'settings', label: 'Cài đặt', description: 'Mở trang cài đặt', icon: '⚙️' },
]

export const Default: StoryObj = {
  render: () => html`<gl-command-palette open .commands=${commands}></gl-command-palette>`,
}
