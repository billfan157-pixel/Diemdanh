import { html, fixture, expect } from '@open-wc/testing'
import './BottomNav.ts'
import type { GlBottomNav } from './BottomNav.ts'

describe('GlBottomNav', () => {
  it('renders tabs', async () => {
    const el = await fixture<GlBottomNav>(html`
      <gl-bottom-nav .tabs=${[{ id: 'a', label: 'Home', icon: '🏠' }]} activeTab="a"></gl-bottom-nav>
    `)
    expect(el.shadowRoot!.textContent).to.include('Home')
  })

  it('marks active tab', async () => {
    const el = await fixture<GlBottomNav>(html`
      <gl-bottom-nav .tabs=${[
        { id: 'a', label: 'A', icon: '🏠' },
        { id: 'b', label: 'B', icon: '📚' },
      ]} activeTab="b"></gl-bottom-nav>
    `)
    const buttons = el.shadowRoot!.querySelectorAll('.tab')
    expect(buttons[0].className).not.to.include('active')
    expect(buttons[1].className).to.include('active')
  })

  it('shows badge', async () => {
    const el = await fixture<GlBottomNav>(html`
      <gl-bottom-nav .tabs=${[{ id: 'a', label: 'A', icon: '🔔', badge: 3 }]} activeTab="a"></gl-bottom-nav>
    `)
    const badge = el.shadowRoot!.querySelector('.tab-badge')!
    expect(badge.textContent).to.include('3')
  })

  it('emits gl-nav-change on click', async () => {
    const el = await fixture<GlBottomNav>(html`
      <gl-bottom-nav .tabs=${[{ id: 'a', label: 'A', icon: '🏠' }]} activeTab="a"></gl-bottom-nav>
    `)
    setTimeout(() => el.shadowRoot!.querySelector<HTMLElement>('.tab')!.click(), 0)
    const evt = await new Promise<CustomEvent>(resolve => {
      el.addEventListener('gl-nav-change', resolve as EventListener, { once: true })
    })
    expect(evt.detail.tabId).to.equal('a')
  })
})
