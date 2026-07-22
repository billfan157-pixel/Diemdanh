import { LitElement, html, css } from 'lit'

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'

export class GlAvatar extends LitElement {
  static styles = css`
    :host { display: inline-flex; }
    .avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-full);
      background: var(--color-primary-soft);
      color: var(--color-primary);
      font-weight: 800;
      flex-shrink: 0;
      overflow: hidden;
      user-select: none;
    }
    .avatar-sm { width: 32px; height: 32px; font-size: var(--font-size-xs); }
    .avatar-md { width: 40px; height: 40px; font-size: var(--font-size-sm); }
    .avatar-lg { width: 48px; height: 48px; font-size: var(--font-size-base); }
    .avatar-xl { width: 64px; height: 64px; font-size: var(--font-size-lg); }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `

  static properties = {
    size: { type: String },
    src: { type: String },
    name: { type: String },
  }

  declare size: AvatarSize
  declare src: string
  declare name: string

  constructor() {
    super()
    this.size = 'md'
    this.src = ''
    this.name = ''
  }

  private _getInitials(): string {
    if (!this.name) return '?'
    return this.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w.charAt(0).toUpperCase())
      .join('')
  }

  render() {
    if (this.src) {
      return html`<div class="avatar avatar-${this.size}"><img src=${this.src} alt=${this.name}></div>`
    }
    return html`<div class="avatar avatar-${this.size}" aria-label=${this.name}>${this._getInitials()}</div>`
  }
}

customElements.define('gl-avatar', GlAvatar)

declare global {
  interface HTMLElementTagNameMap {
    'gl-avatar': GlAvatar
  }
}
