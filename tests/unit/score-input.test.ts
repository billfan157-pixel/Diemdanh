import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { validateScoreInputEl, focusNextScoreInput } from '../../src/utils/scoreInput.ts'
import { nextView, prevView } from '../../src/ui/gestures.ts'

describe('scoreInput', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    container.innerHTML = `
      <input data-score-input data-sid="s1" data-col="c1" />
      <input data-score-input data-sid="s1" data-col="c2" />
      <input data-table-score data-sid="s2" data-col="c1" />
      <input data-table-score data-sid="s2" data-col="c2" />
    `
  })

  afterEach(() => {
    container.remove()
  })

  describe('validateScoreInputEl', () => {
    it('returns null and clears invalid state for empty input', () => {
      const input = container.querySelector<HTMLInputElement>('[data-score-input]')!
      input.value = ''
      expect(validateScoreInputEl(input)).toBeNull()
      expect(input.classList.contains('is-invalid')).toBe(false)
      expect(input.hasAttribute('aria-invalid')).toBe(false)
    })

    it('accepts valid scores', () => {
      const input = container.querySelector<HTMLInputElement>('[data-score-input]')!
      input.value = '8.5'
      expect(validateScoreInputEl(input)).toBe(8.5)
      expect(input.classList.contains('is-invalid')).toBe(false)
    })

    it('marks invalid scores', () => {
      const input = container.querySelector<HTMLInputElement>('[data-score-input]')!
      input.value = '15'
      expect(validateScoreInputEl(input)).toBeNull()
      expect(input.classList.contains('is-invalid')).toBe(true)
      expect(input.getAttribute('aria-invalid')).toBe('true')
    })
  })

  describe('focusNextScoreInput', () => {
    it('focuses next card score input', () => {
      const inputs = container.querySelectorAll<HTMLInputElement>('[data-score-input]')
      focusNextScoreInput(inputs[0], container)
      expect(document.activeElement).toBe(inputs[1])
    })

    it('focuses next table score input', () => {
      const inputs = container.querySelectorAll<HTMLInputElement>('[data-table-score]')
      focusNextScoreInput(inputs[0], container)
      expect(document.activeElement).toBe(inputs[1])
    })
  })
})

describe('gestures view navigation', () => {
  it('nextView cycles cards → table → rank', () => {
    expect(nextView('cards')).toBe('table')
    expect(nextView('table')).toBe('rank')
    expect(nextView('rank')).toBe('rank')
  })

  it('prevView cycles rank → table → cards', () => {
    expect(prevView('rank')).toBe('table')
    expect(prevView('table')).toBe('cards')
    expect(prevView('cards')).toBe('cards')
  })
})
