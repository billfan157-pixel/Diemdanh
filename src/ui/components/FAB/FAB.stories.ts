import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import './FAB.ts'

const meta: Meta = {
  title: 'FAB',
  component: 'gl-fab',
}

export default meta

export const Default: StoryObj = {
  render: () => html`<gl-fab></gl-fab>`,
}

export const Small: StoryObj = {
  render: () => html`<gl-fab small></gl-fab>`,
}

export const CustomIcon: StoryObj = {
  render: () => html`<gl-fab label="Thêm học viên">✏️</gl-fab>`,
}
