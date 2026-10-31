export default function AnalyticsLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="pb-4 border-b border-border space-y-2">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-4 w-32 bg-muted rounded" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-80 rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="h-4 w-40 bg-muted rounded" />
          <div className="h-64 bg-muted/40 rounded" />
        </div>
        <div className="h-80 rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="h-4 w-40 bg-muted rounded" />
          <div className="h-64 bg-muted/40 rounded" />
        </div>
      </div>
    </div>
  )
}

