
import { Redis } from '@upstash/redis';

const globalForRedis = globalThis as typeof globalThis & {
  examOsRedis?: Redis;
};

function createRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn('[Redis] Upstash REST environment variables are not configured.');
    return null;
  }

  return new Redis({ url, token });
}

export const redis =
  globalForRedis.examOsRedis ?? createRedisClient();

export async function withRedis<T>(operation: (client: Redis) => Promise<T>): Promise<T | null> {
  if (!redis) return null;

  try {
    return await operation(redis);
  } catch (error) {
    console.warn('[Redis] REST operation failed; PostgreSQL fallback will be used.', {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

if (redis && process.env.NODE_ENV !== 'production') {
  globalForRedis.examOsRedis = redis;
}
