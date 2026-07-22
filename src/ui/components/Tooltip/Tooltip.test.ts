import { html, fixture, expect } from '@open-wc/testing'
import './Tooltip.ts'
import type { GlTooltip } from './Tooltip.ts'

describe('GlTooltip', () => {
  it('renders tooltip text', async () => {
    const el = await fixture<GlTooltip>(html`<gl-tooltip text="Help"><button>Hover</button></gl-tooltip>`)
    const tip = el.shadowRoot!.querySelector('.tooltip')!
    expect(tip.textContent).to.include('Help')
  })

  it('applies position class', async () => {
    const el = await fixture<GlTooltip>(html`<gl-tooltip text="H" position="bottom"><span>X</span></gl-tooltip>`)
    const tip = el.shadowRoot!.querySelector('.tooltip')!
    expect(tip.className).to.include('tooltip-bottom')
  })

  it('renders slot content', async () => {
    const el = await fixture<GlTooltip>(html`<gl-tooltip text="H"><span>Trigger</span></gl-tooltip>`)
    expect(el.textContent).to.include('Trigger')
  })
})
