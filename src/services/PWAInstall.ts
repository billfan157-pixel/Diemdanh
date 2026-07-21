export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let installEvent: BeforeInstallPromptEvent | null = null
let listeners: Array<() => void> = []

export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  return installEvent
}

export function setInstallPrompt(e: BeforeInstallPromptEvent | null): void {
  installEvent = e
  listeners.forEach(fn => fn())
}

export async function triggerInstall(): Promise<boolean> {
  if (!installEvent) return false
  installEvent.prompt()
  const result = await installEvent.userChoice
  installEvent = null
  listeners.forEach(fn => fn())
  return result.outcome === 'accepted'
}

export function onInstallChanged(fn: () => void): () => void {
  listeners.push(fn)
  return () => {
    listeners = listeners.filter(l => l !== fn)
  }
}
