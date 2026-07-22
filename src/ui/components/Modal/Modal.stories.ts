import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import './Modal.ts'
import '../Button/Button.ts'

const meta: Meta = {
  title: 'Modal',
  component: 'gl-modal',
  argTypes: {
    open: { control: 'boolean' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    heading: { control: 'text' },
    subtitle: { control: 'text' },
    closable: { control: 'boolean' },
  },
  args: {
    open: true,
    size: 'md',
    heading: 'Thêm học viên',
    subtitle: 'Nhập thông tin học viên mới',
    closable: true,
  },
}

export default meta

export const Default: StoryObj = {
  render: (args) => html`
    <gl-modal
      ?open=${args.open}
      size=${args.size}
      heading=${args.heading}
      subtitle=${args.subtitle}
      ?closable=${args.closable}
    >
      <p>Nội dung modal ở đây.</p>
      <gl-button slot="footer" variant="primary">Lưu</gl-button>
      <gl-button slot="footer" variant="ghost">Hủy</gl-button>
    </gl-modal>
  `,
}

export const Small: StoryObj = {
  render: () => html`
    <gl-modal open size="sm" heading="Xác nhận" subtitle="Bạn có chắc chắn?">
      <p>Hành động này không thể hoàn tác.</p>
      <gl-button slot="footer" variant="danger">Xóa</gl-button>
      <gl-button slot="footer" variant="ghost">Hủy</gl-button>
    </gl-modal>
  `,
}
