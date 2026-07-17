// ============================================================
// Sổ Điểm GL — Auth Manager
// PIN-based auth with Web Crypto API (PBKDF2)
// ============================================================

import { StorageAdapter } from '../services/storage/StorageAdapter'
import { generateId, normalizeName } from '../config/constants'

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
// Auth Manager
// ============================================================

export class AuthManager {
  private storage: StorageAdapter
  private stateManager: any // StateManager - injected later
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
    // Check for existing session
    await this.restoreSession()
    // Migrate users if needed
    await this.migrateUsersIfNeeded()
  }

  // ============================================================
  // Core Auth Operations
  // ============================================================

  async login(username: string, pin: string, remember = false): Promise<{ ok: boolean; user?: any; error?: string }> {
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
    user.pinHash = await this.hashPin(pin, user.pinSalt) // Re-hash to ensure up-to-date
    await this.saveAuthStore({ users: this.getAllUsers(), activeUserId: user.id })

    // Create session
    this.currentUser = user
    this.session = {
      userId: user.id,
      remember,
      expiresAt: remember ? Date.now() + 30 * 24 * 60 * 60 * 1000 : 0 // 30 days if remember
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

  getCurrentUser(): any | null {
    return this.currentUser ? this.sanitizeUser(this.currentUser) : null
  }

  isLoggedIn(): boolean {
    return this.currentUser !== null
  }

  getCurrentUserId(): string | null {
    return this.currentUser?.id || null
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
  }): Promise<{ ok: boolean; user?: any; error?: string }> {
    const currentUser = this.getCurrentUser()
    if (!currentUser || currentUser.role !== 'ban_gl') {
      return { ok: false, error: 'Chỉ Ban Giáo lý được tạo tài khoản.' }
    }

    const authStore = await this.getAuthStore()
    const normalizedUser = data.username.trim().toLowerCase()

    if (authStore.users.some(u => u.username.toLowerCase() === normalizedUser)) {
      return { ok: false, error: 'Tên đăng nhập đã tồn tại.' }
    }

    if (!data.displayName.trim()) {
      return { ok: false, error: 'Tên hiển thị không được để trống.' }
    }

    if (data.pin.length < 4) {
      return { ok: false, error: 'PIN phải có ít nhất 4 ký tự.' }
    }

    const { hash, salt } = await this.hashPinWithSalt(data.pin)

    const newUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      username: normalizedUser,
      displayName: data.displayName.trim(),
      pinHash: await this.hashPin(data.pin, salt),
      pinSalt: salt,
      role: data.role,
      classIds: data.classIds || [],
      active: true,
      biometricEnabled: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    const users = [...this.getAllUsers(), newUser]
    await this.saveAuthStore({ users, activeUserId: this.getCurrentUserId() })

    return { ok: true, user: this.sanitizeUser({ ...newUser, pinHash: '', pinSalt: '' }) }
  }

  async updateUser(userId: string, updates: {
    displayName?: string
    role?: 'ban_gl' | 'glv'
    classIds?: string[]
    active?: boolean
  }): Promise<{ ok: boolean; error?: string }> {
    const currentUser = this.getCurrentUser()
    if (!currentUser || currentUser.role !== 'ban_gl') {
      return { ok: false, error: 'Chỉ Ban Giáo lý được cập nhật tài khoản.' }
    }

    // Can't deactivate self
    if (userId === currentUser.id && updates.active === false) {
      return { ok: false, error: 'Không thể vô hiệu hóa chính mình.' }
    }

    const users = this.getAllUsers()
    const idx = users.findIndex(u => u.id === userId)
    if (idx === -1) return { ok: false, error: 'Không tìm thấy người dùng.' }

    const updated = { ...users[idx], ...updates, updatedAt: Date.now() }
    users[idx] = updated

    await this.saveAuthStore({ users, activeUserId: this.getCurrentUserId() })

    // Update current user if self
    if (userId === this.currentUser?.id) {
      this.currentUser = updated
    }

    return { ok: true }
  }

  async deleteUser(userId: string): Promise<{ ok: boolean; error?: string }> {
    const currentUser = this.getCurrentUser()
    if (!currentUser || currentUser.role !== 'ban_gl') {
      return { ok: false, error: 'Chỉ Ban Giáo lý được xóa tài khoản.' }
    }

    if (userId === currentUser.id) {
      return { ok: false, error: 'Không thể xóa chính mình.' }
    }

    const users = this.getAllUsers().filter(u => u.id !== userId)
    await this.saveAuthStore({ users, activeUserId: this.getCurrentUserId() })

    return { ok: true }
  }

  async changePin(userId: string, oldPin: string, newPin: string): Promise<{ ok: boolean; error?: string }> {
    const currentUser = this.getCurrentUser()
    if (!currentUser) return { ok: false, error: 'Chưa đăng nhập.' }

    // Can only change own PIN unless admin
    if (userId !== currentUser.id && currentUser.role !== 'ban_gl') {
      return { ok: false, error: 'Không có quyền đổi PIN cho người khác.' }
    }

    const users = this.getAllUsers()
    const idx = users.findIndex(u => u.id === userId)
    if (idx === -1) return { ok: false, error: 'Không tìm thấy người dùng.' }

    const user = users[idx]
    const valid = await this.verifyPin(oldPin, user)
    if (!valid) return { ok: false, error: 'PIN cũ không đúng.' }

    if (newPin.length < 4) return { ok: false, error: 'PIN mới phải có ít nhất 4 ký tự.' }

    const { hash, salt } = await this.hashPinWithSalt(newPin)
    users[idx] = {
      ...users[idx],
      pinHash: await this.hashPin(newPin, salt),
      pinSalt: salt,
      updatedAt: Date.now()
    }

    await this.saveAuthStore({ users, activeUserId: this.getCurrentUserId() })

    // Update current user if self
    if (userId === this.currentUser?.id) {
      this.currentUser = { ...this.currentUser, pinHash: await this.hashPin(newPin, users[idx].pinSalt), pinSalt: salt }
    }

    return { ok: true }
  }

  // ============================================================
  // Permissions
  // ============================================================

  isAdmin(): boolean {
    return this.currentUser?.role === 'ban_gl'
  }

  isTeacher(): boolean {
    return this.currentUser?.role === 'glv'
  }

  canManageUsers(): boolean {
    return this.isAdmin()
  }

  canCreateClass(): boolean {
    return this.isLoggedIn()
  }

  canDeleteClass(classId: string): boolean {
    if (this.isAdmin()) return true
    // Teachers can only delete their own classes
    const classData = this.stateManager?.getClass?.(classId)
    return this.isTeacher() && classData && this.getCurrentUser()?.classIds?.includes(classId)
  }

  canAccessClass(classId: string): boolean {
    if (this.isAdmin()) return true
    return this.currentUser?.classIds?.includes(classId) ?? false
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

  canManageWeights(): boolean {
    return this.isAdmin()
  }

  // ============================================================
  // Biometric (WebAuthn)
  // ============================================================

  async isBiometricAvailable(): Promise<boolean> {
    try {
      return 'credentials' in navigator &&
        typeof navigator.credentials.create === 'function' &&
        typeof PublicKeyCredential === 'function'
    } catch {
      return false
    }
  }

  async isBiometricEnabled(): Promise<boolean> {
    return this.currentUser?.biometricEnabled ?? false
  }

  async enableBiometric(): Promise<{ ok: boolean; error?: string }> {
    if (!this.currentUser) return { ok: false, error: 'Chưa đăng nhập' }
    if (!await this.isBiometricAvailable()) {
      return { ok: false, error: 'Thiết bị không hỗ trợ sinh trắc học' }
    }

    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { name: 'Sổ Điểm Giáo Lý', id: window.location.hostname },
          user: {
            id: new TextEncoder().encode(this.currentUser.id),
            name: this.currentUser.username,
            displayName: this.currentUser.displayName
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }], // ES256
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            requireResidentKey: false
          },
          timeout: 60000
        })

      if (!credential) return { ok: false, error: 'Không thể tạo credential' }

      // Store credential ID (in real app, send to server)
      const users = this.getAllUsers()
      const idx = users.findIndex(u => u.id === this.currentUser!.id)
      if (idx !== -1) {
        users[users.findIndex(u => u.id === this.currentUser!.id)] = {
          ...users.find(u => u.id === this.currentUser!.id)!,
          biometricEnabled: true,
          biometricCredentialId: credential.id,
          updatedAt: Date.now()
        }
        await this.saveAuthStore({ users: this.getAllUsers(), activeUserId: this.getCurrentUserId() })
      }

      return { ok: true }
    } catch (e: any) {
      console.error('Biometric enable failed:', e)
      return { ok: false, error: e.name === 'NotAllowedError' ? 'Đã hủy kích hoạt' : 'Lỗi không xác định' }
    }
  }

  async disableBiometric(): Promise<{ ok: boolean }> {
    const users = this.getAllUsers()
    const idx = users.findIndex(u => u.id === this.currentUser?.id)
    if (idx !== -1) {
      users[idx] = {
        ...users[idx],
        biometricEnabled: false,
        biometricCredentialId: undefined,
        updatedAt: Date.now()
      }
      await this.saveAuthStore({ users: this.getAllUsers(), activeUserId: this.getCurrentUserId() })
    }
    return { ok: true }
  }

  async loginWithBiometric(): Promise<{ ok: boolean; user?: any; error?: string }> {
    if (!this.currentUser?.biometricEnabled) {
      return { ok: false, error: 'Chưa bật sinh trắc học' }
    }

    try {
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          allowCredentials: [{
            id: this.currentUser.biometricCredentialId!,
            type: 'public-key',
            transports: ['internal']
          }],
          userVerification: 'required',
          timeout: 60000
        })

      if (!assertion) return { ok: false, error: 'Xác thực thất bại' }

      // In real app, verify signature on server
      // For now, just trust the platform authenticator
      const authStore = await this.storage.getAuthStore()
      const user = authStore.users.find(u => u.id === this.currentUser!.id)

      if (!user) return { ok: false, error: 'Người dùng không tồn tại' }

      this.currentUser = authStore.users.find(u => u.id === this.currentUser!.id)!
      this.session = { userId: user.id, remember: true, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 }
      this.saveSession()

      return { ok: true, user: this.sanitizeUser(user) }
    } catch (e: any) {
      return { ok: false, error: e.name === 'NotAllowedError' ? 'Đã hủy xác thực' : 'Xác thực thất bại' }
    }
  }

  // ============================================================
  // Helpers
  // ============================================================

  private async hashPinWithSalt(pin: string): Promise<{ hash: string; salt: string }> {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const hash = await this.hashPin(pin, Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join(''))
    return { hash, salt: Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('') }
  }

  private async hashPin(pin: string, salt: string): Promise<string> {
    const normalizedPin = pin.trim()
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(normalizedPin + salt),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    )

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('so-diem-gl-salt'), // Additional salt
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    )

    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  private async verifyPin(pin: string, user: any): Promise<boolean> {
    const hash = await this.hashPin(pin, user.pinSalt)
    return hash === user.pinHash
  }

  // ============================================================
  // Storage Helpers
  // ============================================================

  private getAllUsers(): any[] {
    // We need to get from storage
    // This is a sync method - in reality we'd use the state manager
    // For now, we'll get from storage directly
    // This is a temporary implementation
    return []
  }

  private async saveAuthStore(data: { users: any[]; activeUserId: string | null }): Promise<void> {
    await this.storage.setAuthStore({
      version: 1,
      users: data.users,
      activeUserId: data.activeUserId
    })
  }

  private async getAuthStore(): Promise<any> {
    return await this.storage.getAuthStore()
  }

  private getAllUsers(): any[] {
    // This is a stub - will be replaced by actual implementation
    return this.getAuthStoreSync()
  }

  private getAuthStoreSync(): any[] {
    // Synchronous access for internal use
    // In practice, we'd need to cache or use async/await properly
    // For now, return empty array
    return []
  }

  // ============================================================
  // Session Management
  // ============================================================

  private async restoreSession(): Promise<void> {
    try {
      const sessionStr = sessionStorage.getItem('so-diem-gl-session')
      if (!sessionStr) return

      const session = JSON.parse(sessionStr)
      if (!session || !session.userId) return

      // Check expiry
      if (session.expiresAt && session.expiresAt < Date.now()) {
        this.clearSession()
        return
      }

      // Restore user
      const authStore = await this.storage.getAuthStore()
      const user = authStore.users.find(u => u.id === session.userId)

      if (user && user.active !== false) {
        this.currentUser = user
        this.session = session
        // Extend session if remember
        if (session.remember) {
          session.expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000
          this.saveSession()
        }
      }
    } catch (e) {
      console.warn('Session restore failed:', e)
      this.clearSession()
    }
  }

  private saveSession(): void {
    if (this.session) {
      sessionStorage.setItem('so-diem-gl-session', JSON.stringify(this.session))
    }
  }

  private clearSession(): void {
    sessionStorage.removeItem('so-diem-gl-session')
    this.session = null
  }

  // ============================================================
  // Sync stub
  // ============================================================

  setStateManager(stateManager: any): void {
    this.stateManager = stateManager
  }

  private sanitizeUser(user: any): any {
    const { pinHash, pinSalt, biometricCredentialId, ...safe } = user
    return safe
  }
}