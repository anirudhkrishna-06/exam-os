'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PlannerIndexPage() {
  const router = useRouter()

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    router.replace(`/planner/${today}`)
  }, [router])

  return (
    <div className="p-8 text-center text-sm text-muted-foreground">
      Redirecting to today&apos;s planner...
    </div>
  )
}
