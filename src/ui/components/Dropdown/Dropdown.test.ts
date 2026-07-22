import { html, fixture, expect } from '@open-wc/testing'
import './Dropdown.ts'
import type { GlDropdown } from './Dropdown.ts'

describe('GlDropdown', () => {
  it('renders trigger slot', async () => {
    const el = await fixture<GlDropdown>(html`<gl-dropdown .items=${[]}><button>Menu</button></gl-dropdown>`)
    expect(el.textContent).to.include('Menu')
  })

  it('toggles menu visibility on trigger click', async () => {
    const el = await fixture<GlDropdown>(html`<gl-dropdown .items=${[{ id: 'a', label: 'A' }]}><button>M</button></gl-dropdown>`)
    const trigger = el.shadowRoot!.querySelector('.trigger') as HTMLElement
    trigger.click()
    expect(el.open).to.be.true
    trigger.click()
    expect(el.open).to.be.false
  })

  it('emits gl-dropdown-select on item click', async () => {
    const el = await fixture<GlDropdown>(html`<gl-dropdown .items=${[{ id: 'test', label: 'Test' }]}><button>M</button></gl-dropdown>`)
    el.shadowRoot!.querySelector<HTMLElement>('.trigger')!.click()
    await el.updateComplete
    setTimeout(() => el.shadowRoot!.querySelector<HTMLElement>('.item')!.click(), 0)
    const evt = await new Promise<CustomEvent>(resolve => {
      el.addEventListener('gl-dropdown-select', resolve as EventListener, { once: true })
    })
    expect(evt.detail.itemId).to.equal('test')
  })
})
