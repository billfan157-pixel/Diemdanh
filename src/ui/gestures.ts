export interface SwipeOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onPullRefresh?: () => void
  threshold?: number
}

export function setupSwipe(element: HTMLElement, options: SwipeOptions): () => void {
  const threshold = options.threshold || 60
  let startX = 0
  let startY = 0
  let distX = 0
  let distY = 0
  let isTracking = false

  const onTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0]
    startX = touch.clientX
    startY = touch.clientY
    distX = 0
    distY = 0
    isTracking = true
  }

  const onTouchMove = (e: TouchEvent) => {
    if (!isTracking) return
    const touch = e.touches[0]
    distX = touch.clientX - startX
    distY = touch.clientY - startY
  }

  const onTouchEnd = () => {
    if (!isTracking) return
    isTracking = false

    const absX = Math.abs(distX)
    const absY = Math.abs(distY)

    // Swipe horizontal
    if (absX > threshold && absX > absY * 1.5) {
      if (distX > 0) {
        options.onSwipeRight?.()
      } else {
        options.onSwipeLeft?.()
      }
      return
    }

    // Pull-to-refresh (swipe down from top)
    if (distY > threshold && absY > absX * 1.5) {
      options.onPullRefresh?.()
    }
  }

  element.addEventListener('touchstart', onTouchStart, { passive: true })
  element.addEventListener('touchmove', onTouchMove, { passive: true })
  element.addEventListener('touchend', onTouchEnd, { passive: true })

  return () => {
    element.removeEventListener('touchstart', onTouchStart)
    element.removeEventListener('touchmove', onTouchMove)
    element.removeEventListener('touchend', onTouchEnd)
  }
}

const VIEW_ORDER = ['cards', 'table', 'rank'] as const

export function nextView(current: string): string {
  const idx = VIEW_ORDER.indexOf(current as typeof VIEW_ORDER[number])
  if (idx === -1 || idx >= VIEW_ORDER.length - 1) return current
  return VIEW_ORDER[idx + 1]
}

export function prevView(current: string): string {
  const idx = VIEW_ORDER.indexOf(current as typeof VIEW_ORDER[number])
  if (idx <= 0) return current
  return VIEW_ORDER[idx - 1]
}
