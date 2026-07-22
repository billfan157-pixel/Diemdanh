import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import './Input.ts'

type Args = {
  label: string
  type: string
  placeholder: string
  disabled: boolean
  required: boolean
  error: string
  hint: string
}

const meta: Meta<Args> = {
  title: 'Input',
  component: 'gl-input',
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'password', 'email', 'number', 'tel', 'search'],
    },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    error: { control: 'text' },
    hint: { control: 'text' },
    label: { control: 'text' },
    placeholder: { control: 'text' },
  },
  args: {
    label: 'Họ tên',
    type: 'text',
    placeholder: 'Nhập họ tên...',
    disabled: false,
    required: false,
    error: '',
    hint: '',
  },
}

export default meta

export const Default: StoryObj<Args> = {
  render: (args) => html`
    <gl-input
      label=${args.label}
      type=${args.type}
      placeholder=${args.placeholder}
      ?disabled=${args.disabled}
      ?required=${args.required}
      error=${args.error}
      hint=${args.hint}
    ></gl-input>
  `,
}

export const WithError: StoryObj<Args> = {
  render: () => html`
    <gl-input
      label="Email"
      type="email"
      placeholder="email@example.com"
      error="Email không hợp lệ"
      required
    ></gl-input>
  `,
}

export const WithHint: StoryObj<Args> = {
  render: () => html`
    <gl-input
      label="Mật khẩu"
      type="password"
      placeholder="••••••"
      hint="Ít nhất 6 ký tự"
    ></gl-input>
  `,
}

export const Disabled: StoryObj<Args> = {
  render: () => html`
    <gl-input
      label="Tài khoản"
      value="admin"
      disabled
    ></gl-input>
  `,
}
