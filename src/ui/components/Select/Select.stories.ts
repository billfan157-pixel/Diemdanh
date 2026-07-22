import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import './Select.ts'

const meta: Meta = {
  title: 'Select',
  component: 'gl-select',
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
  },
  args: {
    label: 'Xếp loại',
    placeholder: 'Chọn xếp loại...',
    disabled: false,
  },
}

export default meta

export const Default: StoryObj = {
  render: () => html`
    <gl-select
      label="Xếp loại"
      placeholder="Chọn..."
      .options=${[
        { value: 'all', label: 'Tất cả' },
        { value: 'xs', label: 'Xuất sắc' },
        { value: 'g', label: 'Giỏi' },
        { value: 'k', label: 'Khá' },
        { value: 'tb', label: 'Trung bình' },
        { value: 'y', label: 'Yếu' },
      ]}
    ></gl-select>
  `,
}
