// ============================================================
// Sổ Điểm GL — Patch Sync Parser
// ============================================================

import { Patch } from 'immer'
import { AppState } from '../storage/StorageAdapter.types'

export interface SyncOp {
  table: 'classes' | 'students' | 'scores' | 'learning_logs'
  action: 'insert' | 'update' | 'delete'
  id: string
  data?: any
}

export function parsePatchesToOps(oldState: AppState, newState: AppState, patches: Patch[]): SyncOp[] {
  const ops: SyncOp[] = []

  for (const patch of patches) {
    const { op, path } = patch
    if (path[0] !== 'classes') continue

    const classIdx = path[1] as number
    if (typeof classIdx !== 'number') continue

    // 1. Class level operations
    if (path.length === 2) {
      // Path: ["classes", classIdx]
      if (op === 'add') {
        const cls = newState.classes[classIdx]
        if (cls) {
          ops.push({
            table: 'classes',
            action: 'insert',
            id: cls.id,
            data: {
              id: cls.id,
              name: cls.name,
              year: cls.year,
              weights: cls.weights,
              rev: cls.rev || 1
            }
          })
          
          // Also insert all students in that class if any
          for (const s of cls.students || []) {
            ops.push({
              table: 'students',
              action: 'insert',
              id: s.id,
              data: {
                id: s.id,
                class_id: cls.id,
                ten_thanh: s.tenThanh || '',
                ho_dem: s.hoDem || '',
                ten: s.ten || '',
                name: s.name || '',
                ma_hv: s.maHV || '',
                ngay_sinh: s.ngaySinh || '',
                gioi_tinh: s.gioiTinh || '',
                ten_phu_huynh: s.tenPhuHuynh || '',
                sd_phu_huynh: s.sdPhuHuynh || '',
                dia_chi: s.diaChi || '',
                email: s.email || '',
                ghi_chu: s.ghiChu || '',
                rev: s.rev || 1
              }
            })
            
            // Insert scores
            for (const term of ['hk1', 'hk2'] as const) {
              const ts = s.scoresByTerm[term]
              if (ts) {
                for (const col of Object.keys(ts)) {
                  const vals = ts[col as keyof typeof ts]
                  if (Array.isArray(vals) && vals.length > 0) {
                    ops.push({
                      table: 'scores',
                      action: 'update', // Treat score updates as upserts
                      id: `${s.id}_${term}_${col}`,
                      data: {
                        student_id: s.id,
                        term,
                        col_key: col,
                        values: vals,
                        rev: 1
                      }
                    })
                  }
                }
              }
            }
          }
        }
      } else if (op === 'remove') {
        const cls = oldState.classes[classIdx]
        if (cls) {
          ops.push({
            table: 'classes',
            action: 'delete',
            id: cls.id
          })
        }
      }
      continue
    }

    // Path: ["classes", classIdx, ...]
    const cls = newState.classes[classIdx] || oldState.classes[classIdx]
    if (!cls) continue

    // 2. Class field update
    if (path.length === 3) {
      // Path: ["classes", classIdx, "name"|"year"|"weights"|"columns"]
      const field = path[2]
      if (field === 'name' || field === 'year' || field === 'weights' || field === 'columns') {
        const updatedCls = newState.classes[classIdx]
        if (updatedCls) {
          ops.push({
            table: 'classes',
            action: 'update',
            id: updatedCls.id,
            data: {
              name: updatedCls.name,
              year: updatedCls.year,
              weights: updatedCls.weights,
              columns: updatedCls.columns,
              rev: (updatedCls.rev || 1) + 1
            }
          })
        }
      }
      continue
    }

    // Path: ["classes", classIdx, "students", studentIdx, ...]
    if (path[2] !== 'students') continue
    const studentIdx = path[3] as number
    if (typeof studentIdx !== 'number') continue

    if (path.length === 4) {
      // Path: ["classes", classIdx, "students", studentIdx]
      if (op === 'add') {
        const s = newState.classes[classIdx]?.students[studentIdx]
        if (s) {
          ops.push({
            table: 'students',
            action: 'insert',
            id: s.id,
            data: {
              id: s.id,
              class_id: cls.id,
              ten_thanh: s.tenThanh || '',
              ho_dem: s.hoDem || '',
              ten: s.ten || '',
              name: s.name || '',
              ma_hv: s.maHV || '',
              ngay_sinh: s.ngaySinh || '',
              gioi_tinh: s.gioiTinh || '',
              ten_phu_huynh: s.tenPhuHuynh || '',
              sd_phu_huynh: s.sdPhuHuynh || '',
              dia_chi: s.diaChi || '',
              email: s.email || '',
              ghi_chu: s.ghiChu || '',
              rev: s.rev || 1
            }
          })
        }
      } else if (op === 'remove') {
        const s = oldState.classes[classIdx]?.students[studentIdx]
        if (s) {
          ops.push({
            table: 'students',
            action: 'delete',
            id: s.id
          })
        }
      }
      continue
    }

    // Student field operations
    const s = newState.classes[classIdx]?.students[studentIdx] || oldState.classes[classIdx]?.students[studentIdx]
    if (!s) continue

    // Path: ["classes", classIdx, "students", studentIdx, fieldName, ...]
    const fieldName = path[4] as string

    if (path.length === 5) {
      // Direct student field update
      if (fieldName !== 'scoresByTerm' && fieldName !== 'learningLog') {
        const updatedStudent = newState.classes[classIdx]?.students[studentIdx]
        if (updatedStudent) {
          ops.push({
            table: 'students',
            action: 'update',
            id: updatedStudent.id,
            data: {
              ten_thanh: updatedStudent.tenThanh || '',
              ho_dem: updatedStudent.hoDem || '',
              ten: updatedStudent.ten || '',
              name: updatedStudent.name || '',
              ma_hv: updatedStudent.maHV || '',
              ngay_sinh: updatedStudent.ngaySinh || '',
              gioi_tinh: updatedStudent.gioiTinh || '',
              ten_phu_huynh: updatedStudent.tenPhuHuynh || '',
              sd_phu_huynh: updatedStudent.sdPhuHuynh || '',
              dia_chi: updatedStudent.diaChi || '',
              email: updatedStudent.email || '',
              ghi_chu: updatedStudent.ghiChu || '',
              rev: (updatedStudent.rev || 1) + 1
            }
          })
        }
      }
      continue
    }

    // Path: ["classes", classIdx, "students", studentIdx, "scoresByTerm", term, colKey, ...]
    if (fieldName === 'scoresByTerm') {
      const term = path[5] as 'hk1' | 'hk2'
      const colKey = path[6] as string
      if (term && colKey) {
        const updatedStudent = newState.classes[classIdx]?.students[studentIdx]
        if (updatedStudent) {
          const termScores = updatedStudent.scoresByTerm[term]
          const values = termScores[colKey as keyof typeof termScores] || []
          ops.push({
            table: 'scores',
            action: 'update',
            id: `${updatedStudent.id}_${term}_${colKey}`,
            data: {
              student_id: updatedStudent.id,
              term,
              col_key: colKey,
              values,
              rev: 1
            }
          })
        }
      }
      continue
    }

    // Path: ["classes", classIdx, "students", studentIdx, "learningLog", logIdx, ...]
    if (fieldName === 'learningLog') {
      const logIdx = path[5] as number
      if (typeof logIdx === 'number') {
        if (path.length === 6) {
          if (op === 'add') {
            const entry = newState.classes[classIdx]?.students[studentIdx]?.learningLog[logIdx]
            if (entry) {
              ops.push({
                table: 'learning_logs',
                action: 'insert',
                id: entry.id,
                data: {
                  id: entry.id,
                  student_id: s.id,
                  date: entry.date,
                  type: entry.type,
                  level: entry.level,
                  text: entry.text,
                  by_user_id: entry.byUserId,
                  by_name: entry.byName,
                  at: entry.at
                }
              })
            }
          } else if (op === 'remove') {
            const entry = oldState.classes[classIdx]?.students[studentIdx]?.learningLog[logIdx]
            if (entry) {
              ops.push({
                table: 'learning_logs',
                action: 'delete',
                id: entry.id
              })
            }
          }
        }
      }
      continue
    }
  }

  return ops
}
