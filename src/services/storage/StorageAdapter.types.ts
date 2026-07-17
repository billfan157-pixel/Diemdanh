// ============================================================
// Sổ Điểm GL — Storage Adapter Types
// ============================================================

export interface AppState {
  version: number
  activeClassId: string | null
  classes: ClassData[]
  yearFilter: string | null
  viewMode: string
  activeTerm: 'hk1' | 'hk2'
  lastModified: number
}

export interface ClassData {
  id: string
  name: string
  year: string
  weights: ColumnWeights
  students: StudentData[]
  createdAt: number
  updatedAt: number
}

export interface ColumnWeights {
  khaoKinh: number
  thuocBai: number
  chuyenCan: number
  baiTap: number
  thaiDo: number
  kiemTra: number
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
}

export interface ScoresByTerm {
  hk1: TermScores
  hk2: TermScores
}

export interface TermScores {
  khaoKinh: number[]
  thuocBai: number[]
  chuyenCan: number[]
  baiTap: number[]
  thaiDo: number[]
  kiemTra: number[]
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

export interface SyncQueueItem {
  id?: number
  type: 'state' | 'auth' | 'full'
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