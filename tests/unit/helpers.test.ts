import { describe, it, expect } from 'vitest'
import { escapeHtml, fmt, tbBarFill, scoreClass, parseCSV } from '../../src/views/helpers.ts'

describe('helpers', () => {

  describe('escapeHtml', () => {
    it('should escape & < > " \'', () => {
      expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#039;')
    })
    it('should return plain text unchanged', () => {
      expect(escapeHtml('hello world')).toBe('hello world')
    })
    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('')
    })
  })

  describe('fmt', () => {
    it('should format number with default 2 decimals', () => {
      expect(fmt(7.5)).toBe('7.50')
    })
    it('should return emdash for null', () => {
      expect(fmt(null)).toBe('—')
    })
    it('should return emdash for NaN', () => {
      expect(fmt(NaN)).toBe('—')
    })
    it('should format with custom decimals', () => {
      expect(fmt(7.567, 1)).toBe('7.6')
    })
    it('should format zero correctly', () => {
      expect(fmt(0)).toBe('0.00')
    })
  })

  describe('tbBarFill', () => {
    it('should calculate percentage', () => {
      expect(tbBarFill(5, 10)).toBe(50)
    })
    it('should return 0 for no filled', () => {
      expect(tbBarFill(0, 10)).toBe(0)
    })
    it('should handle totalCols being 0', () => {
      expect(tbBarFill(5, 0)).toBe(500)
    })
  })

  describe('scoreClass', () => {
    it('should return score-none for null', () => {
      expect(scoreClass(null)).toBe('score-none')
    })
    it('should return score-xs for tb >= 9', () => {
      expect(scoreClass(9.5)).toBe('score-xs')
      expect(scoreClass(9)).toBe('score-xs')
    })
    it('should return score-g for tb >= 8', () => {
      expect(scoreClass(8.5)).toBe('score-g')
      expect(scoreClass(8)).toBe('score-g')
    })
    it('should return score-k for tb >= 6.5', () => {
      expect(scoreClass(7.2)).toBe('score-k')
      expect(scoreClass(6.5)).toBe('score-k')
    })
    it('should return score-tb for tb >= 5', () => {
      expect(scoreClass(5.8)).toBe('score-tb')
      expect(scoreClass(5)).toBe('score-tb')
    })
    it('should return score-y for tb < 5', () => {
      expect(scoreClass(4.9)).toBe('score-y')
      expect(scoreClass(0)).toBe('score-y')
    })
  })

  describe('parseCSV', () => {
    it('should parse simple CSV', () => {
      const result = parseCSV('a,b,c\n1,2,3')
      expect(result).toEqual([['a', 'b', 'c'], ['1', '2', '3']])
    })
    it('should handle quoted fields', () => {
      const result = parseCSV('"hello, world",b')
      expect(result).toEqual([['hello, world', 'b']])
    })
    it('should handle escaped quotes', () => {
      const result = parseCSV('"say ""hi""",b')
      expect(result).toEqual([['say "hi"', 'b']])
    })
    it('should skip BOM', () => {
      const result = parseCSV('\uFEFFa,b\n1,2')
      expect(result).toEqual([['a', 'b'], ['1', '2']])
    })
    it('should handle empty lines', () => {
      const result = parseCSV('a,b\n\n1,2')
      expect(result).toEqual([['a', 'b'], ['1', '2']])
    })
    it('should handle \\r only line endings (old Mac)', () => {
      const result = parseCSV('a,b\r1,2')
      expect(result).toEqual([['a', 'b'], ['1', '2']])
    })
    it('should handle trailing newline', () => {
      const result = parseCSV('a,b\n1,2\n')
      expect(result).toEqual([['a', 'b'], ['1', '2']])
    })
    it('should handle single field', () => {
      const result = parseCSV('hello')
      expect(result).toEqual([['hello']])
    })
  })

})
