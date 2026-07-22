import { html, fixture, expect } from '@open-wc/testing'
import './FAB.ts'
import type { GlFab } from './FAB.ts'

describe('GlFab', () => {
  it('renders default content', async () => {
    const el = await fixture<GlFab>(html`<gl-fab></gl-fab>`)
    const btn = el.shadowRoot!.querySelector('button')!
    expect(btn).to.exist
  })

  it('renders slot content', async () => {
    const el = await fixture<GlFab>(html`<gl-fab>➕</gl-fab>`)
    expect(el.textContent).to.include('➕')
  })

  it('emits gl-fab-click on click', async () => {
    const el = await fixture<GlFab>(html`<gl-fab></gl-fab>`)
    setTimeout(() => el.shadowRoot!.querySelector<HTMLElement>('button')!.click(), 0)
    const evt = await new Promise<Event>(resolve => {
      el.addEventListener('gl-fab-click', resolve, { once: true })
    })
    expect(evt).to.exist
  })
})
