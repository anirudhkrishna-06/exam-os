import { withRedis } from './client';

const inFlight = new Map<string, Promise<unknown>>();

export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await withRedis((client) => client.get<T | string>(key));
  if (raw === null) {
    console.info('[Redis] cache miss', { key });
    return null;
  }
  try {
    console.info('[Redis] cache hit', { key });
    // @upstash/redis automatically deserializes JSON responses. Keep the
    // string parse fallback for compatibility with manually written entries.
    return (typeof raw === 'string' ? JSON.parse(raw) : raw) as T;
  } catch (error) {
    console.warn('[Redis] invalid cached JSON', { key, message: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) return;
    await withRedis((client) => client.set(key, serialized, { ex: ttlSeconds }).then(() => undefined));
  } catch (error) {
    console.warn('[Redis] cache serialization failed', { key, message: error instanceof Error ? error.message : String(error) });
  }
}

export async function cacheDelete(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await withRedis((client) => client.del(...keys).then(() => undefined));
}

export async function cacheAside<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const pending = loader()
    .then(async (value) => {
      await cacheSet(key, value, ttlSeconds);
      return value;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, pending);
  return pending;
}
