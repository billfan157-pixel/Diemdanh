import { html, fixture, expect } from '@open-wc/testing'
import './Toast.ts'
import type { GlToast } from './Toast.ts'

describe('GlToast', () => {
  it('renders with message', async () => {
    const el = await fixture<GlToast>(html`<gl-toast type="info" message="Hello"></gl-toast>`)
    expect(el.shadowRoot!.textContent).to.include('Hello')
  })

  it('applies type class', async () => {
    const el = await fixture<GlToast>(html`<gl-toast type="success" message="OK"></gl-toast>`)
    const div = el.shadowRoot!.querySelector('.toast')!
    expect(div.className).to.include('toast-success')
  })

  it('shows close button by default', async () => {
    const el = await fixture<GlToast>(html`<gl-toast message="Test"></gl-toast>`)
    const btn = el.shadowRoot!.querySelector('.toast-close')!
    expect(btn).to.exist
  })

  it('hides close button when closable is false', async () => {
    const el = await fixture<GlToast>(html`<gl-toast message="Test" .closable=${false}></gl-toast>`)
    const btn = el.shadowRoot!.querySelector('.toast-close')
    expect(btn).to.be.null
  })

  it('dispatches gl-toast-end event on close', async () => {
    const el = await fixture<GlToast>(html`<gl-toast message="Test"></gl-toast>`)
    setTimeout(() => el.shadowRoot!.querySelector<HTMLElement>('.toast-close')!.click(), 0)
    const evt = await new Promise<Event>(resolve => {
      el.addEventListener('gl-toast-end', resolve, { once: true })
    })
    expect(evt).to.exist
  })
})
