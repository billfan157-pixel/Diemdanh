import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import './Sidebar.ts'

const meta: Meta = {
  title: 'Sidebar',
  component: 'gl-sidebar',
}

export default meta

const items = [
  { id: '__section', label: 'Điều hướng', icon: '' },
  { id: 'dashboard', label: 'Tổng quan', icon: '📊' },
  { id: 'classes', label: 'Lớp học', icon: '📚', badge: 3 },
  { id: 'reports', label: 'Báo cáo', icon: '📋' },
  { id: '__section', label: 'Cá nhân', icon: '' },
  { id: 'profile', label: 'Hồ sơ', icon: '👤' },
  { id: 'settings', label: 'Cài đặt', icon: '⚙️' },
]

export const Default: StoryObj = {
  render: () => html`<gl-sidebar header="Sổ Điểm GL" .items=${items} activeId="classes"></gl-sidebar>`,
}
