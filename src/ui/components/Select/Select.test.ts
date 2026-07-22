import { html, fixture, expect } from '@open-wc/testing'
import './Select.ts'
import type { GlSelect } from './Select.ts'

describe('GlSelect', () => {
  it('renders with label', async () => {
    const el = await fixture<GlSelect>(html`<gl-select label="Filter"></gl-select>`)
    expect(el.shadowRoot!.textContent).to.include('Filter')
  })

  it('renders options', async () => {
    const el = await fixture<GlSelect>(html`
      <gl-select .options=${[
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' },
      ]}></gl-select>
    `)
    const select = el.shadowRoot!.querySelector('select')!
    expect(select.options.length).to.equal(3)
    expect(select.options[1].text).to.equal('Option A')
  })

  it('forwards change events', async () => {
    let value = ''
    const el = await fixture<GlSelect>(html`
      <gl-select
        .options=${[{ value: 'test', label: 'Test' }]}
        @gl-change=${(e: CustomEvent) => { value = e.detail.value }}
      ></gl-select>
    `)
    const select = el.shadowRoot!.querySelector('select')!
    select.value = 'test'
    select.dispatchEvent(new Event('change'))
    expect(value).to.equal('test')
  })
})
