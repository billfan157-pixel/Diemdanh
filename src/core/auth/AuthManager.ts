// ============================================================
// Sổ Điểm GL — Auth Manager
// PIN-based auth with Web Crypto API (PBKDF2)
// ============================================================

import { StorageAdapter } from '../../services/storage/StorageAdapter'
import { generateId } from '../../config/constants.ts'
import { supabaseService } from '../../services/SupabaseClient'
import { logger } from '../../services/Logger'

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

export type SanitizedUser = Omit<UserRecord, 'pinHash' | 'pinSalt' | 'biometricCredentialId'>

export interface AuthResult {
  ok: boolean
  user?: SanitizedUser
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
  private currentUser: UserRecord | null = null
  private session: SessionData | null = null
  private cachedUsers: UserRecord[] = []
  /** Random default PIN shown on first-run login screen */
  defaultPin: string = ''
  private _initDone = false

  /** Weak PINs that should be changed (from legacy) */
  static readonly DEFAULT_WEAK_PINS = ['1234', '0000', '1111', '2222', 'admin', 'password']

  /** Normalize PIN by trimming whitespace */
  static normalizePin(pin: string): string {
    return String(pin == null ? '' : pin).trim()
  }

  constructor(storage: StorageAdapter) {
    this.storage = storage
  }

  private static randomPin(): string {
    const bytes = new Uint8Array(3)
    crypto.getRandomValues(bytes)
    return String(100000 + (bytes[0] << 16 | bytes[1] << 8 | bytes[2]) % 900000)
  }

  setStateManager(_stateManager: any): void {
    // Saved in case future features need it
  }

  async init(): Promise<void> {
    if (this._initDone) return
    this._initDone = true

    let authStore = await this.storage.getAuthStore()

    if (!authStore.users || authStore.users.length === 0) {
      this.defaultPin = AuthManager.randomPin()
      const pinHash = await this.hashPin(this.defaultPin)
      const adminUser: UserRecord = {
        id: 'admin-init',
        username: 'admin',
        displayName: 'Ban Giáo lý',
        pinHash,
        pinSalt: '',
        role: 'ban_gl',
        classIds: [],
        active: true,
        biometricEnabled: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      authStore = {
        version: 1,
        users: [adminUser],
        activeUserId: null
      }
      await this.storage.setAuthStore(authStore)
    }

    this.cachedUsers = authStore.users || []

    // Restore session if exists
    await this.restoreSession()
    // Migrate users if needed
    await this.migrateUsersIfNeeded()
  }

  // ============================================================
  // Core Auth Operations
  // ============================================================

  async login(username: string, pin: string, remember = false): Promise<AuthResult> {
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
      users: authStore.users,
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

  async loginWithEmail(email: string, pin: string, remember = false): Promise<AuthResult> {
    const supabase = supabaseService.getClient()
    if (!supabase) {
      return { ok: false, error: 'Chưa cấu hình kết nối đám mây.' }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pin.trim()
      })

      if (error) {
        return { ok: false, error: error.message }
      }

      if (!data.user) {
        return { ok: false, error: 'Xác thực thất bại.' }
      }

      // Fetch member profile
      const { data: member, error: memberError } = await supabase
        .from('parish_members')
        .select('*')
        .eq('user_id', data.user.id)
        .single()

      if (memberError || !member) {
        return { ok: false, error: 'Tài khoản chưa được phân quyền trong Giáo xứ.' }
      }

      // Sync member locally as a UserRecord
      const localUser: UserRecord = {
        id: member.id,
        username: member.username,
        displayName: member.display_name,
        pinHash: member.pin_hash || '',
        pinSalt: member.pin_salt || '',
        role: member.role as 'ban_gl' | 'glv',
        classIds: member.class_ids || [],
        active: member.active,
        biometricEnabled: false,
        createdAt: new Date(member.created_at).getTime(),
        updatedAt: new Date(member.updated_at).getTime()
      }

      // Save to local cache
      const authStore = await this.storage.getAuthStore()
      const users = authStore.users.filter(u => u.username !== localUser.username)
      users.push(localUser)
      await this.saveAuthStore({ users, activeUserId: localUser.id })

      this.currentUser = localUser
      this.session = {
        userId: localUser.id,
        remember,
        expiresAt: remember
          ? Date.now() + SESSION_REMEMBER_DAYS * 24 * 60 * 60 * 1000
          : Date.now() + SESSION_NORMAL_DAYS * 24 * 60 * 60 * 1000
      }
      this.saveSession()

      return { ok: true, user: this.sanitizeUser(localUser) }
    } catch (e: any) {
      return { ok: false, error: e.message }
    }
  }

  async logout(): Promise<void> {
    this.currentUser = null
    this.session = null
    this.clearSession()
    
    // Sign out from Supabase if connected
    const supabase = supabaseService.getClient()
    if (supabase) {
      try {
        await supabase.auth.signOut()
      } catch (e) {
        logger.warn('Supabase sign out failed:', e)
      }
    }
  }

  getCurrentUser(): SanitizedUser | null {
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

  isGLV(): boolean {
    return this.currentUser?.role === 'glv'
  }

  canAccessClass(classId: string): boolean {
    const u = this.currentUser
    if (!u) return false
    if (u.role === 'ban_gl') return true
    return (u.classIds || []).indexOf(classId) >= 0
  }

  /** Check if current user is Ban GL; if not, show error notification */
  requireBanGL(_msg?: string): boolean {
    if (this.isAdmin()) return true
    return false
  }

  /** Filter classes by current user's role (Ban GL sees all, GLV sees assigned) */
  visibleClasses(classes: readonly { id: string }[]): { id: string }[] {
    const u = this.currentUser
    if (!u) return []
    if (u.role === 'ban_gl') return classes.slice()
    const ids = u.classIds || []
    return classes.filter(c => ids.indexOf(c.id) >= 0)
  }

  /** Check if current user's PIN is weak / default */
  userHasWeakPin(user?: UserRecord): boolean {
    const u = user || this.currentUser
    if (!u || !u.pinHash) return false
    const weak = AuthManager.DEFAULT_WEAK_PINS
    for (const w of weak) {
      const hash = legacySimpleHash(w)
      if (u.pinHash === hash) return true
    }
    return false
  }

  /** True if current user must change their PIN (weak PIN detected) */
  mustChangePin(): boolean {
    return this.userHasWeakPin()
  }

  /** Get plaintext PIN for a user (admin only) */
  getUserPinPlain(userId: string): string | null {
    if (!this.isAdmin()) return null
    const user = this.cachedUsers.find(u => u.id === userId)
    if (!user) return null
    return user.pinHash || null
  }

  /** Change own PIN with confirmation parameter (legacy-compatible) */
  async changeOwnPin(oldPin: string, newPin: string, confirmPin: string): Promise<{ ok: boolean; error?: string }> {
    const sessionUser = this.currentUser
    if (!sessionUser) return { ok: false, error: 'Chưa đăng nhập.' }

    const authStore = await this.storage.getAuthStore()
    const user = authStore.users.find(u => u.id === sessionUser.id)
    if (!user) return { ok: false, error: 'Không tìm thấy tài khoản.' }

    oldPin = AuthManager.normalizePin(oldPin)
    newPin = AuthManager.normalizePin(newPin)
    confirmPin = AuthManager.normalizePin(confirmPin)

    if (!oldPin) return { ok: false, error: 'Nhập PIN hiện tại.' }
    const valid = await this.verifyPin(oldPin, user)
    if (!valid) {
      if (newPin && await this.verifyPin(newPin, user)) {
        return { ok: false, error: 'Ô "PIN hiện tại" đang giống PIN mới. Hãy ghi PIN đang đăng nhập vào ô trên, PIN mới vào 2 ô dưới.' }
      }
      return { ok: false, error: 'PIN hiện tại không đúng.' }
    }
    if (newPin.length < 4) return { ok: false, error: 'PIN mới tối thiểu 4 ký tự.' }
    if (newPin !== confirmPin) return { ok: false, error: 'Hai ô PIN mới không khớp nhau.' }
    if (newPin === oldPin) return { ok: false, error: 'PIN mới phải khác PIN hiện tại.' }

    const weak = AuthManager.DEFAULT_WEAK_PINS
    if (weak.indexOf(newPin) >= 0) {
      return { ok: false, error: 'PIN quá yếu. Hãy chọn PIN khác.' }
    }

    const newHash = await this.hashPin(newPin)
    user.pinHash = newHash
    user.pinSalt = ''
    user.updatedAt = Date.now()
    await this.saveAuthStore({ users: authStore.users, activeUserId: this.currentUser?.id || null })
    if (this.currentUser?.id === user.id) {
      this.currentUser = { ...this.currentUser!, pinHash: newHash, updatedAt: Date.now() }
    }
    return { ok: true }
  }

  /** Ensure the active class is still accessible by the current user */
  ensureActiveClassAccessible(state: { activeClassId: string | null; classes: { id: string }[] }): void {
    const vis = this.visibleClasses(state.classes)
    if (!vis.length) {
      state.activeClassId = null
      return
    }
    if (state.activeClassId && !this.canAccessClass(state.activeClassId)) {
      state.activeClassId = vis[0].id
    }
  }

  // ============================================================
  // User Management (Admin only)
  // ============================================================

  async createUser(data: { username: string; displayName: string; role: 'ban_gl' | 'glv'; classIds?: string[]; pin: string }): Promise<AuthResult> {
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
    await this.saveAuthStore({ users, activeUserId: this.currentUser?.id || null })

    return { ok: true, user: this.sanitizeUser(user) }
  }

  async updateUser(userId: string, updates: Partial<Pick<UserRecord, 'displayName' | 'role' | 'classIds' | 'active'>> & { pin?: string }): Promise<{ ok: boolean; error?: string }> {
    if (!this.isAdmin()) return { ok: false, error: 'Không có quyền.' }

    const authStore = await this.storage.getAuthStore()
    const idx = authStore.users.findIndex(u => u.id === userId)
    if (idx === -1) return { ok: false, error: 'Người dùng không tồn tại.' }

    const user = authStore.users[idx]

    if (updates.pin != null) {
      const newPin = String(updates.pin)
      if (newPin.length < 4) return { ok: false, error: 'PIN mới tối thiểu 4 ký tự.' }
      if (AuthManager.DEFAULT_WEAK_PINS.indexOf(newPin) >= 0) {
        return { ok: false, error: 'PIN quá yếu. Hãy chọn PIN khác.' }
      }
      const newHash = await this.hashPin(newPin)
      user.pinHash = newHash
      user.pinSalt = ''
    }

    if (updates.displayName != null) user.displayName = updates.displayName
    if (updates.role != null) user.role = updates.role
    if (updates.classIds != null) user.classIds = updates.classIds
    if (updates.active != null) user.active = updates.active
    user.updatedAt = Date.now()

    await this.saveAuthStore({ users: authStore.users, activeUserId: this.currentUser?.id || null })

    if (this.currentUser?.id === userId) {
      this.currentUser = { ...user }
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

    await this.saveAuthStore({ users: this.getAllUsers(), activeUserId: this.currentUser?.id || null })

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
    await this.saveAuthStore({ users, activeUserId: this.currentUser?.id || null })

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
    await this.saveAuthStore({ users, activeUserId: this.currentUser?.id || null })
    return { ok: true }
  }

  // ============================================================
  // PIN Handling (Web Crypto API - PBKDF2)
  // ============================================================

  private async hashPin(pin: string, salt?: string): Promise<string> {
    const saltBytes = salt
      ? this.base64ToBytes(salt)
      : crypto.getRandomValues(new Uint8Array(16))

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
        salt: saltBytes as BufferSource,
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
    // Legacy hash from migration (pinSalt === ''): use DJB2 fallback
    if (!user.pinSalt && user.pinHash.indexOf('$') === -1) {
      return user.pinHash === legacySimpleHash(pin)
    }

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
          salt: salt as BufferSource,
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
      logger.error('PIN verification failed:', e)
      return false
    }
  }

  // ============================================================
  // Session Management
  // ============================================================

  private saveSession(): void {
    if (!this.session) return
    const json = JSON.stringify(this.session)
    if (this.session.remember) {
      localStorage.setItem(SESSION_KEY, json)
      sessionStorage.removeItem(SESSION_KEY)
    } else {
      sessionStorage.setItem(SESSION_KEY, json)
      localStorage.removeItem(SESSION_KEY)
    }
  }

  private clearSession(): void {
    sessionStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(SESSION_KEY)
  }

  private async restoreSession(): Promise<void> {
    try {
      const authStore = await this.storage.getAuthStore()

      // Try localStorage first (remembered sessions), then sessionStorage
      const json = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY)
      if (json) {
        const session: SessionData = JSON.parse(json)
        if (session.expiresAt >= Date.now()) {
          const user = authStore.users.find(u => u.id === session.userId)
          if (user && user.active !== false) {
            this.session = session
            this.currentUser = user
            return
          }
        }
      }

      // If no active session, but there is a last active user with biometric enabled,
      // populate currentUser to allow biometric login on the login screen
      if (authStore.activeUserId) {
        const user = authStore.users.find(u => u.id === authStore.activeUserId)
        if (user && user.active !== false && user.biometricEnabled) {
          this.currentUser = user
        }
      }
    } catch (e) {
      logger.warn('Session restore failed:', e)
      this.clearSession()
    }
  }

  // ============================================================
  // Auth Store Operations
  // ============================================================

  getAllUsers(): UserRecord[] {
    return this.cachedUsers
  }

  private async saveAuthStore(store: { users: UserRecord[]; activeUserId: string | null }): Promise<void> {
    await this.storage.setAuthStore(store)
    this.cachedUsers = store.users
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

  // ============================================================
  // Biometric Authentication (WebAuthn)
  // ============================================================

  async isBiometricAvailable(): Promise<boolean> {
    try {
      return !!(window.PublicKeyCredential && typeof PublicKeyCredential === 'function')
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
      const challenge = crypto.getRandomValues(new Uint8Array(32))
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
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
        }
      }) as PublicKeyCredential

      if (!credential) return { ok: false, error: 'Không thể tạo credential' }

      const credentialId = this.bytesToBase64(new Uint8Array(credential.rawId))

      const users = this.getAllUsers()
      const idx = users.findIndex(u => u.id === this.currentUser!.id)
      if (idx !== -1) {
        users[idx] = {
          ...users[idx],
          biometricEnabled: true,
          biometricCredentialId: credentialId,
          updatedAt: Date.now()
        }
        await this.saveAuthStore({ users, activeUserId: this.currentUser!.id })
      }

      return { ok: true }
    } catch (e: any) {
      logger.error('Biometric enable failed:', e)
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
      await this.saveAuthStore({ users, activeUserId: this.currentUser?.id || null })
    }
    return { ok: true }
  }

  async loginWithBiometric(): Promise<AuthResult> {
    if (!this.currentUser?.biometricEnabled || !this.currentUser.biometricCredentialId) {
      return { ok: false, error: 'Chưa bật sinh trắc học' }
    }

    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32))
      const credentialIdBytes = this.base64ToBytes(this.currentUser.biometricCredentialId)

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{
            id: credentialIdBytes as BufferSource,
            type: 'public-key',
            transports: ['internal']
          }],
          userVerification: 'required',
          timeout: 60000
        }
      })

      if (!assertion) return { ok: false, error: 'Xác thực thất bại' }

      const authStore = await this.storage.getAuthStore()
      const user = authStore.users.find(u => u.id === this.currentUser!.id)

      if (!user) return { ok: false, error: 'Người dùng không tồn tại' }

      this.currentUser = user
      this.session = { userId: user.id, remember: true, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 }
      this.saveSession()

      return { ok: true, user: this.sanitizeUser(user) }
    } catch (e: any) {
      logger.error('Biometric login failed:', e)
      return { ok: false, error: e.name === 'NotAllowedError' ? 'Đã hủy xác thực' : 'Xác thực thất bại' }
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

// ============================================================
// Legacy hash support for giao-ly-auth-v1 migration
// ============================================================

/** DJB2 hash used by the legacy giao-ly-auth-v1 format */
function legacySimpleHash(pin: string): string {
  let h = 5381
  const str = String(pin || '')
  for (let i = 0; i < str.length; i++) {
    h = ((h * 33) ^ str.charCodeAt(i)) >>> 0
  }
  return h.toString(16)
}