// ============================================================
// Sổ Điểm GL — Sidebar, Class List & Touch Gestures Controller
// Lit ReactiveController pattern + backward-compat attach/detach
// ============================================================

import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { StateManager } from '../StateManager'
import { AuthManager } from '../../core/auth/AuthManager'
import { NotificationManager } from '../../services/NotificationManager'

export interface SidebarControllerOptions {
  stateManager: StateManager
  authManager: AuthManager
  notificationManager: NotificationManager
  getRootElement: () => HTMLElement | null
  onSelectClass: (classId: string) => void
  closeMobileDrawer: () => void
  promptDialog: (title: string, message: string, defaultValue?: string) => Promise<string | null>
  refreshClassList: () => void
}

export class SidebarController implements ReactiveController {
  private host: (ReactiveControllerHost & HTMLElement) | null
  private options: SidebarControllerOptions
  private listeners: Array<{ target: EventTarget; type: string; handler: EventListener }> = []

  constructor(host: (ReactiveControllerHost & HTMLElement) | null, options: SidebarControllerOptions) {
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
    if (!root) return

    const setupAccordion = (toggleId: string, accordionId: string, storageKey: string) => {
      const toggle = root.querySelector(`#${toggleId}`)
      if (!toggle) return
      const handler = (() => {
        const accordion = root.querySelector(`#${accordionId}`)
        if (!accordion) return
        const isOpen = accordion.classList.toggle('open')
        toggle.setAttribute('aria-expanded', String(isOpen))
        try { localStorage.setItem(storageKey, isOpen ? '1' : '0') } catch {}
      }) as EventListener
      toggle.addEventListener('click', handler)
      this.listeners.push({ target: toggle, type: 'click', handler })
    }

    setupAccordion('classesToggle', 'classesAccordion', 'classes-accordion-open')
    setupAccordion('dataToggle', 'dataAccordion', 'data-accordion-open')
    setupAccordion('academicToggle', 'academicAccordion', 'academic-accordion-open')
    setupAccordion('systemToggle', 'systemAccordion', 'system-accordion-open')
    setupAccordion('recentClassesToggle', 'recentClassesSection', 'recent-accordion-open')

    const createClassBtn = root.querySelector('#createClassBtn')
    if (createClassBtn) {
      const handler = (() => {
        const nameInput = root.querySelector('#newClassName') as HTMLInputElement
        const yearInput = root.querySelector('#newClassYear') as HTMLInputElement
        const name = nameInput.value.trim()
        const year = yearInput.value.trim()

        if (!name) {
          this.options.notificationManager.show('Vui lòng nhập tên lớp', 'error')
          return
        }

        const newId = this.options.stateManager.createClass(name, year)
        nameInput.value = ''
        yearInput.value = ''
        this.options.notificationManager.show('Đã tạo lớp thành công', 'success')
        this.options.onSelectClass(newId)
      }) as EventListener
      createClassBtn.addEventListener('click', handler)
      this.listeners.push({ target: createClassBtn, type: 'click', handler })
    }
  }

  detach(): void {
    for (const { target, type, handler } of this.listeners) {
      target.removeEventListener(type, handler)
    }
    this.listeners = []
  }
}
