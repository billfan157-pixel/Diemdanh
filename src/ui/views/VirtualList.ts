// ============================================================
// Sổ Điểm GL — Virtual Scroll List Helper
// ============================================================

export interface VirtualListOptions<T> {
  container: HTMLElement
  scrollContainer?: HTMLElement
  items: T[]
  itemHeight: number
  renderItem: (item: T, index: number) => string
}

export class VirtualList<T> {
  private container: HTMLElement
  private scrollContainer: HTMLElement
  private items: T[]
  private itemHeight: number
  private renderItem: (item: T, index: number) => string
  private listEl: HTMLDivElement
  private topSpacer: HTMLDivElement
  private bottomSpacer: HTMLDivElement
  private contentEl: HTMLDivElement
  private onScrollBound: () => void

  constructor(options: VirtualListOptions<T>) {
    this.container = options.container
    this.scrollContainer = options.scrollContainer || options.container
    this.items = options.items || []
    this.itemHeight = options.itemHeight
    this.renderItem = options.renderItem

    // Only set overflow on scrollContainer if it's the container itself
    if (this.scrollContainer === this.container) {
      this.container.style.overflowY = 'auto'
    }
    this.container.style.position = 'relative'

    this.listEl = document.createElement('div')
    this.listEl.style.position = 'relative'
    this.listEl.style.width = '100%'

    this.topSpacer = document.createElement('div')
    this.bottomSpacer = document.createElement('div')
    this.contentEl = document.createElement('div')
    this.contentEl.style.display = 'flex'
    this.contentEl.style.flexDirection = 'column'
    this.contentEl.style.gap = '6px'

    this.listEl.appendChild(this.topSpacer)
    this.listEl.appendChild(this.contentEl)
    this.listEl.appendChild(this.bottomSpacer)

    this.container.innerHTML = ''
    this.container.appendChild(this.listEl)

    this.onScrollBound = () => this.render()
    this.scrollContainer.addEventListener('scroll', this.onScrollBound)
  }

  setItems(items: T[]): void {
    this.items = items
    this.render()
  }

  render(): void {
    const totalItems = this.items.length
    const rowFootprint = this.itemHeight + 6
    const totalHeight = totalItems > 0 ? totalItems * rowFootprint - 6 : 0
    this.listEl.style.height = `${totalHeight}px`

    const scrollTop = this.scrollContainer.scrollTop
    const containerHeight = this.scrollContainer.clientHeight || 320

    const startIndex = Math.max(0, Math.floor(scrollTop / rowFootprint) - 1)
    const endIndex = Math.min(totalItems - 1, Math.ceil((scrollTop + containerHeight) / rowFootprint) + 1)

    const visibleItems = this.items.slice(startIndex, endIndex + 1)

    const topSpacerHeight = startIndex * rowFootprint
    const bottomSpacerHeight = Math.max(0, (totalItems - 1 - endIndex) * rowFootprint)

    this.topSpacer.style.height = `${topSpacerHeight}px`
    this.bottomSpacer.style.height = `${bottomSpacerHeight}px`

    this.contentEl.innerHTML = visibleItems.map((item, index) => {
      return this.renderItem(item, startIndex + index)
    }).join('')
  }

  destroy(): void {
    this.scrollContainer.removeEventListener('scroll', this.onScrollBound)
  }
}
