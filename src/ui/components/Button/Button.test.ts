import { html, fixture, expect } from '@open-wc/testing'
import './Button.ts'
import type { GlButton } from './Button.ts'

describe('GlButton', () => {
  it('renders with default props', async () => {
    const el = await fixture<GlButton>(html`<gl-button>Click me</gl-button>`)
    const btn = el.shadowRoot!.querySelector('button')!
    expect(btn).to.exist
    expect(el.textContent).to.include('Click me')
  })

  it('applies variant class', async () => {
    const el = await fixture<GlButton>(html`<gl-button variant="primary">Primary</gl-button>`)
    const btn = el.shadowRoot!.querySelector('button')!
    expect(btn.classList.contains('btn-primary')).to.be.true
  })

  it('applies size class', async () => {
    const el = await fixture<GlButton>(html`<gl-button size="sm">Small</gl-button>`)
    const btn = el.shadowRoot!.querySelector('button')!
    expect(btn.classList.contains('btn-sm')).to.be.true
  })

  it('disables button', async () => {
    const el = await fixture<GlButton>(html`<gl-button disabled>Disabled</gl-button>`)
    const btn = el.shadowRoot!.querySelector('button')!
    expect(btn.hasAttribute('disabled')).to.be.true
  })

  it('applies block class', async () => {
    const el = await fixture<GlButton>(html`<gl-button block>Block</gl-button>`)
    const btn = el.shadowRoot!.querySelector('button')!
    expect(btn.classList.contains('btn-block')).to.be.true
  })

  it('sets type attribute', async () => {
    const el = await fixture<GlButton>(html`<gl-button type="submit">Submit</gl-button>`)
    const btn = el.shadowRoot!.querySelector('button')!
    expect(btn.getAttribute('type')).to.equal('submit')
  })

  it('accepts click events', async () => {
    let clicked = false
    const el = await fixture<GlButton>(html`<gl-button @click=${() => { clicked = true }}>Click</gl-button>`)
    const btn = el.shadowRoot!.querySelector('button')!
    btn.click()
    expect(clicked).to.be.true
  })

  it('does not fire click when disabled', async () => {
    let clicked = false
    const el = await fixture<GlButton>(html`<gl-button disabled @click=${() => { clicked = true }}>Click</gl-button>`)
    const btn = el.shadowRoot!.querySelector('button')!
    btn.click()
    expect(clicked).to.be.false
  })

  it('sets aria-label when label prop is set', async () => {
    const el = await fixture<GlButton>(html`<gl-button label="Close dialog">×</gl-button>`)
    const btn = el.shadowRoot!.querySelector('button')!
    expect(btn.getAttribute('aria-label')).to.equal('Close dialog')
  })
})
