'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { todayDateString } from '@/lib/date/utils'

export default function PlannerIndexPage() {
  const router = useRouter()

  useEffect(() => {
    const today = todayDateString()
    router.replace(`/planner/${today}`)
  }, [router])

  return (
    <div className="p-8 text-center text-sm text-muted-foreground">
      Redirecting to today&apos;s planner...
    </div>
  )
}
