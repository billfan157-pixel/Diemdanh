import { html, fixture, expect } from '@open-wc/testing'
import './Chip.ts'
import type { GlChip } from './Chip.ts'

describe('GlChip', () => {
  it('renders text', async () => {
    const el = await fixture<GlChip>(html`<gl-chip color="primary">Test</gl-chip>`)
    expect(el.textContent).to.include('Test')
  })

  it('applies color class', async () => {
    const el = await fixture<GlChip>(html`<gl-chip color="success">OK</gl-chip>`)
    const span = el.shadowRoot!.querySelector('.chip')!
    expect(span.className).to.include('chip-success')
  })

  it('shows remove button when removable', async () => {
    const el = await fixture<GlChip>(html`<gl-chip removable>Test</gl-chip>`)
    const btn = el.shadowRoot!.querySelector('.remove-btn')!
    expect(btn).to.exist
  })

  it('emits gl-chip-remove on remove click', async () => {
    const el = await fixture<GlChip>(html`<gl-chip removable>Test</gl-chip>`)
    setTimeout(() => el.shadowRoot!.querySelector<HTMLElement>('.remove-btn')!.click(), 0)
    const evt = await new Promise<Event>(resolve => {
      el.addEventListener('gl-chip-remove', resolve, { once: true })
    })
    expect(evt).to.exist
  })
})
