import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import './Skeleton.ts'

const meta: Meta = {
  title: 'Skeleton',
  component: 'gl-skeleton',
  argTypes: {
    variant: { control: 'select', options: ['text', 'title', 'avatar', 'card', 'button'] },
    width: { control: 'text' },
    height: { control: 'text' },
  },
  args: {
    variant: 'text',
    width: '',
    height: '',
  },
}

export default meta

export const Text: StoryObj = {
  render: () => html`<gl-skeleton variant="text"></gl-skeleton>`,
}

export const Title: StoryObj = {
  render: () => html`<gl-skeleton variant="title"></gl-skeleton>`,
}

export const Avatar: StoryObj = {
  render: () => html`<gl-skeleton variant="avatar"></gl-skeleton>`,
}

export const Card: StoryObj = {
  render: () => html`<gl-skeleton variant="card"></gl-skeleton>`,
}

export const Button: StoryObj = {
  render: () => html`<gl-skeleton variant="button"></gl-skeleton>`,
}

export const CustomSize: StoryObj = {
  render: () => html`<gl-skeleton variant="text" width="80%" height="20px"></gl-skeleton>`,
}

export const Composition: StoryObj = {
  render: () => html`
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <gl-skeleton variant="avatar"></gl-skeleton>
        <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
          <gl-skeleton variant="title"></gl-skeleton>
          <gl-skeleton variant="text"></gl-skeleton>
          <gl-skeleton variant="text" width="60%"></gl-skeleton>
        </div>
      </div>
      <gl-skeleton variant="card"></gl-skeleton>
      <div style="display:flex;gap:8px;">
        <gl-skeleton variant="button"></gl-skeleton>
        <gl-skeleton variant="button"></gl-skeleton>
      </div>
    </div>
  `,
}
