import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import './Chip.ts'

const meta: Meta = {
  title: 'Chip',
  component: 'gl-chip',
  argTypes: {
    color: { control: 'select', options: ['default', 'primary', 'success', 'danger', 'warn'] },
    removable: { control: 'boolean' },
  },
  args: {
    color: 'default',
    removable: false,
  },
}

export default meta

export const Default: StoryObj = {
  render: () => html`<gl-chip color="primary">Giỏi</gl-chip>`,
}

export const AllColors: StoryObj = {
  render: () => html`
    <div style="display:flex;flex-wrap:wrap;gap:6px;">
      <gl-chip color="default">Default</gl-chip>
      <gl-chip color="primary">Primary</gl-chip>
      <gl-chip color="success">Success</gl-chip>
      <gl-chip color="danger">Danger</gl-chip>
      <gl-chip color="warn">Warn</gl-chip>
    </div>
  `,
}

export const Removable: StoryObj = {
  render: () => html`<gl-chip color="primary" removable>Lọc: Giỏi</gl-chip>`,
}
