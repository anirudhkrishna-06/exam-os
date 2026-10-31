export default function SubjectsLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-pulse">
      <div className="pb-4 border-b border-border space-y-2">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-4 w-32 bg-muted rounded" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-40 rounded-lg border border-border bg-card p-5 space-y-3">
            <div className="h-5 w-40 bg-muted rounded" />
            <div className="h-3 w-28 bg-muted rounded" />
            <div className="h-2 w-full bg-muted/60 rounded" />
            <div className="h-8 w-full bg-muted/40 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

