import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import './Avatar.ts'

const meta: Meta = {
  title: 'Avatar',
  component: 'gl-avatar',
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl'] },
    name: { control: 'text' },
    src: { control: 'text' },
  },
  args: {
    size: 'md',
    name: 'Nguyễn Văn A',
    src: '',
  },
}

export default meta

export const Initials: StoryObj = {
  render: () => html`<gl-avatar name="Nguyễn Văn A"></gl-avatar>`,
}

export const Sizes: StoryObj = {
  render: () => html`
    <div style="display:flex;align-items:center;gap:12px;">
      <gl-avatar size="sm" name="A"></gl-avatar>
      <gl-avatar size="md" name="B"></gl-avatar>
      <gl-avatar size="lg" name="C"></gl-avatar>
      <gl-avatar size="xl" name="D"></gl-avatar>
    </div>
  `,
}

export const SingleName: StoryObj = {
  render: () => html`<gl-avatar name="Admin"></gl-avatar>`,
}
