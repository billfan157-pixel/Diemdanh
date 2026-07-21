const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export interface FocusTrap {
  destroy(): void
}

export function createFocusTrap(container: HTMLElement): FocusTrap {
  const previouslyFocused = document.activeElement as HTMLElement | null

  const firstFocusable = container.querySelector<HTMLElement>(FOCUSABLE)
  if (firstFocusable) {
    firstFocusable.focus()
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return
    if (!container.isConnected) return

    const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE)
    if (!focusable.length) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  document.addEventListener('keydown', handleKeyDown)

  return {
    destroy() {
      document.removeEventListener('keydown', handleKeyDown)
      if (previouslyFocused && previouslyFocused.isConnected) {
        previouslyFocused.focus()
      }
    }
  }
}
