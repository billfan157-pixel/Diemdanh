import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import './Badge.ts'

const meta: Meta = {
  title: 'Badge',
  component: 'gl-badge',
  argTypes: {
    color: { control: 'select', options: ['primary', 'success', 'danger', 'warn', 'gold', 'neutral'] },
    small: { control: 'boolean' },
  },
  args: {
    color: 'primary',
    small: false,
  },
}

export default meta

export const Default: StoryObj = {
  render: () => html`<gl-badge color="primary">Mới</gl-badge>`,
}

export const AllColors: StoryObj = {
  render: () => html`
    <div style="display:flex;flex-wrap:wrap;gap:8px;">
      <gl-badge color="primary">Primary</gl-badge>
      <gl-badge color="success">Success</gl-badge>
      <gl-badge color="danger">Danger</gl-badge>
      <gl-badge color="warn">Warn</gl-badge>
      <gl-badge color="gold">Gold</gl-badge>
      <gl-badge color="neutral">Neutral</gl-badge>
    </div>
  `,
}

export const Small: StoryObj = {
  render: () => html`<gl-badge color="danger" small>3</gl-badge>`,
}
