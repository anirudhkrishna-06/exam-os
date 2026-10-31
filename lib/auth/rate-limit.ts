// ============================================================
// lib/auth/rate-limit.ts
// In-memory sliding window rate limiter for auth endpoints.
// ============================================================

interface RateLimitRecord {
  count: number
  resetAt: number
}

const memoryStore = new Map<string, RateLimitRecord>()

// Clean up expired records every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, value] of memoryStore.entries()) {
      if (value.resetAt < now) {
        memoryStore.delete(key)
      }
    }
  }, 10 * 60 * 1000)
}

/**
 * Checks if a key (e.g. IP) has exceeded max attempts in the given window.
 * Returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(
  key: string,
  maxAttempts = 10,
  windowMs = 15 * 60 * 1000,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const record = memoryStore.get(key)

  if (!record || record.resetAt < now) {
    const newRecord: RateLimitRecord = { count: 1, resetAt: now + windowMs }
    memoryStore.set(key, newRecord)
    return { allowed: true, remaining: maxAttempts - 1, resetAt: newRecord.resetAt }
  }

  if (record.count >= maxAttempts) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt }
  }

  record.count += 1
  return { allowed: true, remaining: maxAttempts - record.count, resetAt: record.resetAt }
}

