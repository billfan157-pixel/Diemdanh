import { html, fixture, expect } from '@open-wc/testing'
import '../../src/ui/views/components/gl-kpi-card'
import type { GlKpiCard } from '../../src/ui/views/components/gl-kpi-card'

describe('GlKpiCard', () => {
  it('renders with all props', async () => {
    const el = await fixture<GlKpiCard>(html`
      <gl-kpi-card label="Lớp" value="12" icon="🏫" barPercent="75" barColor="var(--color-primary)"></gl-kpi-card>
    `)
    const root = el.shadowRoot!
    expect(root.textContent).to.include('Lớp')
    expect(root.textContent).to.include('12')
    expect(root.textContent).to.include('🏫')
    const barFill = root.querySelector<HTMLElement>('.bar-fill')!
    expect(barFill.style.width).to.equal('75%')
    expect(barFill.style.background).to.equal('var(--color-primary)')
  })

  it('uses default values when props not set', async () => {
    const el = await fixture<GlKpiCard>(html`<gl-kpi-card></gl-kpi-card>`)
    expect(el.label).to.equal('')
    expect(el.value).to.equal('')
    expect(el.icon).to.equal('')
    expect(el.barPercent).to.equal(0)
    expect(el.barColor).to.equal('var(--color-primary)')
  })

  it('renders bar with 0% width by default', async () => {
    const el = await fixture<GlKpiCard>(html`<gl-kpi-card></gl-kpi-card>`)
    const barFill = el.shadowRoot!.querySelector<HTMLElement>('.bar-fill')!
    expect(barFill.style.width).to.equal('0%')
  })

  it('renders bar with custom color', async () => {
    const el = await fixture<GlKpiCard>(html`
      <gl-kpi-card barPercent="50" barColor="var(--color-success)"></gl-kpi-card>
    `)
    const barFill = el.shadowRoot!.querySelector<HTMLElement>('.bar-fill')!
    expect(barFill.style.width).to.equal('50%')
    expect(barFill.style.background).to.equal('var(--color-success)')
  })

  it('updates bar width when barPercent changes', async () => {
    const el = await fixture<GlKpiCard>(html`<gl-kpi-card barPercent="30"></gl-kpi-card>`)
    let barFill = el.shadowRoot!.querySelector<HTMLElement>('.bar-fill')!
    expect(barFill.style.width).to.equal('30%')
    el.barPercent = 85
    await el.updateComplete
    barFill = el.shadowRoot!.querySelector<HTMLElement>('.bar-fill')!
    expect(barFill.style.width).to.equal('85%')
  })
})
