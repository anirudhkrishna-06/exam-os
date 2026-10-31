export default function ReportsLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-pulse">
      <div className="pb-4 border-b border-border space-y-2">
        <div className="h-8 w-56 bg-muted rounded" />
        <div className="h-4 w-40 bg-muted rounded" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 rounded-lg border border-border bg-card p-4 space-y-2">
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-6 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-48 rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="h-5 w-40 bg-muted rounded" />
            <div className="h-24 bg-muted/40 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

