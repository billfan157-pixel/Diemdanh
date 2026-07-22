// ============================================================
// Sổ Điểm GL — Performance Utilities
// ============================================================

export function rafThrottle<T extends (...args: any[]) => any>(fn: T): T & { cancel(): void } {
  let ticket: number | null = null
  let lastArgs: any[] = []
  let lastThis: any = null

  const throttled = function (this: any, ...args: any[]) {
    lastArgs = args
    lastThis = this
    if (ticket === null) {
      ticket = requestAnimationFrame(() => {
        ticket = null
        fn.apply(lastThis, lastArgs)
      })
    }
  } as any

  throttled.cancel = () => {
    if (ticket !== null) {
      cancelAnimationFrame(ticket)
      ticket = null
    }
  }

  return throttled
}
