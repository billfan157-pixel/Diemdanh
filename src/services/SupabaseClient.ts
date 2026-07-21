// ============================================================
// Sổ Điểm GL — Supabase Client Service
// ============================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { logger } from './Logger'

export class SupabaseService extends EventTarget {
  private client: SupabaseClient | null = null
  private url = ''
  private key = ''

  constructor() {
    super()
    this.loadSettings()
  }

  loadSettings(): void {
    try {
      // 1. Try settings key
      const settingsData = localStorage.getItem('so-diem-gl-settings')
      if (settingsData) {
        const settings = JSON.parse(settingsData)
        if (settings.supabaseUrl && settings.supabaseKey) {
          this.url = settings.supabaseUrl
          this.key = settings.supabaseKey
          this.initClient()
          return
        }
      }

      // 2. Try fallback key
      const legacyData = localStorage.getItem('so-diem-gl-supabase')
      if (legacyData) {
        const { url, key } = JSON.parse(legacyData)
        if (url && key) {
          this.url = url
          this.key = key
          this.initClient()
          return
        }
      }

      // 3. No fallback - require explicit configuration
      logger.warn('Supabase not configured. Please configure via settings.')
      this.url = ''
      this.key = ''
    } catch (e) {
      logger.warn('Failed to load Supabase settings:', e)
    }
  }

  configure(url: string, key: string): void {
    this.url = url
    this.key = key
    
    // Save to settings
    try {
      const settingsData = localStorage.getItem('so-diem-gl-settings') || '{}'
      const settings = JSON.parse(settingsData)
      settings.supabaseUrl = url
      settings.supabaseKey = key
      localStorage.setItem('so-diem-gl-settings', JSON.stringify(settings))
    } catch (e) {
      logger.warn('Failed to save to settings, using fallback store:', e)
      localStorage.setItem('so-diem-gl-supabase', JSON.stringify({ url, key }))
    }

    this.initClient()
    this.dispatchEvent(new CustomEvent('configured'))
  }

  private initClient(): void {
    if (!this.url || !this.key) return
    try {
      this.client = createClient(this.url, this.key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      })
      this.dispatchEvent(new CustomEvent('initialized'))
    } catch (e) {
      logger.error('Failed to create Supabase client:', e)
      this.client = null
    }
  }

  getClient(): SupabaseClient | null {
    return this.client
  }

  getUrl(): string {
    return this.url
  }

  getKey(): string {
    return this.key
  }

  isConfigured(): boolean {
    return this.client !== null
  }
}

export const supabaseService = new SupabaseService()
