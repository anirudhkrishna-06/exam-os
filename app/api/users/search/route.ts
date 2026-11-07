import { requireAuth } from '@/lib/auth/session'
import { redisKeys } from '@/lib/redis/keys'
import { consumeRedisRateLimit, RedisRateLimitUnavailableError } from '@/lib/redis/rate-limit'
import { searchRegisteredUsers } from '@/services/user.service'

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, max-age=0' }

export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const query = new URL(request.url).searchParams.get('q')?.trim() ?? ''
    if (query.length < 3) {
      return Response.json({ error: 'Search query must be at least 3 characters' }, { status: 400, headers: NO_STORE_HEADERS })
    }

    const rate = await consumeRedisRateLimit(redisKeys.userSearchRateLimit(user.id), 20, 60)
    if (!rate.allowed) {
      return Response.json({ error: 'Too many user searches. Try again shortly.' }, {
        status: 429,
        headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rate.retryAfter) },
      })
    }

    return Response.json({ results: await searchRegisteredUsers(user.id, query) }, {
      headers: NO_STORE_HEADERS,
    })
  } catch (error) {
    if (error instanceof RedisRateLimitUnavailableError) {
      return Response.json({ error: 'User search is temporarily unavailable' }, { status: 503, headers: NO_STORE_HEADERS })
    }
    const message = error instanceof Error ? error.message : 'Failed to search users'
    return Response.json({ error: message === 'Unauthorized' ? 'Unauthorized' : 'Failed to search users' }, {
      status: message === 'Unauthorized' ? 401 : 500,
      headers: NO_STORE_HEADERS,
    })
  }
}
