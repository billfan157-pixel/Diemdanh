import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import './BottomNav.ts'

const meta: Meta = {
  title: 'BottomNav',
  component: 'gl-bottom-nav',
}

export default meta

const tabs = [
  { id: 'dashboard', label: 'Tổng quan', icon: '📊' },
  { id: 'classes', label: 'Lớp', icon: '📚' },
  { id: 'profile', label: 'Cá nhân', icon: '👤' },
]

export const Default: StoryObj = {
  render: () => html`<gl-bottom-nav .tabs=${tabs} activeTab="classes"></gl-bottom-nav>`,
}

export const WithBadge: StoryObj = {
  render: () => html`
    <gl-bottom-nav .tabs=${[
      { id: 'a', label: 'Trang chủ', icon: '🏠' },
      { id: 'b', label: 'Thông báo', icon: '🔔', badge: 5 },
      { id: 'c', label: 'Cá nhân', icon: '👤' },
    ]} activeTab="a"></gl-bottom-nav>
  `,
}
