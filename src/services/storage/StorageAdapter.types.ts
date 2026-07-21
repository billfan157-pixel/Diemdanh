import { DBSchema } from 'idb'
import type { ColumnWeights, ScoreColumnDef, TermScores } from '../../config/columns.ts'

export type { ColumnWeights, ScoreColumnDef, TermScores }

export interface AppState {
  version: number
  activeClassId: string | null
  classes: ClassData[]
  yearFilter: string | null
  /** Years marked archived (read-only scores). */
  archivedYears: string[]
  viewMode: string
  activeTerm: 'hk1' | 'hk2' | 'year'
  theme: 'light' | 'dark' | 'system'
  /** Parent read-only report tokens (local + optional cloud sync). */
  parentTokens: ParentToken[]
  lastModified: number
}

export interface ClassData {
  id: string
  name: string
  year: string
  /** Per-class score column definitions (dynamic). */
  columns: ScoreColumnDef[]
  weights: ColumnWeights
  students: StudentData[]
  createdAt: number
  updatedAt: number
  rev?: number
}

export interface StudentData {
  id: string
  tenThanh: string
  hoDem: string
  ten: string
  name: string
  maHV: string
  ngaySinh: string
  gioiTinh: string
  tenPhuHuynh: string
  sdPhuHuynh: string
  diaChi: string
  email: string
  ghiChu: string
  scoresByTerm: ScoresByTerm
  learningLog: LearningLogEntry[]
  createdAt: number
  updatedAt: number
  rev?: number
}

export interface ScoresByTerm {
  hk1: TermScores
  hk2: TermScores
}

export interface LearningLogEntry {
  id: string
  date: string
  type: string
  level: string
  text: string
  byUserId: string
  byName: string
  at: number
}

/** Expiring read-only link for phụ huynh. */
export interface ParentToken {
  id: string
  token: string
  studentId: string
  classId: string
  expiresAt: number
  createdAt: number
  createdBy: string
  label?: string
  revoked?: boolean
}

export interface SyncQueueItem {
  id?: number
  type: 'state' | 'auth' | 'full' | 'sync_op'
  data: any
  timestamp: number
  retries: number
  status: 'pending' | 'syncing' | 'failed' | 'completed'
}

export interface BackupRecord {
  id?: number
  timestamp: number
  state: AppState
  auth: AuthStore
  size: number
  checksum: string
}

export interface AuthStore {
  version: number
  users: UserRecord[]
  activeUserId: string | null
}

export interface UserRecord {
  id: string
  username: string
  displayName: string
  pinHash: string
  pinSalt: string
  role: 'ban_gl' | 'glv'
  classIds: string[]
  active: boolean
  biometricEnabled: boolean
  biometricCredentialId?: string
  createdAt: number
  updatedAt: number
  lastLoginAt?: number
}

export interface AppDBSchema extends DBSchema {
  appState: {
    key: string
    value: AppState
  }
  authStore: {
    key: string
    value: AuthStore
  }
  syncQueue: {
    key: number
    value: SyncQueueItem
    indexes: {
      'by-timestamp': number
      'by-type': string
    }
  }
  backups: {
    key: number
    value: BackupRecord
    indexes: {
      'by-timestamp': number
    }
  }
}
