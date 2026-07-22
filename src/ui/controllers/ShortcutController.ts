// ============================================================
// Sổ Điểm GL — Global Keyboard Shortcut & Command Palette Controller
// Lit ReactiveController pattern + backward-compat attach/detach
// ============================================================

import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { StateManager } from '../StateManager'
import { SyncManager } from '../../services/sync/SyncManager'
import { NotificationManager } from '../../services/NotificationManager'

export interface ShortcutControllerOptions {
  stateManager: StateManager
  syncManager: SyncManager
  notificationManager: NotificationManager
  getActiveClassId: () => string | null
  renderCurrentView: () => void
  openAddStudent: () => void
  openCommandPalette: (quickSwitcher?: boolean) => void
  openCheatsheetModal: () => void
  closeMobileDrawer: () => void
  handleCommand: (commandId: string) => void
  getRootElement: () => HTMLElement | null
}

export class ShortcutController implements ReactiveController {
  private host: (ReactiveControllerHost & HTMLElement) | null
  private options: ShortcutControllerOptions
  private listeners: Array<{ target: EventTarget; type: string; handler: EventListener }> = []

  constructor(host: (ReactiveControllerHost & HTMLElement) | null, options: ShortcutControllerOptions) {
    this.host = host
    this.options = options
    if (host) host.addController(this)
  }

  hostConnected(): void {
    this.attach()
  }

  hostDisconnected(): void {
    this.detach()
  }

  attach(): void {
    const root = this.host || this.options.getRootElement()

    const keydownHandler = (e: Event) => {
      const ke = e as KeyboardEvent
      const isInput =
        ke.target instanceof HTMLInputElement ||
        ke.target instanceof HTMLTextAreaElement ||
        ke.target instanceof HTMLSelectElement ||
        (ke.target instanceof HTMLElement && ke.target.isContentEditable)

      if (isInput && ke.key !== 'Escape') return

      if (ke.ctrlKey || ke.metaKey) {
        switch (ke.key.toLowerCase()) {
          case 'z':
            ke.preventDefault()
            if (ke.shiftKey) {
              if (this.options.stateManager.redo()) {
                this.options.renderCurrentView()
                this.options.notificationManager.show('Đã làm lại', 'info')
              }
            } else {
              if (this.options.stateManager.undo()) {
                this.options.renderCurrentView()
                this.options.notificationManager.show('Đã hoàn tác', 'info')
              }
            }
            return
          case 'y':
            ke.preventDefault()
            if (this.options.stateManager.redo()) {
              this.options.renderCurrentView()
              this.options.notificationManager.show('Đã làm lại', 'info')
            }
            return
          case 'n':
            ke.preventDefault()
            if (this.options.getActiveClassId()) this.options.openAddStudent()
            return
          case 's':
            ke.preventDefault()
            this.options.syncManager.sync()
            this.options.notificationManager.show('Đã đồng bộ', 'info')
            return
          case 'k':
            ke.preventDefault()
            this.options.openCommandPalette()
            return
          case 'o':
            if (ke.shiftKey) {
              ke.preventDefault()
              this.options.openCommandPalette(true)
            }
            return
        }
      }

      switch (ke.key) {
        case 'Escape': {
          const modalOpen = document.querySelector('.modal-overlay:not(.hidden), gl-modal[open]')
          if (modalOpen) {
            ;(modalOpen as any).open = false
            return
          }
          const r = root || this.options.getRootElement()
          if (r?.querySelector('#sidebar')?.classList.contains('open')) {
            this.options.closeMobileDrawer()
          }
          break
        }
        case '/': {
          ke.preventDefault()
          const r = root || this.options.getRootElement()
          const searchInput = r?.querySelector('#searchInput') as HTMLInputElement
          searchInput?.focus()
          break
        }
        case '?': {
          ke.preventDefault()
          this.options.openCheatsheetModal()
          break
        }
      }
    }

    document.addEventListener('keydown', keydownHandler as EventListener)
    this.listeners.push({ target: document, type: 'keydown', handler: keydownHandler as EventListener })

    const r = root || this.options.getRootElement()
    const palette = r?.querySelector('#commandPalette') as any
    if (palette) {
      const paletteSelectHandler = ((e: Event) => {
        const commandId = (e as CustomEvent).detail.commandId
        this.options.handleCommand(commandId)
      }) as EventListener

      const paletteCloseHandler = (() => {
        palette.open = false
      }) as EventListener

      palette.addEventListener('gl-palette-select', paletteSelectHandler)
      palette.addEventListener('gl-close', paletteCloseHandler)
      this.listeners.push({ target: palette, type: 'gl-palette-select', handler: paletteSelectHandler })
      this.listeners.push({ target: palette, type: 'gl-close', handler: paletteCloseHandler })
    }
  }

  detach(): void {
    for (const { target, type, handler } of this.listeners) {
      target.removeEventListener(type, handler)
    }
    this.listeners = []
  }
}
