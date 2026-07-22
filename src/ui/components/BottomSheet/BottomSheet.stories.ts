import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import './BottomSheet.ts'

const meta: Meta = {
  title: 'BottomSheet',
  component: 'gl-bottom-sheet',
  argTypes: {
    open: { control: 'boolean' },
    heading: { control: 'text' },
  },
  args: {
    open: true,
    heading: 'Chọn thao tác',
  },
}

export default meta

export const Default: StoryObj = {
  render: (args: Record<string, unknown>) => html`
    <gl-bottom-sheet .open=${args.open as boolean} .heading=${args.heading as string}>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <button style="padding:12px;border:1px solid var(--color-border);border-radius:8px;background:none;cursor:pointer;">Sửa thông tin</button>
        <button style="padding:12px;border:1px solid var(--color-border);border-radius:8px;background:none;cursor:pointer;">Xem chi tiết</button>
        <button style="padding:12px;border:1px solid var(--color-danger);border-radius:8px;background:none;cursor:pointer;color:var(--color-danger);">Xóa</button>
      </div>
    </gl-bottom-sheet>
  `,
}
