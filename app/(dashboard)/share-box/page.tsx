import { requireAuth } from '@/lib/auth/session'
import { getShareBox } from '@/services/sharing.service'
import { ShareBox } from '@/components/sharing/share-box'

export const instant = false
export const metadata = { title: 'Share Box | paramaa... padi da' }

export default async function ShareBoxPage() {
  const user = await requireAuth()
  return <ShareBox initial={await getShareBox(user.id)} />
}
