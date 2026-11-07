import { withRedis } from './client';
import { cacheDelete } from './cache';
import { redisKeys, userKeyPattern } from './keys';

export type InvalidationScope = {
  userId: string;
  seasonId?: string;
  subjectId?: string;
};

async function deletePattern(pattern: string) {
  await withRedis(async (client) => {
    let cursor = 0;
    do {
      const [nextCursor, keys] = await client.scan(cursor, { match: pattern, count: 100 });
      cursor = Number(nextCursor);
      if (keys.length) await client.del(...keys);
    } while (cursor !== 0);
  });
}

export async function invalidateUserCaches({ userId, seasonId, subjectId }: InvalidationScope): Promise<void> {
  const keys = [redisKeys.preferences(userId), redisKeys.scheduleSlots(userId), redisKeys.seasons(userId)];
  if (seasonId) {
    keys.push(redisKeys.season(userId, seasonId), redisKeys.subjects(userId, seasonId), redisKeys.progress(userId, seasonId));
    for (const name of ['weekly', 'workload', 'status', 'distribution', 'readiness', 'readiness-v2', 'plan-summary', 'active-plan']) {
      keys.push(redisKeys.dashboard(userId, seasonId, name));
    }
  }
  if (subjectId) keys.push(redisKeys.subject(userId, subjectId), redisKeys.subjectProgress(userId, subjectId));

  await cacheDelete(...keys);
  await deletePattern(userKeyPattern(userId).replace(':*', ':calendar:*'));
  await deletePattern(userKeyPattern(userId).replace(':*', ':day:*'));
  await deletePattern(userKeyPattern(userId).replace(':*', ':revision:*'));
  await deletePattern(userKeyPattern(userId).replace(':*', ':knowledge:*'));
  console.info('[Redis] caches invalidated', { userId, seasonId, subjectId });
}
