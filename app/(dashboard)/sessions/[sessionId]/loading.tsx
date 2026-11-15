function LoadingLine({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />
}

export default function SessionWorkspaceLoading() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8" aria-busy="true" aria-label="Loading workspace">
      <div className="mb-6 flex items-center justify-between">
        <LoadingLine className="h-4 w-28" />
        <div className="flex gap-2">
          <LoadingLine className="h-8 w-24 rounded-full" />
          <LoadingLine className="h-8 w-20 rounded-full" />
        </div>
      </div>
      <div className="mb-7 space-y-3">
        <LoadingLine className="h-3 w-64" />
        <LoadingLine className="h-9 w-72" />
        <LoadingLine className="h-4 w-40" />
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="flex gap-2 border-b p-3"><LoadingLine className="h-8 w-8" /><LoadingLine className="h-8 w-8" /><LoadingLine className="h-8 w-24" /></div>
          <div className="space-y-5 px-6 py-7 sm:px-10 sm:py-9"><LoadingLine className="h-8 w-3/4" /><LoadingLine className="h-5 w-full" /><LoadingLine className="h-5 w-11/12" /><LoadingLine className="h-5 w-2/3" /><LoadingLine className="mt-12 h-5 w-4/5" /></div>
        </div>
        <div className="hidden space-y-4 xl:block"><LoadingLine className="h-36 w-full rounded-xl" /><LoadingLine className="h-44 w-full rounded-xl" /></div>
      </div>
      <p className="sr-only">Loading your session workspace…</p>
    </main>
  )
}
