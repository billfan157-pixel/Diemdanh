import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import './Dropdown.ts'

const meta: Meta = {
  title: 'Dropdown',
  component: 'gl-dropdown',
}

export default meta

const items = [
  { id: 'edit', label: 'Sửa thông tin', icon: '✏️' },
  { id: 'duplicate', label: 'Nhân bản', icon: '📋' },
  { id: '', label: '', divider: true },
  { id: 'delete', label: 'Xóa', icon: '🗑️', danger: true },
]

export const Default: StoryObj = {
  render: () => html`
    <gl-dropdown .items=${items}>
      <button style="padding:8px 16px;border:1px solid var(--color-border);border-radius:6px;background:none;cursor:pointer;">
        Actions ▾
      </button>
    </gl-dropdown>
  `,
}
