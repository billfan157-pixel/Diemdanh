import { html, fixture, expect } from '@open-wc/testing'
import './CommandPalette.ts'
import type { GlCommandPalette } from './CommandPalette.ts'

describe('GlCommandPalette', () => {
  it('is hidden when open is false', async () => {
    const el = await fixture<GlCommandPalette>(html`<gl-command-palette .commands=${[]}></gl-command-palette>`)
    expect(el.shadowRoot!.querySelector('.overlay')).to.be.null
  })

  it('renders when open', async () => {
    const el = await fixture<GlCommandPalette>(html`<gl-command-palette open .commands=${[{ id: 'a', label: 'Action A' }]}></gl-command-palette>`)
    expect(el.shadowRoot!.textContent).to.include('Action A')
  })

  it('filters commands by search', async () => {
    const el = await fixture<GlCommandPalette>(html`
      <gl-command-palette open .commands=${[
        { id: 'a', label: 'Action A' },
        { id: 'b', label: 'Action B' },
      ]}></gl-command-palette>
    `)
    const input = el.shadowRoot!.querySelector('input')!
    input.value = 'A'
    input.dispatchEvent(new Event('input'))
    await el.updateComplete
    expect(el.shadowRoot!.textContent).to.include('Action A')
  })

  it('emits gl-palette-select on item click', async () => {
    const el = await fixture<GlCommandPalette>(html`<gl-command-palette open .commands=${[{ id: 'test', label: 'Test' }]}></gl-command-palette>`)
    setTimeout(() => el.shadowRoot!.querySelector<HTMLElement>('.result-item')!.click(), 0)
    const evt = await new Promise<CustomEvent>(resolve => {
      el.addEventListener('gl-palette-select', resolve as EventListener, { once: true })
    })
    expect(evt.detail.commandId).to.equal('test')
  })
})
