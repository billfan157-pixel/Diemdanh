import type { ReactiveController, ReactiveControllerHost } from 'lit'
import type { StateManager } from '../StateManager'
import type { AppState } from '../../services/storage/StorageAdapter.types'

export class StateController implements ReactiveController {
  host: ReactiveControllerHost
  stateManager: StateManager
  private _unsub: (() => void) | null = null

  constructor(host: ReactiveControllerHost, stateManager: StateManager) {
    this.host = host
    this.stateManager = stateManager
    host.addController(this)
  }

  hostConnected(): void {
    this._unsub = this.stateManager.subscribe(() => {
      this.host.requestUpdate()
    })
  }

  hostDisconnected(): void {
    this._unsub?.()
    this._unsub = null
  }

  get state(): Readonly<AppState> {
    return this.stateManager.getState()
  }
}
