import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'

export const instant = false

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <Sidebar userName={user.name} />
      <main className="min-w-0 flex-1 overflow-y-auto md:h-screen">
        {children}
      </main>
    </div>
  )
}
