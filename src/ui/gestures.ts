export interface SwipeOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onPullRefresh?: () => void
  threshold?: number
  /** Skip gesture when touch starts on these elements */
  ignoreSelector?: string
}

const DEFAULT_IGNORE = 'input, textarea, select, button, a, [contenteditable], .chip button'

function shouldIgnore(target: EventTarget | null, ignoreSelector: string): boolean {
  const el = target as HTMLElement
  return !!el?.closest?.(ignoreSelector)
}

export function setupSwipe(element: HTMLElement, options: SwipeOptions): () => void {
  const threshold = options.threshold ?? 60
  const ignoreSelector = options.ignoreSelector ?? DEFAULT_IGNORE
  let startX = 0
  let startY = 0
  let distX = 0
  let distY = 0
  let isTracking = false
  let ignored = false

  const onTouchStart = (e: TouchEvent) => {
    ignored = shouldIgnore(e.target, ignoreSelector)
    if (ignored) return
    const touch = e.touches[0]
    startX = touch.clientX
    startY = touch.clientY
    distX = 0
    distY = 0
    isTracking = true
  }

  const onTouchMove = (e: TouchEvent) => {
    if (!isTracking || ignored) return
    const touch = e.touches[0]
    distX = touch.clientX - startX
    distY = touch.clientY - startY
  }

  const onTouchEnd = () => {
    if (!isTracking || ignored) {
      isTracking = false
      ignored = false
      return
    }
    isTracking = false
    ignored = false

    const absX = Math.abs(distX)
    const absY = Math.abs(distY)

    if (absX > threshold && absX > absY * 1.5) {
      if (distX > 0) {
        options.onSwipeRight?.()
      } else {
        options.onSwipeLeft?.()
      }
      return
    }

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

export interface ItemSwipeOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  threshold?: number
}

/** Horizontal swipe on a single element (e.g. score cell or student card). */
export function setupItemSwipe(element: HTMLElement, options: ItemSwipeOptions): () => void {
  const threshold = options.threshold ?? 50
  let startX = 0
  let startY = 0
  let distX = 0
  let distY = 0
  let tracking = false

  const onStart = (e: TouchEvent) => {
    if (shouldIgnore(e.target, 'input, textarea, select, button')) return
    const touch = e.touches[0]
    startX = touch.clientX
    startY = touch.clientY
    distX = 0
    distY = 0
    tracking = true
    element.classList.add('is-swiping')
  }

  const onMove = (e: TouchEvent) => {
    if (!tracking) return
    const touch = e.touches[0]
    distX = touch.clientX - startX
    distY = touch.clientY - startY
    if (Math.abs(distX) > 8 && Math.abs(distX) > Math.abs(distY)) {
      element.style.transform = `translateX(${distX * 0.35}px)`
    }
  }

  const onEnd = () => {
    if (!tracking) return
    tracking = false
    element.style.transform = ''
    element.classList.remove('is-swiping')

    const absX = Math.abs(distX)
    const absY = Math.abs(distY)
    if (absX > threshold && absX > absY * 1.2) {
      if (distX > 0) {
        options.onSwipeRight?.()
      } else {
        options.onSwipeLeft?.()
      }
    }
  }

  element.addEventListener('touchstart', onStart, { passive: true })
  element.addEventListener('touchmove', onMove, { passive: true })
  element.addEventListener('touchend', onEnd, { passive: true })
  element.addEventListener('touchcancel', onEnd, { passive: true })

  return () => {
    element.removeEventListener('touchstart', onStart)
    element.removeEventListener('touchmove', onMove)
    element.removeEventListener('touchend', onEnd)
    element.removeEventListener('touchcancel', onEnd)
    element.style.transform = ''
    element.classList.remove('is-swiping')
  }
}

export interface LongPressOptions {
  delay?: number
  /** Movement tolerance in px before canceling */
  tolerance?: number
}

export function setupLongPress(
  element: HTMLElement,
  callback: (e: TouchEvent) => void,
  options?: LongPressOptions
): () => void {
  const delay = options?.delay ?? 500
  const tolerance = options?.tolerance ?? 10
  let timer: ReturnType<typeof setTimeout> | null = null
  let startX = 0
  let startY = 0

  const clear = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    element.classList.remove('is-long-pressing')
  }

  const onStart = (e: TouchEvent) => {
    if (shouldIgnore(e.target, 'input, textarea, select, button')) return
    const touch = e.touches[0]
    startX = touch.clientX
    startY = touch.clientY
    element.classList.add('is-long-pressing')
    timer = setTimeout(() => {
      element.classList.remove('is-long-pressing')
      callback(e)
    }, delay)
  }

  const onMove = (e: TouchEvent) => {
    if (!timer) return
    const touch = e.touches[0]
    if (Math.abs(touch.clientX - startX) > tolerance || Math.abs(touch.clientY - startY) > tolerance) {
      clear()
    }
  }

  const onEnd = () => {
    clear()
  }

  element.addEventListener('touchstart', onStart, { passive: true })
  element.addEventListener('touchmove', onMove, { passive: true })
  element.addEventListener('touchend', onEnd, { passive: true })
  element.addEventListener('touchcancel', onEnd, { passive: true })

  return () => {
    clear()
    element.removeEventListener('touchstart', onStart)
    element.removeEventListener('touchmove', onMove)
    element.removeEventListener('touchend', onEnd)
    element.removeEventListener('touchcancel', onEnd)
    element.classList.remove('is-long-pressing')
  }
}

export interface PullRefreshOptions {
  onRefresh: () => void
  threshold?: number
}

/** Pull-to-refresh with visual indicator on a scroll container. */
export function setupPullRefresh(container: HTMLElement, options: PullRefreshOptions): () => void {
  const threshold = options.threshold ?? 70
  let startY = 0
  let pulling = false
  let indicator: HTMLElement | null = null

  const ensureIndicator = (): HTMLElement => {
    if (!indicator) {
      indicator = document.createElement('div')
      indicator.className = 'pull-refresh-indicator'
      indicator.setAttribute('aria-hidden', 'true')
      indicator.innerHTML = '<span class="pull-refresh-spinner"></span><span class="pull-refresh-label">Kéo để làm mới</span>'
      container.prepend(indicator)
    }
    return indicator
  }

  const onStart = (e: TouchEvent) => {
    if (shouldIgnore(e.target, DEFAULT_IGNORE)) return
    if (container.scrollTop > 0) return
    startY = e.touches[0].clientY
    pulling = true
  }

  const onMove = (e: TouchEvent) => {
    if (!pulling) return
    const dist = e.touches[0].clientY - startY
    if (dist <= 0) {
      ensureIndicator().classList.remove('is-visible', 'is-ready')
      return
    }
    const el = ensureIndicator()
    el.classList.add('is-visible')
    el.classList.toggle('is-ready', dist >= threshold)
    el.style.setProperty('--pull-offset', `${Math.min(dist, threshold * 1.5)}px`)
  }

  const onEnd = (e: TouchEvent) => {
    if (!pulling) return
    pulling = false
    const dist = e.changedTouches[0].clientY - startY
    const el = indicator
    if (el) {
      el.classList.remove('is-visible', 'is-ready')
      el.style.removeProperty('--pull-offset')
    }
    if (dist >= threshold && container.scrollTop <= 0) {
      options.onRefresh()
    }
  }

  container.addEventListener('touchstart', onStart, { passive: true })
  container.addEventListener('touchmove', onMove, { passive: true })
  container.addEventListener('touchend', onEnd, { passive: true })

  return () => {
    container.removeEventListener('touchstart', onStart)
    container.removeEventListener('touchmove', onMove)
    container.removeEventListener('touchend', onEnd)
    indicator?.remove()
    indicator = null
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
