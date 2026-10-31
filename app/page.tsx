import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'

export const instant = false

export default async function HomePage() {
  const user = await getCurrentUser()
  if (user) {
    redirect('/overview')
  } else {
    redirect('/login')
  }
}
