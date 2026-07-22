import { html, fixture, expect } from '@open-wc/testing'
import './Input.ts'
import type { GlInput } from './Input.ts'

describe('GlInput', () => {
  it('renders with label', async () => {
    const el = await fixture<GlInput>(html`<gl-input label="Name"></gl-input>`)
    expect(el.shadowRoot!.textContent).to.include('Name')
  })

  it('shows error message', async () => {
    const el = await fixture<GlInput>(html`<gl-input error="Required field"></gl-input>`)
    expect(el.shadowRoot!.textContent).to.include('Required field')
  })

  it('forwards value changes', async () => {
    let value = ''
    const el = await fixture<GlInput>(html`<gl-input @gl-change=${(e: CustomEvent) => { value = e.detail.value }}></gl-input>`)
    const input = el.shadowRoot!.querySelector('input')!
    input.value = 'hello'
    input.dispatchEvent(new Event('input'))
    expect(value).to.equal('hello')
  })

  it('disables input', async () => {
    const el = await fixture<GlInput>(html`<gl-input disabled></gl-input>`)
    const input = el.shadowRoot!.querySelector('input')!
    expect(input.hasAttribute('disabled')).to.be.true
  })

  it('sets aria-invalid when error is present', async () => {
    const el = await fixture<GlInput>(html`<gl-input error="Error"></gl-input>`)
    const input = el.shadowRoot!.querySelector('input')!
    expect(input.getAttribute('aria-invalid')).to.equal('true')
  })
})
