import { html, fixture, expect } from '@open-wc/testing'
import './Tabs.ts'
import type { GlTabs } from './Tabs.ts'

describe('GlTabs', () => {
  it('renders tabs', async () => {
    const el = await fixture<GlTabs>(html`
      <gl-tabs .tabs=${[
        { id: 'hk1', label: 'HK1' },
        { id: 'hk2', label: 'HK2' },
        { id: 'year', label: 'Cả năm' },
      ]} activeTab="hk1"></gl-tabs>
    `)
    const buttons = el.shadowRoot!.querySelectorAll('.tab')
    expect(buttons.length).to.equal(3)
    expect(buttons[0].classList.contains('active')).to.be.true
  })

  it('emits gl-tab-change on click', async () => {
    let tabId = ''
    const el = await fixture<GlTabs>(html`
      <gl-tabs
        .tabs=${[{ id: 'hk1', label: 'HK1' }, { id: 'hk2', label: 'HK2' }]}
        activeTab="hk1"
        @gl-tab-change=${(e: CustomEvent) => { tabId = e.detail.tabId }}
      ></gl-tabs>
    `)
    const buttons = el.shadowRoot!.querySelectorAll<HTMLElement>('.tab')
    buttons[1].click()
    expect(tabId).to.equal('hk2')
  })

  it('updates active class on click', async () => {
    const el = await fixture<GlTabs>(html`
      <gl-tabs
        .tabs=${[{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]}
        activeTab="a"
      ></gl-tabs>
    `)
    const buttons = el.shadowRoot!.querySelectorAll<HTMLElement>('.tab')
    buttons[1].click()
    expect(el.activeTab).to.equal('b')
  })
})
