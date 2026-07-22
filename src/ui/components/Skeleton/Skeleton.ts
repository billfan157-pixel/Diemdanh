import { LitElement, html, css } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'

export type SkeletonVariant = 'text' | 'title' | 'avatar' | 'card' | 'button'

export class GlSkeleton extends LitElement {
  static styles = css`
    :host { display: block; }
    .skeleton {
      background: linear-gradient(90deg, var(--color-bg-hover) 25%, var(--color-bg-elevated) 50%, var(--color-bg-hover) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s ease-in-out infinite;
      border-radius: var(--radius-sm);
      pointer-events: none;
      user-select: none;
    }
    .skeleton-text { height: 14px; width: 100%; }
    .skeleton-text-sm { height: 11px; width: 60%; }
    .skeleton-title { height: 24px; width: 50%; }
    .skeleton-avatar { width: 40px; height: 40px; border-radius: var(--radius-full); }
    .skeleton-button { height: 36px; width: 80px; border-radius: var(--radius-md); }
    .skeleton-card { height: 80px; width: 100%; }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `

  static properties = {
    variant: { type: String },
    width: { type: String },
    height: { type: String },
  }

  declare variant: SkeletonVariant
  declare width: string
  declare height: string

  constructor() {
    super()
    this.variant = 'text'
    this.width = ''
    this.height = ''
  }

  render() {
    const styles: Record<string, string> = {}
    if (this.width) styles.width = this.width
    if (this.height) styles.height = this.height

    return html`
      <div class="skeleton skeleton-${this.variant}" style=${styleMap(styles)}></div>
    `
  }
}

customElements.define('gl-skeleton', GlSkeleton)

declare global {
  interface HTMLElementTagNameMap {
    'gl-skeleton': GlSkeleton
  }
}
