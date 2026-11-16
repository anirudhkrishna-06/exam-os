import { requireAuth } from '@/lib/auth/session'
import { listEquationBookmarks } from '@/services/knowledge.service'
import { EquationsPage } from '@/components/knowledge/equations-page'

export const instant = false
export default async function EquationsRoute() { const user = await requireAuth(); return <EquationsPage initial={await listEquationBookmarks(user.id)} /> }
