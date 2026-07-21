import { describe, it, expect, vi } from 'vitest'
import { withRetry } from '../../src/utils/retry'

describe('withRetry', () => {
  it('should return result on successful first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await withRetry(fn)
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should retry on failure and eventually succeed', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce({ code: 'NETWORK_ERROR' })
      .mockResolvedValueOnce('ok')

    const result = await withRetry(fn, { maxAttempts: 3, baseDelay: 10 })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should throw after exhausting retries', async () => {
    const error = { code: 'NETWORK_ERROR' }
    const fn = vi.fn().mockRejectedValue(error)

    await expect(withRetry(fn, { maxAttempts: 3, baseDelay: 10 })).rejects.toEqual(error)
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('should not retry on non-retryable errors', async () => {
    const error = { status: 400 }
    const fn = vi.fn().mockRejectedValue(error)

    await expect(withRetry(fn, { maxAttempts: 3, baseDelay: 10 })).rejects.toEqual(error)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should call onRetry callback on each retry', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce({ code: 'NETWORK_ERROR' })
      .mockRejectedValueOnce({ code: 'TIMEOUT' })
      .mockResolvedValueOnce('ok')

    const onRetry = vi.fn()
    await withRetry(fn, { maxAttempts: 3, baseDelay: 10, onRetry })

    expect(onRetry).toHaveBeenCalledTimes(2)
    expect(onRetry).toHaveBeenCalledWith(1, { code: 'NETWORK_ERROR' })
    expect(onRetry).toHaveBeenCalledWith(2, { code: 'TIMEOUT' })
  })

  it('should retry on 5xx and 429 status codes', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce({ status: 500 })
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValueOnce('ok')

    const result = await withRetry(fn, { maxAttempts: 3, baseDelay: 10 })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('should respect custom shouldRetry', async () => {
    const fn = vi.fn().mockRejectedValue({ custom: true })
    const shouldRetry = vi.fn().mockReturnValue(false)

    await expect(withRetry(fn, { maxAttempts: 3, baseDelay: 10, shouldRetry })).rejects.toEqual({ custom: true })
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should cap delay at maxDelay', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce({ code: 'NETWORK_ERROR' })
      .mockRejectedValueOnce({ code: 'NETWORK_ERROR' })
      .mockRejectedValueOnce({ code: 'NETWORK_ERROR' })
      .mockRejectedValueOnce({ code: 'NETWORK_ERROR' })
      .mockResolvedValueOnce('ok')

    const start = Date.now()
    await withRetry(fn, { maxAttempts: 5, baseDelay: 100000, maxDelay: 50 })
    // With maxDelay=50, each retry should be at most ~50ms
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(1000)
  })
})
