import 'server-only'

import { and, asc, ilike, ne, or } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema/users'
import { isValidUserSearchQuery, normalizeUserSearchQuery } from '@/lib/users/search-utils'

export async function searchRegisteredUsers(currentUserId: string, rawQuery: string) {
  if (!isValidUserSearchQuery(rawQuery)) return []

  const query = normalizeUserSearchQuery(rawQuery)
  const pattern = `${query}%`
  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(and(
      ne(users.id, currentUserId),
      or(ilike(users.email, pattern), ilike(users.name, pattern)),
    ))
    .orderBy(asc(users.name), asc(users.email))
    .limit(10)
}
