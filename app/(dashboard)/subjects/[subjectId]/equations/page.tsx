import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/session'
import { getSubjectById } from '@/services/subject.service'
import { listEquationBookmarks } from '@/services/knowledge.service'
import { EquationsPage } from '@/components/knowledge/equations-page'

export const instant = false

export default async function SubjectEquationsPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const user = await requireAuth()
  const { subjectId } = await params
  const subject = await getSubjectById(user.id, subjectId)
  if (!subject) notFound()
  return <EquationsPage initial={await listEquationBookmarks(user.id, subjectId)} subject={{ id: subject.id, name: subject.name }} />
}
