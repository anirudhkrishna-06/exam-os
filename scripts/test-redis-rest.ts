import { cacheAside, cacheDelete, cacheGet, cacheSet } from '@/lib/redis/cache'
import { withRedis } from '@/lib/redis/client'
import { invalidateUserCaches } from '@/lib/redis/invalidation'

const testKey = 'examos:rest-smoke:test'
const testUserId = 'rest-smoke-user'

async function main() {
  await cacheDelete(testKey)

  const ping = await withRedis((client) => client.ping())
  if (ping !== 'PONG') throw new Error('Upstash REST ping failed')

  let loads = 0
  const first = await cacheAside(testKey, 60, async () => {
    loads += 1
    return { ok: true }
  })
  const second = await cacheAside(testKey, 60, async () => {
    loads += 1
    return { ok: false }
  })
  const ttl = await withRedis((client) => client.ttl(testKey))

  if (loads !== 1 || second.ok !== true || !ttl || ttl < 1) {
    throw new Error('Cache hit/TTL test failed')
  }

  const calendarKey = `examos:${testUserId}:calendar:2026:11`
  const knowledgeKey = `examos:${testUserId}:knowledge:unit:u1`
  await cacheSet(calendarKey, { ok: true }, 60)
  await cacheSet(knowledgeKey, { ok: true }, 60)
  await invalidateUserCaches({ userId: testUserId })

  if ((await cacheGet(calendarKey)) !== null || (await cacheGet(knowledgeKey)) !== null) {
    throw new Error('Cache invalidation test failed')
  }

  const fallback = await withRedis(async () => {
    throw new Error('simulated unavailable Redis')
  })
  if (fallback !== null) throw new Error('Redis fallback test failed')

  await cacheDelete(testKey)
  console.log(JSON.stringify({ ping, first, second, loads, ttl, invalidation: 'passed', fallback: 'passed' }))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
