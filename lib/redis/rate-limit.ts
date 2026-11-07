import { redis } from './client'

export class RedisRateLimitUnavailableError extends Error {
  constructor() {
    super('Redis rate limiting is unavailable')
    this.name = 'RedisRateLimitUnavailableError'
  }
}

export async function consumeRedisRateLimit(key: string, limit: number, windowSeconds: number) {
  if (!redis) throw new RedisRateLimitUnavailableError()

  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, windowSeconds)
  const ttl = await redis.ttl(key)

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfter: Math.max(1, ttl),
  }
}
