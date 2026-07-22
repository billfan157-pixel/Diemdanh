import { html, fixture, expect } from '@open-wc/testing'
import './BottomSheet.ts'
import type { GlBottomSheet } from './BottomSheet.ts'

describe('GlBottomSheet', () => {
  it('renders heading', async () => {
    const el = await fixture<GlBottomSheet>(html`<gl-bottom-sheet open heading="Test"></gl-bottom-sheet>`)
    expect(el.shadowRoot!.textContent).to.include('Test')
  })

  it('is hidden when open is false', async () => {
    const el = await fixture<GlBottomSheet>(html`<gl-bottom-sheet heading="Test"></gl-bottom-sheet>`)
    const overlay = el.shadowRoot!.querySelector('.overlay')!
    expect(overlay.className).to.include('hidden')
  })

  it('is visible when open is true', async () => {
    const el = await fixture<GlBottomSheet>(html`<gl-bottom-sheet open heading="Test"></gl-bottom-sheet>`)
    const overlay = el.shadowRoot!.querySelector('.overlay')!
    expect(overlay.className).not.to.include('hidden')
  })

  it('emits gl-close on close button click', async () => {
    const el = await fixture<GlBottomSheet>(html`<gl-bottom-sheet open heading="Test"></gl-bottom-sheet>`)
    setTimeout(() => el.shadowRoot!.querySelector<HTMLElement>('.close-btn')!.click(), 0)
    const evt = await new Promise<Event>(resolve => {
      el.addEventListener('gl-close', resolve, { once: true })
    })
    expect(evt).to.exist
  })
})
