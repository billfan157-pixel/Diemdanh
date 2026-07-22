import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import './Button.ts'

type Args = {
  variant: string
  size: string
  disabled: boolean
  block: boolean
  icon: boolean
  slot: string
}

const meta: Meta<Args> = {
  title: 'Button',
  component: 'gl-button',
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger', 'success'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    disabled: { control: 'boolean' },
    block: { control: 'boolean' },
    icon: { control: 'boolean' },
    slot: { control: 'text' },
  },
  args: {
    variant: 'primary',
    size: 'md',
    disabled: false,
    block: false,
    icon: false,
    slot: 'Button',
  },
  parameters: {
    viewport: { defaultViewport: 'responsive' },
  },
}

export default meta

export const Primary: StoryObj<Args> = {
  render: (args) => html`
    <gl-button
      variant=${args.variant}
      size=${args.size}
      ?disabled=${args.disabled}
      ?block=${args.block}
      ?icon=${args.icon}
    >${args.slot}</gl-button>
  `,
}

export const Variants: StoryObj<Args> = {
  render: () => html`
    <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center">
      <gl-button variant="primary">Primary</gl-button>
      <gl-button variant="secondary">Secondary</gl-button>
      <gl-button variant="ghost">Ghost</gl-button>
      <gl-button variant="danger">Danger</gl-button>
      <gl-button variant="success">Success</gl-button>
    </div>
  `,
}

export const Sizes: StoryObj<Args> = {
  render: () => html`
    <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center">
      <gl-button variant="primary" size="sm">Small</gl-button>
      <gl-button variant="primary" size="md">Medium</gl-button>
      <gl-button variant="primary" size="lg">Large</gl-button>
    </div>
  `,
}

export const Block: StoryObj<Args> = {
  render: () => html`
    <div style="max-width:320px">
      <gl-button variant="primary" block>Full Width Button</gl-button>
    </div>
  `,
}

export const Disabled: StoryObj<Args> = {
  render: () => html`
    <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center">
      <gl-button variant="primary" disabled>Primary Disabled</gl-button>
      <gl-button variant="secondary" disabled>Secondary Disabled</gl-button>
      <gl-button variant="ghost" disabled>Ghost Disabled</gl-button>
    </div>
  `,
}
