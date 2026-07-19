import { describe, it, expect } from 'vitest'
import { StudentData } from '../../src/services/storage/StorageAdapter.types'
import {
  defaultWeights,
  emptyScores,
  ensureStudentTerms,
  colAvg,
  studentTB,
  studentYearTB,
  classify
} from '../../src/core/calc.ts'

describe('Calculation Engine', () => {
  it('should generate default weights and empty scores structures', () => {
    const weights = defaultWeights()
    expect(weights.khaoKinh).toBe(1)
    expect(weights.kiemTra).toBe(1)

    const scores = emptyScores()
    expect(Array.isArray(scores.khaoKinh)).toBe(true)
    expect(scores.khaoKinh.length).toBe(0)
  })

  it('should calculate column average correctly', () => {
    expect(colAvg([8, 9, 10])).toBe(9)
    expect(colAvg([])).toBeNull()
    expect(colAvg(undefined)).toBeNull()
  })

  it('should compute student term average with weights', () => {
    const student: StudentData = {
      id: 'st-1',
      hoDem: 'Nguyễn',
      ten: 'An',
      scoresByTerm: {
        hk1: {
          khaoKinh: [8, 10], // avg = 9
          kiemTra: [7]        // avg = 7
        },
        weights: {
          khaoKinh: 1,
          kiemTra: 3
        }
      }
    }
    // HK1 weighted average = (9*1 + 7*3) / (1 + 3) = (9 + 21) / 4 = 7.5
    expect(studentTB(student, student.scoresByTerm?.weights, 'hk1')).toBe(7.5)
  })

  it('should compute student yearly average with term weights (HK1 x1, HK2 x2)', () => {
    const student: StudentData = {
      id: 'st-1',
      hoDem: 'Nguyễn',
      ten: 'An',
      scoresByTerm: {
        hk1: {
          khaoKinh: [8], // avg = 8
          kiemTra: [8]    // avg = 8 -> TB = 8
        },
        hk2: {
          khaoKinh: [5], // avg = 5
          kiemTra: [5]    // avg = 5 -> TB = 5
        },
        weights: {
          khaoKinh: 1,
          kiemTra: 1
        }
      }
    }
    // HK1 average = 8, HK2 average = 5
    // Year weighted average = (8*1 + 5*2) / 3 = 18 / 3 = 6
    expect(studentYearTB(student, student.scoresByTerm?.weights)).toBe(6)
  })

  it('should fallback to other term average if one term is missing', () => {
    const student: StudentData = {
      id: 'st-1',
      hoDem: 'Nguyễn',
      ten: 'An',
      scoresByTerm: {
        hk1: {
          khaoKinh: [9] // avg = 9
        },
        weights: {
          khaoKinh: 1
        }
      }
    }
    // HK2 is empty, so should fallback to HK1 average = 9
    expect(studentYearTB(student, student.scoresByTerm?.weights)).toBe(9)
  })

  it('should classify ranks correctly', () => {
    expect(classify(9.5).rank).toBe('rank-xs')
    expect(classify(8.2).rank).toBe('rank-g')
    expect(classify(7.0).rank).toBe('rank-k')
    expect(classify(5.5).rank).toBe('rank-tb')
    expect(classify(4.5).rank).toBe('rank-y')
    expect(classify(null).rank).toBe('rank-none')
  })
})
