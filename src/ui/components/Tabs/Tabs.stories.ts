import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import './Tabs.ts'

const meta: Meta = {
  title: 'Tabs',
  component: 'gl-tabs',
  argTypes: {
    activeTab: { control: 'text' },
  },
  args: {
    activeTab: 'hk1',
  },
}

export default meta

export const Default: StoryObj = {
  render: () => html`
    <gl-tabs
      .tabs=${[
        { id: 'hk1', label: 'HK1' },
        { id: 'hk2', label: 'HK2' },
        { id: 'year', label: 'Cả năm' },
      ]}
      activeTab="hk1"
    ></gl-tabs>
  `,
}

export const FourTabs: StoryObj = {
  render: () => html`
    <gl-tabs
      .tabs=${[
        { id: 'cards', label: '🃏 Thẻ' },
        { id: 'table', label: '📊 Bảng' },
        { id: 'rank', label: '🏆 Xếp hạng' },
        { id: 'stats', label: '📈 Thống kê' },
      ]}
      activeTab="cards"
    ></gl-tabs>
  `,
}
