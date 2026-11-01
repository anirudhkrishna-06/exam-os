import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/session'
import { getUnitKnowledge } from '@/services/knowledge.service'
import { UnitKnowledgeSpace } from '@/components/knowledge/unit-knowledge-space'

export const instant = false
export default async function UnitPage({ params }: { params: Promise<{ unitId: string }> }) { const user = await requireAuth(); const { unitId } = await params; const knowledge = await getUnitKnowledge(user.id, unitId); if (!knowledge) notFound(); return <UnitKnowledgeSpace initial={knowledge as any} /> }
