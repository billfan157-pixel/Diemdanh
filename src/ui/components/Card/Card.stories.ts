import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import './Card.ts'

const meta: Meta = {
  title: 'Card',
  component: 'gl-card',
  argTypes: {
    clickable: { control: 'boolean' },
    padding: { control: 'text' },
  },
  args: {
    clickable: false,
    padding: '',
  },
}

export default meta

export const Default: StoryObj = {
  render: () => html`
    <gl-card>
      <div>Nội dung thẻ</div>
    </gl-card>
  `,
}

export const WithHeader: StoryObj = {
  render: () => html`
    <gl-card>
      <div slot="header">
        <h3 style="margin:0;">Tiêu đề</h3>
        <gl-badge color="primary">Mới</gl-badge>
      </div>
      <p style="margin:0;color:var(--color-text-secondary);">Nội dung mô tả bên trong thẻ.</p>
    </gl-card>
  `,
}

export const Clickable: StoryObj = {
  render: () => html`
    <gl-card clickable>
      <div>Bấm vào thẻ này</div>
    </gl-card>
  `,
}
