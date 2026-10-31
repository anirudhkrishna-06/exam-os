import { getCurrentUser } from '@/lib/auth/session'
import { getPreferences, getScheduleSlots } from '@/services/preferences.service'
import { redirect } from 'next/navigation'
import { SettingsView } from '@/components/settings/settings-view'

export const instant = false

export const metadata = {
  title: 'Settings | ExamOS',
}

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const [preferences, slots] = await Promise.all([
    getPreferences(user.id),
    getScheduleSlots(user.id),
  ])

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Personal Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your daily study routine, time slots, and planning velocity
        </p>
      </div>

      <SettingsView
        initialSlots={slots as any}
        initialPreferences={preferences as any}
      />
    </div>
  )
}
