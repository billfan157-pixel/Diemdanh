import { html, fixture, expect } from '@open-wc/testing'
import './Modal.ts'
import type { GlModal } from './Modal.ts'

describe('GlModal', () => {
  it('renders heading', async () => {
    const el = await fixture<GlModal>(html`<gl-modal open heading="Title"></gl-modal>`)
    expect(el.shadowRoot!.textContent).to.include('Title')
  })

  it('is hidden when not open', async () => {
    const el = await fixture<GlModal>(html`<gl-modal heading="Hidden"></gl-modal>`)
    const overlay = el.shadowRoot!.querySelector('.modal-overlay')!
    expect(overlay.classList.contains('hidden')).to.be.true
  })

  it('is visible when open', async () => {
    const el = await fixture<GlModal>(html`<gl-modal open heading="Visible"></gl-modal>`)
    const overlay = el.shadowRoot!.querySelector('.modal-overlay')!
    expect(overlay.classList.contains('hidden')).to.be.false
  })

  it('closes on close button click', async () => {
    const el = await fixture<GlModal>(html`<gl-modal open heading="Close"></gl-modal>`)
    const closeBtn = el.shadowRoot!.querySelector<HTMLElement>('.modal-close')!
    closeBtn.click()
    expect(el.open).to.be.false
  })

  it('fires gl-close event on close', async () => {
    let fired = false
    const el = await fixture<GlModal>(html`<gl-modal open heading="Test" @gl-close=${() => { fired = true }}></gl-modal>`)
    const closeBtn = el.shadowRoot!.querySelector<HTMLElement>('.modal-close')!
    closeBtn.click()
    expect(fired).to.be.true
  })
})
