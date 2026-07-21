import { parseScore } from '../config/constants.ts'

/** Returns parsed score or null; toggles `.is-invalid` on the input element. */
export function validateScoreInputEl(input: HTMLInputElement): number | null {
  const raw = input.value.trim()
  if (!raw) {
    input.classList.remove('is-invalid')
    input.removeAttribute('aria-invalid')
    return null
  }
  const score = parseScore(raw)
  const invalid = score === null
  input.classList.toggle('is-invalid', invalid)
  if (invalid) {
    input.setAttribute('aria-invalid', 'true')
  } else {
    input.removeAttribute('aria-invalid')
  }
  return score
}

/** Focus the next score input in document order (cards or table). */
export function focusNextScoreInput(current: HTMLInputElement, root: ParentNode = document): void {
  const selector = current.matches('[data-table-score]')
    ? '[data-table-score]'
    : '[data-score-input]'
  const all = Array.from(root.querySelectorAll<HTMLInputElement>(selector))
  const idx = all.indexOf(current)
  if (idx >= 0 && idx < all.length - 1) {
    const next = all[idx + 1]
    next.focus()
    next.select()
  }
}
