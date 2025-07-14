export function CoinDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-900 dark:to-slate-800 animate-pulse">
      {/* Header Skeleton */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            {/* Logo Skeleton */}
            <div className="w-16 h-16 bg-slate-300 dark:bg-slate-600 rounded-xl"></div>
            
            {/* Title Skeleton */}
            <div className="flex-1">
              <div className="h-8 bg-slate-300 dark:bg-slate-600 rounded-lg w-48 mb-2"></div>
              <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-32"></div>
            </div>
            
            {/* Price Skeleton */}
            <div className="text-right">
              <div className="h-8 bg-slate-300 dark:bg-slate-600 rounded-lg w-32 mb-2"></div>
              <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-24"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Chart Skeleton */}
            <div className="bg-white/80 dark:bg-slate-800/80 rounded-xl p-6 shadow-sm">
              <div className="h-6 bg-slate-300 dark:bg-slate-600 rounded w-32 mb-4"></div>
              <div className="h-64 bg-slate-300 dark:bg-slate-600 rounded-lg"></div>
            </div>
            
            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white/80 dark:bg-slate-800/80 rounded-xl p-4 shadow-sm">
                  <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-20 mb-2"></div>
                  <div className="h-6 bg-slate-300 dark:bg-slate-600 rounded w-16"></div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Health Score Skeleton */}
            <div className="bg-white/80 dark:bg-slate-800/80 rounded-xl p-6 shadow-sm">
              <div className="h-6 bg-slate-300 dark:bg-slate-600 rounded w-32 mb-4"></div>
              <div className="h-20 bg-slate-300 dark:bg-slate-600 rounded-lg"></div>
            </div>
            
            {/* Social Links Skeleton */}
            <div className="bg-white/80 dark:bg-slate-800/80 rounded-xl p-6 shadow-sm">
              <div className="h-6 bg-slate-300 dark:bg-slate-600 rounded w-24 mb-4"></div>
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-300 dark:bg-slate-600 rounded"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-20 mb-1"></div>
                      <div className="h-3 bg-slate-300 dark:bg-slate-600 rounded w-16"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
