import { html, fixture, expect } from '@open-wc/testing'
import './Card.ts'
import type { GlCard } from './Card.ts'

describe('GlCard', () => {
  it('renders content', async () => {
    const el = await fixture<GlCard>(html`<gl-card>Hello</gl-card>`)
    expect(el.textContent).to.include('Hello')
  })

  it('applies clickable class', async () => {
    const el = await fixture<GlCard>(html`<gl-card clickable></gl-card>`)
    const card = el.shadowRoot!.querySelector('.card')!
    expect(card.className).to.include('card-clickable')
  })

  it('renders header slot', async () => {
    const el = await fixture<GlCard>(html`<gl-card><span slot="header">Title</span></gl-card>`)
    expect(el.textContent).to.include('Title')
  })
})
