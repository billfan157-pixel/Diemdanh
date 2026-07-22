import { html, fixture, expect } from '@open-wc/testing'
import './TopBar.ts'
import type { GlTopBar } from './TopBar.ts'

describe('GlTopBar', () => {
  it('renders title', async () => {
    const el = await fixture<GlTopBar>(html`<gl-topbar title="Hello"></gl-topbar>`)
    expect(el.shadowRoot!.textContent).to.include('Hello')
  })

  it('renders subtitle', async () => {
    const el = await fixture<GlTopBar>(html`<gl-topbar title="T" subtitle="Sub"></gl-topbar>`)
    expect(el.shadowRoot!.textContent).to.include('Sub')
  })

  it('shows menu button when showMenu is true', async () => {
    const el = await fixture<GlTopBar>(html`<gl-topbar title="T" showMenu></gl-topbar>`)
    const btn = el.shadowRoot!.querySelector('.menu-btn')
    expect(btn).to.exist
  })

  it('emits gl-menu-toggle on menu click', async () => {
    const el = await fixture<GlTopBar>(html`<gl-topbar title="T" showMenu></gl-topbar>`)
    setTimeout(() => el.shadowRoot!.querySelector<HTMLElement>('.menu-btn')!.click(), 0)
    const evt = await new Promise<Event>(resolve => {
      el.addEventListener('gl-menu-toggle', resolve, { once: true })
    })
    expect(evt).to.exist
  })
})
