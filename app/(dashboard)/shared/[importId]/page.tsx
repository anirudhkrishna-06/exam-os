import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/session'
import { getSharedImportWorkspace } from '@/services/sharing.service'
import { SessionWorkspace } from '@/components/knowledge/session-workspace'

export const instant = false

export default async function SharedWorkspacePage({ params }: { params: Promise<{ importId: string }> }) {
  const user = await requireAuth()
  const { importId } = await params
  const workspace = await getSharedImportWorkspace(user.id, importId)
  if (!workspace) notFound()
  return <SessionWorkspace initial={workspace} readOnly sharedBy={workspace.sharedBy} />
}
