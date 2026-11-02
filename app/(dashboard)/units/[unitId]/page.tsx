import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/session'
import { getUnitKnowledge } from '@/services/knowledge.service'

export const instant = false
export default async function UnitPage({ params }: { params: Promise<{ unitId: string }> }) { const user = await requireAuth(); const { unitId } = await params; const knowledge = await getUnitKnowledge(user.id, unitId); if (!knowledge) notFound(); redirect(`/subjects/${knowledge.unit.subject.id}#unit-${unitId}`) }
