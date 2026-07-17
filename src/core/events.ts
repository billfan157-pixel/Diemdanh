// ============================================================
// Sổ Điểm GL — Event Emitter Base Class
// ============================================================

export class EventEmitter {
  private events: Map<string, Set<Function>> = new Map()

  on(event: string, listener: Function): this {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }
    this.events.get(event)!.add(listener)
    return this
  }

  off(event: string, listener: Function): this {
    const listeners = this.events.get(event)
    if (listeners) {
      listeners.delete(listener)
    }
    return this
  }

  once(event: string, listener: Function): this {
    const onceWrapper = (...args: unknown[]) => {
      this.off(event, onceWrapper)
      listener(...args)
    }
    return this.on(event, onceWrapper)
  }

  emit(event: string, ...args: unknown[]): boolean {
    const listeners = this.events.get(event)
    if (!listeners || listeners.size === 0) return false

    for (const listener of listeners) {
      try {
        listener(...args)
      } catch (error) {
        console.error(`Error in event listener for "${event}":`, error)
      }
    }
    return true
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event)
    } else {
      this.events.clear()
    }
    return this
  }

  listenerCount(event: string): number {
    return this.events.get(event)?.size || 0
  }
}