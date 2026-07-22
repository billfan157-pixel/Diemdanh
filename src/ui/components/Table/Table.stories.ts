import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import './Table.ts'

const meta: Meta = {
  title: 'Table',
  component: 'gl-table',
}

export default meta

const columns = [
  { key: 'name', label: 'Họ tên' },
  { key: 'score', label: 'Điểm', align: 'center' as const },
  { key: 'rank', label: 'Xếp loại', align: 'right' as const },
]

const rows = [
  { name: 'Nguyễn Văn A', score: 9.5, rank: 'Xuất sắc' },
  { name: 'Trần Thị B', score: 8.0, rank: 'Giỏi' },
  { name: 'Lê Văn C', score: 6.5, rank: 'Khá' },
  { name: 'Phạm Thị D', score: 5.0, rank: 'Trung bình' },
]

export const Default: StoryObj = {
  render: () => html`<gl-table .columns=${columns} .rows=${rows}></gl-table>`,
}

export const CustomWidth: StoryObj = {
  render: () => html`
    <gl-table .columns=${[
      { key: 'name', label: 'Họ tên', width: '60%' },
      { key: 'score', label: 'Điểm', align: 'center', width: '20%' },
      { key: 'rank', label: 'Xếp loại', align: 'right', width: '20%' },
    ]} .rows=${rows}></gl-table>
  `,
}

export const ManyRows: StoryObj = {
  render: () => html`
    <gl-table .columns=${columns} .rows=${Array.from({ length: 20 }, (_, i) => ({
      name: `Học viên ${i + 1}`,
      score: Math.round((Math.random() * 4 + 5) * 10) / 10,
      rank: 'Khá',
    }))}></gl-table>
  `,
}
