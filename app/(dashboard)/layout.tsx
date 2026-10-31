import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'

export const instant = false

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <Sidebar userName={user.name} />
      <main className="flex-1 overflow-auto min-w-0">
        {children}
      </main>
    </div>
  )
}
