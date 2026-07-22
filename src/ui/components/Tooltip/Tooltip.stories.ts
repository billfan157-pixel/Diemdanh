import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import './Tooltip.ts'

const meta: Meta = {
  title: 'Tooltip',
  component: 'gl-tooltip',
  argTypes: {
    text: { control: 'text' },
    position: { control: 'select', options: ['top', 'bottom', 'left', 'right'] },
  },
  args: {
    text: 'Đây là tooltip',
    position: 'top',
  },
}

export default meta

export const Top: StoryObj = {
  render: () => html`<gl-tooltip text="Tooltip trên" position="top"><button style="padding:8px 16px;">Hover</button></gl-tooltip>`,
}

export const Bottom: StoryObj = {
  render: () => html`<gl-tooltip text="Tooltip dưới" position="bottom"><button style="padding:8px 16px;">Hover</button></gl-tooltip>`,
}

export const AllPositions: StoryObj = {
  render: () => html`
    <div style="display:flex;gap:24px;padding:40px;">
      <gl-tooltip text="Trên" position="top"><button>Top</button></gl-tooltip>
      <gl-tooltip text="Dưới" position="bottom"><button>Bottom</button></gl-tooltip>
      <gl-tooltip text="Trái" position="left"><button>Left</button></gl-tooltip>
      <gl-tooltip text="Phải" position="right"><button>Right</button></gl-tooltip>
    </div>
  `,
}
