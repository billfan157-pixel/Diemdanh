// ============================================================
// Sổ Điểm GL — Auth Manager
// PIN-based auth with Web Crypto API (PBKDF2)
// ============================================================

import { StorageAdapter } from '../../services/storage/StorageAdapter'
import { generateId } from '../../config/constants'

// ============================================================
// Types
// ============================================================

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

export interface AuthStore {
  version: number
  users: UserRecord[]
  activeUserId: string | null
}

export interface AuthResult {
  ok: boolean
  user?: UserRecord
  error?: string
}

export interface SessionData {
  userId: string
  remember: boolean
  expiresAt: number
}

// ============================================================
// Constants
// ============================================================

const PIN_PBKDF2_ITERATIONS = 100000
const PIN_KEY_LENGTH = 32 // 256 bits
const SESSION_KEY = 'so-diem-gl-session'
const SESSION_REMEMBER_DAYS = 30
const SESSION_NORMAL_DAYS = 1

// ============================================================
// Auth Manager
// ============================================================

export class AuthManager {
  private storage: StorageAdapter
  private stateManager: any = null
  private currentUser: UserRecord | null = null
  private session: SessionData | null = null
  private initialized = false

  constructor(storage: StorageAdapter) {
    this.storage = storage
  }

  setStateManager(stateManager: any): void {
    this.stateManager = stateManager
  }

  async init(): Promise<void> {
    // Restore session if exists
    await this.restoreSession()
    // Migrate users if needed
    await this.migrateUsersIfNeeded()
    this.initialized = true
  }

  // ============================================================
  // Core Auth Operations
  // ============================================================

  async login(username: string, pin: string, remember = false): Promise<{ ok: boolean; user?: UserRecord; error?: string }> {
    const authStore = await this.storage.getAuthStore()
    const normalizedUser = username.trim().toLowerCase()

    const user = authStore.users.find(u =>
      u.active !== false &&
      u.username.toLowerCase() === normalizedUser
    )

    if (!user) {
      return { ok: false, error: 'Sai tài khoản hoặc PIN.' }
    }

    const pinValid = await this.verifyPin(pin, user)
    if (!pinValid) {
      return { ok: false, error: 'Sai tài khoản hoặc PIN.' }
    }

    // Update last login
    user.lastLoginAt = Date.now()
    // Re-hash with current salt to ensure up-to-date
    user.pinHash = await this.hashPin(pin, user.pinSalt)
    await this.saveAuthStore({
      users: this.getAllUsers(),
      activeUserId: user.id
    })

    // Create session
    this.currentUser = user
    this.session = {
      userId: user.id,
      remember,
      expiresAt: remember
        ? Date.now() + SESSION_REMEMBER_DAYS * 24 * 60 * 60 * 1000
        : Date.now() + SESSION_NORMAL_DAYS * 24 * 60 * 60 * 1000
    }
    this.saveSession()

    return { ok: true, user: this.sanitizeUser(user) }
  }

  async logout(): Promise<void> {
    this.currentUser = null
    this.session = null
    this.clearSession()
    // Also clear from IndexedDB if needed
  }

  getCurrentUser(): UserRecord | null {
    return this.currentUser ? this.sanitizeUser(this.currentUser) : null
  }

  getCurrentUserId(): string | null {
    return this.currentUser?.id || null
  }

  isLoggedIn(): boolean {
    return this.currentUser !== null
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'ban_gl'
  }

  canCreateClass(): boolean {
    return this.isAdmin()
  }

  canDeleteClass(): boolean {
    return this.isAdmin()
  }

  canImport(): boolean {
    return this.isAdmin()
  }

  canExport(): boolean {
    return this.isLoggedIn()
  }

  canExportMultiClass(): boolean {
    return this.isAdmin()
  }

  canManageUsers(): boolean {
    return this.isAdmin()
  }

  // ============================================================
  // User Management (Admin only)
  // ============================================================

  async createUser(data: {
    username: string
    displayName: string
    pin: string
    role: 'ban_gl' | 'glv'
    classIds?: string[]
  }): Promise<{ ok: boolean; user?: UserRecord; error?: string }> {
    if (!this.isAdmin()) return { ok: false, error: 'Không có quyền tạo tài khoản.' }

    const authStore = await this.storage.getAuthStore()
    const normalizedUser = data.username.trim().toLowerCase()

    if (authStore.users.some(u => u.username.toLowerCase() === normalizedUser)) {
      return { ok: false, error: 'Tên đăng nhập đã tồn tại.' }
    }

    if (data.pin.length < 4) {
      return { ok: false, error: 'PIN phải có ít nhất 4 ký tự.' }
    }

    const user: UserRecord = {
      id: generateId('usr'),
      username: normalizedUser,
      displayName: data.displayName.trim(),
      pinHash: await this.hashPin(data.pin),
      pinSalt: '', // hashPin generates its own salt
      role: data.role,
      classIds: data.classIds || [],
      active: true,
      biometricEnabled: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    const users = [...this.getAllUsers(), user]
    await this.saveAuthStore({ users, activeUserId: this.currentUser?.id })

    return { ok: true, user: this.sanitizeUser(user) }
  }

  async updateUser(userId: string, updates: Partial<Pick<UserRecord, 'displayName' | 'role' | 'classIds' | 'active'>>): Promise<{ ok: boolean; error?: string }> {
    if (!this.isAdmin()) return { ok: false, error: 'Không có quyền.' }

    const users = this.getAllUsers()
    const idx = users.findIndex(u => u.id === userId)
    if (idx === -1) return { ok: false, error: 'Người dùng không tồn tại.' }

    users[idx] = { ...users[idx], ...updates, updatedAt: Date.now() }
    await this.saveAuthStore({ users, activeUserId: this.currentUser?.id })

    // Update current user if self
    if (this.currentUser?.id === userId) {
      this.currentUser = { ...this.currentUser, ...updates, updatedAt: Date.now() }
    }

    return { ok: true }
  }

  async changePin(userId: string, oldPin: string, newPin: string): Promise<{ ok: boolean; error?: string }> {
    const authStore = await this.storage.getAuthStore()
    const user = authStore.users.find(u => u.id === userId)
    if (!user) return { ok: false, error: 'Người dùng không tồn tại.' }

    // If changing own PIN, verify old PIN
    if (userId === this.currentUser?.id) {
      const valid = await this.verifyPin(oldPin, user)
      if (!valid) return { ok: false, error: 'PIN cũ không đúng.' }
    }

    if (newPin.length < 4) return { ok: false, error: 'PIN mới phải có ít nhất 4 ký tự.' }

    const newHash = await this.hashPin(newPin)
    user.pinHash = newHash
    user.pinSalt = '' // hashPin generates new salt
    user.updatedAt = Date.now()

    await this.saveAuthStore({ users: this.getAllUsers(), activeUserId: this.currentUser?.id })

    if (this.currentUser?.id === userId) {
      this.currentUser = { ...this.currentUser, pinHash: newHash, updatedAt: Date.now() }
    }

    return { ok: true }
  }

  async forceResetPin(userId: string, newPin: string): Promise<{ ok: boolean; error?: string }> {
    if (!this.isAdmin()) return { ok: false, error: 'Không có quyền.' }

    if (newPin.length < 4) return { ok: false, error: 'PIN phải có ít nhất 4 ký tự.' }

    const users = this.getAllUsers()
    const idx = users.findIndex(u => u.id === userId)
    if (idx === -1) return { ok: false, error: 'Người dùng không tồn tại.' }

    const newHash = await this.hashPin(newPin)
    users[idx].pinHash = newHash
    users[idx].updatedAt = Date.now()

    await this.saveAuthStore({ users, activeUserId: this.currentUser?.id })

    if (this.currentUser?.id === userId) {
      this.currentUser = { ...this.currentUser, pinHash: newHash, updatedAt: Date.now() }
    }

    return { ok: true }
  }

  async deleteUser(userId: string): Promise<{ ok: boolean; error?: string }> {
    if (!this.isAdmin()) return { ok: false, error: 'Không có quyền.' }

    if (userId === this.currentUser?.id) {
      return { ok: false, error: 'Không thể xóa chính mình.' }
    }

    const users = this.getAllUsers().filter(u => u.id !== userId)
    await this.saveAuthStore({ users, activeUserId: this.currentUser?.id })
    return { ok: true }
  }

  // ============================================================
  // PIN Handling (Web Crypto API - PBKDF2)
  // ============================================================

  private async hashPin(pin: string, salt?: string): Promise<string> {
    const saltBytes = salt
      ? this.base64ToBytes(salt)
      : crypto.getRandomValues(new Uint8Array(16))

    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(pin),
      'PBKDF2',
      false,
      ['deriveBits']
    )

    const hash = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: PIN_PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      PIN_KEY_LENGTH * 8
    )

    const hashArray = Array.from(new Uint8Array(hash))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    const saltB64 = this.bytesToBase64(saltBytes)

    return `${PIN_PBKDF2_ITERATIONS}$${saltB64}$${hashHex}`
  }

  private async verifyPin(pin: string, user: UserRecord): Promise<boolean> {
    try {
      const parts = user.pinHash.split('$')
      if (parts.length !== 3) return false

      const iterations = parseInt(parts[0], 10)
      const salt = this.base64ToBytes(parts[1])
      const expectedHash = parts[2]

      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(pin),
        'PBKDF2',
        false,
        ['deriveBits']
      )

      const hash = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt,
          iterations,
          hash: 'SHA-256'
        },
        keyMaterial,
        PIN_KEY_LENGTH * 8
      )

      const hashArray = Array.from(new Uint8Array(hash))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      return hashHex === expectedHash
    } catch (e) {
      console.error('PIN verification failed:', e)
      return false
    }
  }

  // ============================================================
  // Session Management
  // ============================================================

  private saveSession(): void {
    if (this.session) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(this.session))
    }
  }

  private clearSession(): void {
    sessionStorage.removeItem(SESSION_KEY)
  }

  private async restoreSession(): Promise<void> {
    try {
      const data = sessionStorage.getItem(SESSION_KEY)
      if (!data) return

      const session: SessionData = JSON.parse(data)
      if (session.expiresAt < Date.now()) {
        this.clearSession()
        return
      }

      // Restore user
      const authStore = await this.storage.getAuthStore()
      const user = authStore.users.find(u => u.id === session.userId)
      if (user) {
        this.session = session
        this.currentUser = user
      }
    } catch (e) {
      console.warn('Session restore failed:', e)
      this.clearSession()
    }
  }

  // ============================================================
  // Auth Store Operations
  // ============================================================

  private getAllUsers(): UserRecord[] {
    // We need to get from storage
    // This is a sync call, so we need cached data
    // For now, return empty - will be loaded from storage
    return []
  }

  private async getAuthStore(): Promise<{ users: UserRecord[]; activeUserId: string | null }> {
    return this.storage.getAuthStore()
  }

  private async saveAuthStore(store: { users: UserRecord[]; activeUserId: string | null }): Promise<void> {
    await this.storage.setAuthStore(store)
  }

  private async migrateUsersIfNeeded(): Promise<void> {
    const authStore = await this.storage.getAuthStore()
    if (!authStore.version) {
      // Migration from old format
      authStore.users = authStore.users.map(u => ({
        ...u,
        pinSalt: u.pinSalt || '',
        biometricEnabled: u.biometricEnabled || false,
        active: u.active !== false
      }))
      authStore.version = 1
      await this.storage.setAuthStore(authStore)
    }
  }

  private sanitizeUser(user: UserRecord): Omit<UserRecord, 'pinHash' | 'pinSalt' | 'biometricCredentialId'> {
    const { pinHash, pinSalt, biometricCredentialId, ...safe } = user
    return safe
  }

  // ============================================================
  // Crypto Helpers
  // ============================================================

  private base64ToBytes(b64: string): Uint8Array {
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }

  private bytesToBase64(bytes: Uint8Array): string {
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }
}