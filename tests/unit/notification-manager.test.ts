import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NotificationManager } from '../../src/services/NotificationManager'

describe('NotificationManager', () => {
  let nm: NotificationManager

  beforeEach(() => {
    document.getElementById('toastHost')?.remove()
    document.getElementById('appDialog')?.remove()
    nm = new NotificationManager()
  })

  // ================================================================
  // init
  // ================================================================
  describe('init', () => {
    it('should create toastHost and dialog elements if missing', () => {
      expect(document.getElementById('toastHost')).toBeNull()
      expect(document.getElementById('appDialog')).toBeNull()

      nm.init()

      const host = document.getElementById('toastHost')
      expect(host).not.toBeNull()
      expect(host!.className).toBe('toast-host')

      const dialog = document.getElementById('appDialog')
      expect(dialog).not.toBeNull()
    })

    it('should reuse existing toastHost element', () => {
      const existing = document.createElement('div')
      existing.id = 'toastHost'
      document.body.appendChild(existing)

      nm.init()

      const host = document.getElementById('toastHost')
      expect(host).toBe(existing)
    })
  })

  // ================================================================
  // show (toast) — no fake timers for basic tests
  // ================================================================
  describe('show (synchronous)', () => {
    beforeEach(() => {
      nm.init()
    })

    it('should create a toast element in the host', () => {
      nm.show('Test message')
      const host = document.getElementById('toastHost')!
      expect(host.children.length).toBe(1)
      const toast = host.children[0] as HTMLElement
      expect(toast.classList.contains('toast-item')).toBe(true)
      expect(toast.textContent).toContain('Test message')
    })

    it('should assign correct type class for each type', () => {
      const types: Array<{ type: 'info' | 'success' | 'warning' | 'error'; cls: string }> = [
        { type: 'info', cls: 'toast-info' },
        { type: 'success', cls: 'toast-ok' },
        { type: 'warning', cls: 'toast-warn' },
        { type: 'error', cls: 'toast-err' }
      ]
      for (const { type, cls } of types) {
        nm.show(type, type)
        const toast = document.getElementById('toastHost')!.children[0] as HTMLElement
        expect(toast.classList.contains(cls)).toBe(true)
        toast.remove()
      }
    })

    it('should show title when provided in options', () => {
      nm.show('Message', 'info', { title: 'My Title' })
      const toast = document.getElementById('toastHost')!.children[0] as HTMLElement
      expect(toast.innerHTML).toContain('My Title')
    })

    it('should add action button when action option provided', () => {
      const onClick = vi.fn()
      nm.show('Message', 'info', { action: { label: 'Undo', onClick } })
      const host = document.getElementById('toastHost')!
      const actionBtn = host.querySelector('.toast-action') as HTMLElement
      expect(actionBtn).not.toBeNull()
      expect(actionBtn.textContent).toBe('Undo')
      actionBtn.click()
      expect(onClick).toHaveBeenCalled()
    })
  })

  // ================================================================
  // dismiss (manual, no auto-timer)
  // ================================================================
  describe('dismiss', () => {
    beforeEach(() => {
      nm.init()
    })

    it('should add hiding class', () => {
      nm.show('Test')
      const host = document.getElementById('toastHost')!
      const toast = host.children[0] as HTMLElement
      nm.dismiss(toast)
      expect(toast.classList.contains('hiding')).toBe(true)
    })

    it('should not dismiss twice', () => {
      nm.show('Test')
      const host = document.getElementById('toastHost')!
      const toast = host.children[0] as HTMLElement
      nm.dismiss(toast)
      nm.dismiss(toast) // should be no-op
      expect(toast.classList.contains('hiding')).toBe(true)
    })
  })

  // ================================================================
  // confirm (dialog)
  // ================================================================
  describe('confirm', () => {
    beforeEach(() => {
      nm.init()
    })

    it('should show dialog overlay and resolve when OK clicked', async () => {
      const promise = nm.confirm('Are you sure?')

      const overlay = document.getElementById('appDialog')!
      expect(overlay.classList.contains('hidden')).toBe(false)
      expect(overlay.textContent).toContain('Are you sure?')

      const okBtn = document.getElementById('appDialogOk')!
      okBtn.click()

      const result = await promise
      expect(result).toBe(true)
    })

    it('should resolve false when Cancel clicked', async () => {
      const promise = nm.confirm('Sure?')

      const cancelBtn = document.getElementById('appDialogCancel')!
      cancelBtn.click()

      const result = await promise
      expect(result).toBe(false)
    })

    it('should resolve false on backdrop click', async () => {
      const promise = nm.confirm('Sure?')

      const overlay = document.getElementById('appDialog')!
      overlay.click()

      const result = await promise
      expect(result).toBe(false)
    })

    it('should reject previous pending dialog on new confirm call', async () => {
      const p1 = nm.confirm('First')

      // Second confirm should reject the first promise
      const p2 = nm.confirm('Second')

      document.getElementById('appDialogOk')!.click()

      expect(await p1).toBe(false)
      expect(await p2).toBe(true)
    })

    it('should apply correct class for danger type', () => {
      nm.confirm('Delete?', { type: 'danger' })

      const dialogPanel = document.querySelector('.dialog-panel')!
      expect(dialogPanel.classList.contains('dialog-type-danger')).toBe(true)

      const okBtn = document.getElementById('appDialogOk')!
      expect(okBtn.classList.contains('btn-danger')).toBe(true)
      expect(okBtn.textContent).toBe('Xóa')
    })
  })

  // ================================================================
  // alert
  // ================================================================
  describe('alert', () => {
    beforeEach(() => {
      nm.init()
    })

    it('should resolve after OK click', async () => {
      const promise = nm.alert('Something happened')

      const okBtn = document.getElementById('appDialogOk')!
      okBtn.click()

      await expect(promise).resolves.toBeUndefined()
    })
  })

  // ================================================================
  // escapeHtml
  // ================================================================
  describe('escapeHtml', () => {
    it('should escape HTML entities', () => {
      const escaped = (nm as any).escapeHtml('<script>alert("x")</script>')
      expect(escaped).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;')
    })

    it('should escape single quotes', () => {
      const escaped = (nm as any).escapeHtml("it's")
      expect(escaped).toBe('it&#039;s')
    })
  })

  // ================================================================
  // rebindDialog
  // ================================================================
  describe('rebindDialog', () => {
    beforeEach(() => {
      nm.init()
    })

    it('should handle missing dialog gracefully', () => {
      document.getElementById('appDialog')?.remove()
      expect(() => nm.rebindDialog()).not.toThrow()
    })
  })
})
