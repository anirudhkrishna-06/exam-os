import { ScheduleSetup } from '@/components/onboarding/schedule-setup'
import { getCurrentUser } from '@/lib/auth/session'
import { getScheduleSlots } from '@/services/preferences.service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { redirect } from 'next/navigation'

export const instant = false

export const metadata = {
  title: 'Setup your schedule | ExamOS',
}

export default async function SetupPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const slots = await getScheduleSlots(user.id)

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Set up your daily schedule</h1>
          <p className="text-muted-foreground mt-1">
            Configure your available study slots. You can always change these later in Settings.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daily time slots</CardTitle>
            <CardDescription>
              These are the windows when you typically study. Enable, rename, and adjust times as needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScheduleSetup
              initialSlots={
                slots.length > 0
                  ? slots.map((s, i) => ({
                      id: s.id,
                      name: s.name,
                      startTime: s.startTime,
                      endTime: s.endTime,
                      position: i,
                      isEnabled: s.isEnabled,
                    }))
                  : undefined
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
