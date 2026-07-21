import { describe, it, expect } from 'vitest'
import { generateId } from '../../src/utils/id'

describe('generateId', () => {
  it('should generate string with prefix and underscore', () => {
    const id = generateId('cls')
    expect(id).toMatch(/^cls_[a-z0-9]+_[a-z0-9]+$/)
  })

  it('should generate different IDs on successive calls', () => {
    const id1 = generateId('st')
    const id2 = generateId('st')
    expect(id1).not.toBe(id2)
  })

  it('should use default prefix "id" when no prefix given', () => {
    const id = generateId()
    expect(id).toMatch(/^id_/)
  })
})
