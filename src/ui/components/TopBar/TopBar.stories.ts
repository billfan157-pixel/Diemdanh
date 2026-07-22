import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import './TopBar.ts'

const meta: Meta = {
  title: 'TopBar',
  component: 'gl-topbar',
  argTypes: {
    title: { control: 'text' },
    subtitle: { control: 'text' },
    showMenu: { control: 'boolean' },
  },
  args: {
    title: 'Sổ Điểm Giáo Lý',
    subtitle: 'Năm 2025-2026',
    showMenu: true,
  },
}

export default meta

export const Default: StoryObj = {
  render: (args: Record<string, unknown>) => html`
    <gl-topbar .title=${args.title as string} .subtitle=${args.subtitle as string} .showMenu=${args.showMenu as boolean}>
      <gl-button slot="actions" variant="ghost">Lưu</gl-button>
    </gl-topbar>
  `,
}

export const NoSubtitle: StoryObj = {
  render: () => html`
    <gl-topbar title="Lớp Giáo Lý 1"></gl-topbar>
  `,
}
