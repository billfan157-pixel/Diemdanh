import { html, fixture, expect } from '@open-wc/testing'
import './Badge.ts'
import type { GlBadge } from './Badge.ts'

describe('GlBadge', () => {
  it('renders with default neutral color', async () => {
    const el = await fixture<GlBadge>(html`<gl-badge>Test</gl-badge>`)
    expect(el.textContent).to.include('Test')
  })

  it('applies color class', async () => {
    const el = await fixture<GlBadge>(html`<gl-badge color="success">OK</gl-badge>`)
    const span = el.shadowRoot!.querySelector('span')!
    expect(span.className).to.include('badge-success')
  })

  it('applies small class', async () => {
    const el = await fixture<GlBadge>(html`<gl-badge small>XS</gl-badge>`)
    const span = el.shadowRoot!.querySelector('span')!
    expect(span.className).to.include('badge-xs')
  })
})
