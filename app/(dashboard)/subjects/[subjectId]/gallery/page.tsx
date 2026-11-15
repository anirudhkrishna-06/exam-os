import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/session'
import { getSubjectGallery } from '@/services/media.service'
import { SubjectGallery } from '@/components/media/subject-gallery'

export const instant = false
export default async function GalleryPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const user = await requireAuth(); const gallery = await getSubjectGallery(user.id, (await params).subjectId); if (!gallery) notFound(); return <SubjectGallery initial={gallery} />
}
