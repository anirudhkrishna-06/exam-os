export default function OverviewLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="pb-6 border-b border-border flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-4 w-40 bg-muted rounded" />
          <div className="h-8 w-64 bg-muted rounded" />
        </div>
        <div className="h-9 w-32 bg-muted rounded" />
      </div>

      {/* 4 Stats Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-lg border border-border bg-card p-4 space-y-2">
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-6 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Grid Schedule & Exams Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-12 bg-muted/60 rounded" />
          <div className="h-12 bg-muted/60 rounded" />
        </div>
        <div className="h-64 rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-24 bg-muted/60 rounded" />
        </div>
      </div>
    </div>
  )
}

