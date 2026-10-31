'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard Section Error:', error)
  }, [error])

  return (
    <div className="p-8 max-w-lg mx-auto text-center space-y-4 my-16">
      <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h2 className="text-xl font-bold tracking-tight text-foreground">
        Unable to load dashboard data
      </h2>
      <p className="text-sm text-muted-foreground">
        There was an issue retrieving your study data. Please try again or return to the overview.
      </p>
      <div className="flex items-center justify-center gap-3 pt-2">
        <Button onClick={() => reset()} variant="default" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Retry
        </Button>
        <Button asChild variant="outline">
          <Link href="/overview" className="gap-2">
            <Home className="w-4 h-4" />
            Overview
          </Link>
        </Button>
      </div>
    </div>
  )
}

