import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/session'
import { getSessionWorkspace } from '@/services/knowledge.service'
import { SessionWorkspace } from '@/components/knowledge/session-workspace'

export const instant = false

export default async function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const user = await requireAuth(); const { sessionId } = await params
  const workspace = await getSessionWorkspace(user.id, sessionId)
  if (!workspace) notFound()
  return <SessionWorkspace initial={workspace as any} />
}
