import { html, fixture, expect } from '@open-wc/testing'
import './Sidebar.ts'
import type { GlSidebar } from './Sidebar.ts'

describe('GlSidebar', () => {
  it('renders header', async () => {
    const el = await fixture<GlSidebar>(html`<gl-sidebar header="Menu" .items=${[]}></gl-sidebar>`)
    expect(el.shadowRoot!.textContent).to.include('Menu')
  })

  it('renders items', async () => {
    const el = await fixture<GlSidebar>(html`
      <gl-sidebar .items=${[
        { id: 'a', label: 'Item A', icon: '📊' },
      ]}></gl-sidebar>
    `)
    expect(el.shadowRoot!.textContent).to.include('Item A')
  })

  it('marks active item', async () => {
    const el = await fixture<GlSidebar>(html`
      <gl-sidebar .items=${[
        { id: 'a', label: 'A', icon: '📊' },
        { id: 'b', label: 'B', icon: '📚' },
      ]} activeId="b"></gl-sidebar>
    `)
    const buttons = el.shadowRoot!.querySelectorAll('.item')
    expect(buttons[0].className).not.to.include('active')
    expect(buttons[1].className).to.include('active')
  })

  it('emits gl-sidebar-select on click', async () => {
    const el = await fixture<GlSidebar>(html`
      <gl-sidebar .items=${[{ id: 'a', label: 'A', icon: '📊' }]}></gl-sidebar>
    `)
    setTimeout(() => el.shadowRoot!.querySelector<HTMLElement>('.item')!.click(), 0)
    const evt = await new Promise<CustomEvent>(resolve => {
      el.addEventListener('gl-sidebar-select', resolve as EventListener, { once: true })
    })
    expect(evt.detail.itemId).to.equal('a')
  })
})
