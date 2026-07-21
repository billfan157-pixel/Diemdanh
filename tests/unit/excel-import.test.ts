import { describe, it, expect, vi } from 'vitest'
import {
  readExcelFile,
  detectTerm,
  parseExcelSheet,
  parseStudentList,
  applyImportedRows,
  ExcelImportResult
} from '../../src/services/import/excelImport'
import { ClassData } from '../../src/services/storage/StorageAdapter.types'

// Mock xlsx
vi.mock('xlsx', () => {
  return {
    default: {
      read: vi.fn(),
      utils: {
        sheet_to_json: vi.fn()
      }
    },
    read: vi.fn(),
    utils: {
      sheet_to_json: vi.fn()
    }
  }
})

import * as XLSX from 'xlsx'

describe('excelImport', () => {
  // ================================================================
  // detectTerm
  // ================================================================
  describe('detectTerm', () => {
    it('should detect HK1 from various formats', () => {
      expect(detectTerm('HK1')).toBe('hk1')
      expect(detectTerm('Học kỳ 1')).toBe('hk1')
      expect(detectTerm('hk1_scores')).toBe('hk1')
    })

    it('should detect HK2 from various formats', () => {
      expect(detectTerm('HK2')).toBe('hk2')
      expect(detectTerm('Học kỳ 2')).toBe('hk2')
      expect(detectTerm('sheet_hk2')).toBe('hk2')
    })

    it('should return null for unrecognized sheet names', () => {
      expect(detectTerm('Sheet1')).toBeNull()
      expect(detectTerm('data')).toBeNull()
      expect(detectTerm('')).toBeNull()
    })
  })

  // ================================================================
  // readExcelFile
  // ================================================================
  describe('readExcelFile', () => {
    it('should handle file read errors gracefully', async () => {
      const badFile = new File(['not an excel file'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const result = await readExcelFile(badFile)
      expect(result.sheets).toEqual({})
      expect(result.errors.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ================================================================
  // parseExcelSheet
  // ================================================================
  describe('parseExcelSheet', () => {
    function makeClass(): ClassData {
      return {
        id: 'cls-1',
        name: 'Lớp 1',
        year: '2025',
        columns: [
          { key: 'khaoKinh', short: 'KK', label: 'Khảo Kinh', defaultWeight: 1 },
          { key: 'thuocBai', short: 'TB', label: 'Thuộc Bài', defaultWeight: 1 }
        ],
        weights: { khaoKinh: 1, thuocBai: 1 },
        students: [],
        createdAt: 100,
        updatedAt: 100,
        rev: 1
      }
    }

    it('should parse rows with matched columns', () => {
      const cls = makeClass()
      const rows = [
        ['Tên Thánh', 'Họ đệm', 'Tên', 'Khảo Kinh', 'Thuộc Bài'],
        ['Anna', 'Nguyễn', 'An', '8', '7'],
        ['Phêrô', 'Trần', 'Bình', '9', '8']
      ]

      const result = parseExcelSheet('Sheet1', rows, cls, 'hk1')
      expect(result.ok).toBe(true)
      expect(result.validRows).toBe(2)
      expect(result.totalRows).toBe(2)
      expect(result.rows[0].tenThanh).toBe('Anna')
      expect(result.rows[0].scores.khaoKinh).toEqual([8])
      expect(result.rows[0].scores.thuocBai).toEqual([7])
    })

    it('should handle rows with empty cells', () => {
      const cls = makeClass()
      const rows = [
        ['Tên Thánh', 'Họ đệm', 'Tên', 'Khảo Kinh'],
        ['Anna', 'Nguyễn', 'An', ''],
        ['Phêrô', 'Trần', 'Bình', '8']
      ]

      const result = parseExcelSheet('Sheet1', rows, cls, 'hk1')
      expect(result.ok).toBe(true)
      expect(result.rows[0].scores.khaoKinh).toEqual([])
      expect(result.rows[1].scores.khaoKinh).toEqual([8])
    })

    it('should report errors when no header columns match', () => {
      const cls = makeClass()
      const rows = [
        ['Column1', 'Column2', 'Column3'],
        ['A', 'B', '8']
      ]

      const result = parseExcelSheet('Sheet1', rows, cls, 'hk1')
      expect(result.ok).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(1)
    })

    it('should support comma as decimal separator', () => {
      const cls = makeClass()
      const rows = [
        ['Tên Thánh', 'Họ đệm', 'Tên', 'Khảo Kinh'],
        ['Anna', 'Nguyễn', 'An', '8,5']
      ]

      const result = parseExcelSheet('Sheet1', rows, cls, 'hk1')
      expect(result.rows[0].scores.khaoKinh).toEqual([8.5])
    })

    it('should skip empty rows', () => {
      const cls = makeClass()
      const rows = [
        ['Tên Thánh', 'Họ đệm', 'Tên', 'Khảo Kinh'],
        ['Anna', 'Nguyễn', 'An', '8'],
        ['', '', '', ''],
        ['Phêrô', 'Trần', 'Bình', '9']
      ]

      const result = parseExcelSheet('Sheet1', rows, cls, 'hk1')
      expect(result.validRows).toBe(2)
      expect(result.rows.length).toBe(2)
    })

    it('should return matchedCols and unmatchedCols details', () => {
      const cls = makeClass()
      const rows = [
        ['Tên Thánh', 'Họ đệm', 'Tên', 'Khảo Kinh', 'Môn khác'],
        ['Anna', 'Nguyễn', 'An', '8', '7']
      ]

      const result = parseExcelSheet('Sheet1', rows, cls, 'hk1')
      expect(result.matchedCols.length).toBeGreaterThanOrEqual(1)
      expect(result.unmatchedCols.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ================================================================
  // parseStudentList
  // ================================================================
  describe('parseStudentList', () => {
    it('should parse rows into StudentListRow array', () => {
      const rows = [
        ['Tên Thánh', 'Họ đệm', 'Tên', 'Lớp'],
        ['Anna', 'Nguyễn', 'An', 'Lớp 1A'],
        ['Phêrô', 'Trần', 'Bình', 'Lớp 1B']
      ]

      const result = parseStudentList(rows)
      expect(result.validRows).toBe(2)
      expect(result.rows[0].tenThanh).toBe('Anna')
      expect(result.rows[0].lop).toBe('Lớp 1A')
      expect(result.detectedClasses).toEqual(['Lớp 1A', 'Lớp 1B'])
    })

    it('should return error when no name columns found', () => {
      const rows = [
        ['STT', 'Score'],
        ['1', '8']
      ]

      const result = parseStudentList(rows)
      expect(result.validRows).toBe(0)
      expect(result.errors.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle less than 2 rows', () => {
      const rows = [['Header']]
      const result = parseStudentList(rows)
      expect(result.validRows).toBe(0)
      expect(result.errors.length).toBeGreaterThanOrEqual(1)
    })

    it('should skip rows without name', () => {
      const rows = [
        ['Tên Thánh', 'Họ đệm', 'Tên'],
        ['', '', ''],
        ['Anna', 'Nguyễn', 'An']
      ]

      const result = parseStudentList(rows)
      expect(result.validRows).toBe(1)
    })
  })

  // ================================================================
  // applyImportedRows
  // ================================================================
  describe('applyImportedRows', () => {
    function makeClass(students?: any[]): ClassData {
      return {
        id: 'cls-1',
        name: 'Lớp 1',
        year: '2025',
        columns: [
          { key: 'khaoKinh', short: 'KK', label: 'Khảo Kinh', defaultWeight: 1 },
          { key: 'thuocBai', short: 'TB', label: 'Thuộc Bài', defaultWeight: 1 }
        ],
        weights: { khaoKinh: 1, thuocBai: 1 },
        students: students || [],
        createdAt: 100,
        updatedAt: 100,
        rev: 1
      }
    }

    it('should merge scores into existing students matching by name', () => {
      const existing = [{
        id: 'st-1',
        tenThanh: 'Anna',
        hoDem: 'Nguyễn',
        ten: 'An',
        name: '', maHV: '', ngaySinh: '', gioiTinh: '', tenPhuHuynh: '',
        sdPhuHuynh: '', diaChi: '', email: '', ghiChu: '',
        scoresByTerm: { hk1: { khaoKinh: [8], thuocBai: [] }, hk2: {} } as any,
        learningLog: [],
        createdAt: 100, updatedAt: 100
      }]

      const cls = makeClass(existing)
      const imported = [
        { tenThanh: 'Anna', hoDem: 'Nguyễn', ten: 'An', scores: { khaoKinh: [9], thuocBai: [7] }, ghiChu: '' }
      ]

      const result = applyImportedRows(cls, imported, 'hk1')
      expect(result.length).toBe(1)
      expect(result[0].scoresByTerm.hk1.khaoKinh).toEqual([8, 9]) // appended
      expect(result[0].scoresByTerm.hk1.thuocBai).toEqual([7])
    })

    it('should create new students if no match found', () => {
      const cls = makeClass()
      const imported = [
        { tenThanh: 'Phêrô', hoDem: 'Trần', ten: 'Bình', scores: { khaoKinh: [9] }, ghiChu: '' }
      ]

      const result = applyImportedRows(cls, imported, 'hk1')
      expect(result.length).toBe(1)
      expect(result[0].id).toBeDefined()
      expect(result[0].ten).toBe('Bình')
    })

    it('should overwrite scores when overwrite=true', () => {
      const existing = [{
        id: 'st-1',
        tenThanh: 'Anna', hoDem: 'Nguyễn', ten: 'An',
        name: '', maHV: '', ngaySinh: '', gioiTinh: '', tenPhuHuynh: '',
        sdPhuHuynh: '', diaChi: '', email: '', ghiChu: '',
        scoresByTerm: { hk1: { khaoKinh: [8], thuocBai: [] }, hk2: {} } as any,
        learningLog: [],
        createdAt: 100, updatedAt: 100
      }]

      const cls = makeClass(existing)
      const imported = [
        { tenThanh: 'Anna', hoDem: 'Nguyễn', ten: 'An', scores: { khaoKinh: [10] }, ghiChu: '' }
      ]

      const result = applyImportedRows(cls, imported, 'hk1', { overwrite: true })
      expect(result[0].scoresByTerm.hk1.khaoKinh).toEqual([10]) // replaced
    })

    it('should update ghiChu if imported has it and existing does not', () => {
      const existing = [{
        id: 'st-1',
        tenThanh: 'Anna', hoDem: 'Nguyễn', ten: 'An',
        name: '', maHV: '', ngaySinh: '', gioiTinh: '', tenPhuHuynh: '',
        sdPhuHuynh: '', diaChi: '', email: '', ghiChu: '',
        scoresByTerm: { hk1: {}, hk2: {} } as any,
        learningLog: [],
        createdAt: 100, updatedAt: 100
      }]

      const cls = makeClass(existing)
      const imported = [
        { tenThanh: 'Anna', hoDem: 'Nguyễn', ten: 'An', scores: {}, ghiChu: 'Chăm chỉ' }
      ]

      const result = applyImportedRows(cls, imported, 'hk1')
      expect(result[0].ghiChu).toBe('Chăm chỉ')
    })
  })
})
