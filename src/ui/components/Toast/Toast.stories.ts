import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import './Toast.ts'

const meta: Meta = {
  title: 'Toast',
  component: 'gl-toast',
  argTypes: {
    type: { control: 'select', options: ['info', 'success', 'warning', 'error'] },
    message: { control: 'text' },
    closable: { control: 'boolean' },
    duration: { control: 'number' },
  },
  args: {
    type: 'info',
    message: 'Đây là thông báo',
    closable: true,
    duration: 4000,
  },
}

export default meta

export const Info: StoryObj = {
  render: () => html`<gl-toast type="info" message="Thông tin đã được lưu."></gl-toast>`,
}

export const Success: StoryObj = {
  render: () => html`<gl-toast type="success" message="Đồng bộ thành công!"></gl-toast>`,
}

export const Warning: StoryObj = {
  render: () => html`<gl-toast type="warning" message="Sắp đến hạn tổng kết."></gl-toast>`,
}

export const Error: StoryObj = {
  render: () => html`<gl-toast type="error" message="Có lỗi xảy ra khi lưu."></gl-toast>`,
}

export const NonClosable: StoryObj = {
  render: () => html`<gl-toast type="success" message="Tự động ẩn sau 3s" closable=false duration=3000></gl-toast>`,
}
