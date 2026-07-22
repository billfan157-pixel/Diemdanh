import { html, fixture, expect } from '@open-wc/testing'
import './Table.ts'
import type { GlTable } from './Table.ts'

describe('GlTable', () => {
  it('renders columns in thead', async () => {
    const el = await fixture<GlTable>(html`
      <gl-table .columns=${[{ key: 'name', label: 'Name' }]} .rows=${[]}></gl-table>
    `)
    const th = el.shadowRoot!.querySelector('th')!
    expect(th.textContent).to.include('Name')
  })

  it('renders rows in tbody', async () => {
    const el = await fixture<GlTable>(html`
      <gl-table .columns=${[{ key: 'name', label: 'Name' }]} .rows=${[{ name: 'Alice' }]}></gl-table>
    `)
    const td = el.shadowRoot!.querySelector('td')!
    expect(td.textContent).to.include('Alice')
  })

  it('applies align classes', async () => {
    const el = await fixture<GlTable>(html`
      <gl-table .columns=${[{ key: 'n', label: 'N', align: 'right' }]} .rows=${[{ n: '1' }]}></gl-table>
    `)
    const td = el.shadowRoot!.querySelector('td')!
    expect(td.className).to.include('align-right')
  })
})
