import { html, fixture, expect } from '@open-wc/testing'
import './Skeleton.ts'
import type { GlSkeleton } from './Skeleton.ts'

describe('GlSkeleton', () => {
  it('renders with default text variant', async () => {
    const el = await fixture<GlSkeleton>(html`<gl-skeleton></gl-skeleton>`)
    const div = el.shadowRoot!.querySelector('div')!
    expect(div.className).to.include('skeleton-text')
  })

  it('renders with specified variant', async () => {
    const el = await fixture<GlSkeleton>(html`<gl-skeleton variant="avatar"></gl-skeleton>`)
    const div = el.shadowRoot!.querySelector('div')!
    expect(div.className).to.include('skeleton-avatar')
  })

  it('applies custom width and height', async () => {
    const el = await fixture<GlSkeleton>(html`<gl-skeleton variant="button" width="120px" height="48px"></gl-skeleton>`)
    const div = el.shadowRoot!.querySelector('div')!
    expect(div.getAttribute('style')).to.include('width:120px')
    expect(div.getAttribute('style')).to.include('height:48px')
  })
})
