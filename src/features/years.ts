// ============================================================
// Year comparison helpers (Phase 3.2)
// ============================================================

import { ClassData, StudentData } from '../services/storage/StorageAdapter.types'
import { resolveClassColumns } from '../config/columns.ts'
import { studentYearTB, classify } from '../core/calc.ts'
import { displayName } from '../config/constants.ts'

export interface YearClassSummary {
  classId: string
  className: string
  year: string
  studentCount: number
  avgTB: number | null
  completePercent: number
  rankCounts: Record<string, number>
  isRed: boolean
}

export interface YearCompareRow {
  metric: string
  yearA: string | number | null
  yearB: string | number | null
}

export function summarizeClass(cls: ClassData): YearClassSummary {
  const cols = resolveClassColumns(cls)
  const tbs = cls.students
    .map(s => studentYearTB(s, cls.weights, cols))
    .filter((tb): tb is number => tb !== null)

  const rankCounts: Record<string, number> = { xs: 0, g: 0, k: 0, tb: 0, y: 0, none: 0 }
  for (const s of cls.students) {
    const tb = studentYearTB(s, cls.weights, cols)
    const rank = classify(tb).rank.replace('rank-', '')
    rankCounts[rank] = (rankCounts[rank] || 0) + 1
  }

  const complete = cls.students.filter(s => {
    const hk1 = s.scoresByTerm?.hk1
    const hk2 = s.scoresByTerm?.hk2
    if (!hk1 || !hk2) return false
    return cols.every(c => (hk1[c.key]?.length || 0) > 0 && (hk2[c.key]?.length || 0) > 0)
  }).length

  const avgTB = tbs.length ? tbs.reduce((a, b) => a + b, 0) / tbs.length : null
  const completePercent = cls.students.length
    ? Math.round((complete / cls.students.length) * 100)
    : 0

  return {
    classId: cls.id,
    className: cls.name,
    year: cls.year,
    studentCount: cls.students.length,
    avgTB,
    completePercent,
    rankCounts,
    isRed: (avgTB !== null && avgTB < 5) || completePercent < 50
  }
}

export function summarizeYear(classes: ClassData[], year: string): {
  year: string
  classCount: number
  studentCount: number
  avgTB: number | null
  completePercent: number
  redClasses: number
  classes: YearClassSummary[]
} {
  const yearClasses = classes.filter(c => c.year === year)
  const summaries = yearClasses.map(summarizeClass)
  const allTBs = summaries.map(s => s.avgTB).filter((t): t is number => t !== null)
  const studentCount = summaries.reduce((n, s) => n + s.studentCount, 0)
  const completeWeighted = summaries.reduce((n, s) => n + s.completePercent * s.studentCount, 0)

  return {
    year,
    classCount: yearClasses.length,
    studentCount,
    avgTB: allTBs.length ? allTBs.reduce((a, b) => a + b, 0) / allTBs.length : null,
    completePercent: studentCount ? Math.round(completeWeighted / studentCount) : 0,
    redClasses: summaries.filter(s => s.isRed).length,
    classes: summaries.sort((a, b) => (b.avgTB ?? -1) - (a.avgTB ?? -1))
  }
}

export function compareYears(classes: ClassData[], yearA: string, yearB: string): YearCompareRow[] {
  const a = summarizeYear(classes, yearA)
  const b = summarizeYear(classes, yearB)
  return [
    { metric: 'Số lớp', yearA: a.classCount, yearB: b.classCount },
    { metric: 'Số học viên', yearA: a.studentCount, yearB: b.studentCount },
    { metric: 'TB cả năm', yearA: a.avgTB != null ? a.avgTB.toFixed(2) : '—', yearB: b.avgTB != null ? b.avgTB.toFixed(2) : '—' },
    { metric: '% đủ điểm', yearA: `${a.completePercent}%`, yearB: `${b.completePercent}%` },
    { metric: 'Lớp cần quan tâm', yearA: a.redClasses, yearB: b.redClasses }
  ]
}

export function topStudentsAcrossClasses(
  classes: ClassData[],
  limit = 10
): Array<{ student: StudentData; className: string; yearTB: number }> {
  const rows: Array<{ student: StudentData; className: string; yearTB: number }> = []
  for (const c of classes) {
    const cols = resolveClassColumns(c)
    for (const s of c.students) {
      const tb = studentYearTB(s, c.weights, cols)
      if (tb !== null) rows.push({ student: s, className: c.name, yearTB: tb })
    }
  }
  return rows.sort((a, b) => b.yearTB - a.yearTB).slice(0, limit)
}

export function studentDisplay(s: StudentData): string {
  return displayName(s)
}
