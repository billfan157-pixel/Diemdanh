// ============================================================
// Sổ Điểm GL — Retry Utility
// Exponential backoff retry logic for network operations
// ============================================================

import { logger } from '../services/Logger'

export interface RetryOptions {
  maxAttempts?: number
  baseDelay?: number
  maxDelay?: number
  shouldRetry?: (error: any) => boolean
  onRetry?: (attempt: number, error: any) => void
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    shouldRetry = defaultShouldRetry,
    onRetry
  } = options

  let lastError: any = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error
      }

      const delay = calculateDelay(attempt, baseDelay, maxDelay)
      
      logger.warn(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`, error)
      
      if (onRetry) {
        onRetry(attempt, error)
      }

      await sleep(delay)
    }
  }

  throw lastError
}

function defaultShouldRetry(error: any): boolean {
  // Retry on network errors, 5xx errors, and rate limiting
  if (error?.code === 'NETWORK_ERROR' || error?.code === 'TIMEOUT') {
    return true
  }

  if (error?.status >= 500 && error?.status < 600) {
    return true
  }

  if (error?.status === 429) {
    return true
  }

  return false
}

function calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1)
  const jitter = Math.random() * 0.1 * exponentialDelay
  const delay = exponentialDelay + jitter

  return Math.min(delay, maxDelay)
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
