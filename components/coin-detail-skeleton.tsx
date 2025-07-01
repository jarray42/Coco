export function CoinDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header Skeleton */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-8 mb-8 shadow-lg">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
            <div className="flex-1">
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2 animate-pulse" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-32 animate-pulse" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2 animate-pulse" />
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Chart Skeleton */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-8 mb-8 shadow-lg">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg mb-6 w-48 animate-pulse" />
          <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
              <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg mb-4 w-32 animate-pulse" />
              <div className="space-y-3">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="flex justify-between">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 animate-pulse" />
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
