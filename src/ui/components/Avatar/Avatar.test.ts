import { html, fixture, expect } from '@open-wc/testing'
import './Avatar.ts'
import type { GlAvatar } from './Avatar.ts'

describe('GlAvatar', () => {
  it('renders initials from name', async () => {
    const el = await fixture<GlAvatar>(html`<gl-avatar name="Nguyễn Văn A"></gl-avatar>`)
    const div = el.shadowRoot!.querySelector('.avatar')!
    expect(div.textContent).to.equal('NV')
  })

  it('renders single initial for single name', async () => {
    const el = await fixture<GlAvatar>(html`<gl-avatar name="Admin"></gl-avatar>`)
    const div = el.shadowRoot!.querySelector('.avatar')!
    expect(div.textContent).to.equal('A')
  })

  it('renders ? for empty name', async () => {
    const el = await fixture<GlAvatar>(html`<gl-avatar></gl-avatar>`)
    const div = el.shadowRoot!.querySelector('.avatar')!
    expect(div.textContent).to.equal('?')
  })

  it('renders img when src is provided', async () => {
    const el = await fixture<GlAvatar>(html`<gl-avatar src="photo.jpg" name="A"></gl-avatar>`)
    const img = el.shadowRoot!.querySelector('img')!
    expect(img).to.exist
    expect(img.getAttribute('src')).to.equal('photo.jpg')
  })

  it('applies size class', async () => {
    const el = await fixture<GlAvatar>(html`<gl-avatar size="lg" name="A"></gl-avatar>`)
    const div = el.shadowRoot!.querySelector('.avatar')!
    expect(div.className).to.include('avatar-lg')
  })
})
