"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { CompactCoinRow } from "./components/compact-coin-row"
import { EnhancedTableHeader } from "./components/enhanced-table-header"
import { Pagination } from "./components/pagination"
import { ElegantScrollBar } from "./components/elegant-scroll-bar"
import type { CryptoData, SortOption } from "./utils/beat-calculator"
import { calculateBeatScore } from "./utils/beat-calculator"
import { Input } from "@/components/ui/input"
import { Search, RefreshCw, Sun, Moon, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getCoinsData, prefetchNextPage } from "./actions/fetch-coins"
import { SkeletonCoinRow } from "./components/skeleton-coin-row"
import { SiteHeader } from "./components/site-header"
import { ModernDeFiBackground } from "./components/modern-defi-background"
import { getCurrentUser, onAuthStateChange, type AuthUser } from "./utils/supabase-auth"
import { AuthModal } from "./components/auth-modal"
import { UserMenu } from "./components/user-menu"
import { ElegantCocoriAIWidget } from "./components/elegant-cocori-ai-widget"
import { Badge } from "@/components/ui/badge"
import { ElegantFooter } from "./components/elegant-footer"
import { getBatchConsistencyScores } from "./actions/fetch-consistency-data"
import type { ConsistencyResult } from "./utils/consistency-calculator"
import { useDebounce } from "./hooks/use-debounce"

const ITEMS_PER_PAGE = 100

export default function CoinBeatDashboard() {
  const [searchTerm, setSearchTerm] = useState("")
  const [cryptoData, setCryptoData] = useState<CryptoData[]>([])
  const [sortBy, setSortBy] = useState<SortOption>("rank")
  const [ascending, setAscending] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [pageLoading, setPageLoading] = useState(false)
  const [consistencyLoading, setConsistencyLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const tableRef = useRef<HTMLDivElement>(null)
  const dashboardRef = useRef<HTMLDivElement>(null)

  // Cache for loaded pages with longer duration
  const [pageCache, setPageCache] = useState<Record<number, CryptoData[]>>({})
  const [pageCacheTimestamp, setPageCacheTimestamp] = useState<Record<number, number>>({})
  const [consistencyCache, setConsistencyCache] = useState<Record<string, ConsistencyResult>>({})

  // AI Widget expansion state
  const [isAIExpanded, setIsAIExpanded] = useState(false)
  const [dashboardWidth, setDashboardWidth] = useState(0)

  // Pre-calculate beat scores for better performance
  const [beatScores, setBeatScores] = useState<Record<string, number>>({})

  // Debounced search for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Memoized calculations for better performance
  const sortedData = useMemo(() => {
    let filtered = cryptoData

    // Apply search filter if there's a search term
    if (debouncedSearchTerm.trim()) {
      const searchLower = debouncedSearchTerm.toLowerCase()
      filtered = cryptoData.filter(
        (coin) => coin.name.toLowerCase().includes(searchLower) || coin.symbol.toLowerCase().includes(searchLower),
      )
    }

    // Custom sort function with memoized beat scores
    return [...filtered].sort((a, b) => {
      let aValue: number | string, bValue: number | string

      switch (sortBy) {
        case "rank":
          aValue = a.rank
          bValue = b.rank
          break
        case "name":
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          return ascending ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
        case "healthScore":
          aValue = beatScores[a.coingecko_id] || 0
          bValue = beatScores[b.coingecko_id] || 0
          break
        case "price":
          aValue = a.price || 0
          bValue = b.price || 0
          break
        case "marketCap":
          aValue = a.market_cap || 0
          bValue = b.market_cap || 0
          break
        case "githubStars":
          aValue = a.github_stars || 0
          bValue = b.github_stars || 0
          break
        case "twitterFollowers":
          aValue = a.twitter_followers || 0
          bValue = b.twitter_followers || 0
          break
        case "volume":
          aValue = a.volume_24h || 0
          bValue = b.volume_24h || 0
          break
        case "consistencyScore":
          aValue = consistencyCache[a.coingecko_id]?.consistency_score || 0
          bValue = consistencyCache[b.coingecko_id]?.consistency_score || 0
          break
        default:
          return 0
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return ascending ? aValue - bValue : bValue - aValue
      }

      return 0
    })
  }, [cryptoData, debouncedSearchTerm, sortBy, ascending, beatScores, consistencyCache])

  // Measure dashboard width for AI widget
  useEffect(() => {
    const measureWidth = () => {
      if (dashboardRef.current) {
        setDashboardWidth(dashboardRef.current.offsetWidth)
      }
    }

    measureWidth()
    window.addEventListener("resize", measureWidth)
    return () => window.removeEventListener("resize", measureWidth)
  }, [])

  // Load data for specific page with improved caching and parallel consistency loading
  const loadPageData = useCallback(
    async (page: number, forceRefresh = false) => {
      const cacheKey = page
      const cacheTimestamp = pageCacheTimestamp[cacheKey]
      const now = Date.now()
      const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes

      // Check if we have cached data that's still fresh
      if (!forceRefresh && pageCache[cacheKey] && cacheTimestamp && now - cacheTimestamp < CACHE_DURATION) {
        console.log(`Loading page ${page} from cache`)
        setCryptoData(pageCache[cacheKey])
        return
      }

      try {
        console.log(`Loading page ${page} from API`)

        // Show loading state
        if (page === 1 && !pageCache[1]) {
          setLoading(true)
        } else {
          setPageLoading(true)
        }

        const { coins, totalCount: count } = await getCoinsData(page, ITEMS_PER_PAGE)

        console.log(`Loaded ${coins.length} coins for page ${page}`)

        // Update cache
        setPageCache((prev) => ({ ...prev, [cacheKey]: coins }))
        setPageCacheTimestamp((prev) => ({ ...prev, [cacheKey]: now }))

        setCryptoData(coins)
        setTotalCount(count)
        setLastUpdated(new Date())
        setError(null)

        // Load consistency scores in parallel (non-blocking)
        if (coins.length > 0) {
          setConsistencyLoading(true)
          const coinIds = coins.map((coin) => coin.coingecko_id)

          // Load consistency scores in background
          getBatchConsistencyScores(coinIds)
            .then((scores) => {
              setConsistencyCache((prev) => ({ ...prev, ...scores }))
              console.log(`Loaded consistency scores for ${Object.keys(scores).length} coins`)
            })
            .catch((error) => {
              console.error("Failed to load consistency scores:", error)
            })
            .finally(() => {
              setConsistencyLoading(false)
            })
        }

        // Prefetch next page
        const newTotalPages = Math.ceil(count / ITEMS_PER_PAGE)
        if (page < newTotalPages) {
          console.log(`Prefetching page ${page + 1}`)
          prefetchNextPage(page + 1, ITEMS_PER_PAGE).catch((err) => {
            console.warn(`Prefetch for page ${page + 1} failed:`, err)
          })
        }
      } catch (err) {
        console.error("Failed to load coin data:", err)
        setError("Failed to load coin data. Please try again.")
      } finally {
        setLoading(false)
        setPageLoading(false)
      }
    },
    [pageCache, pageCacheTimestamp],
  )

  const isInitialRender = useRef(true)

  // Initial load
  useEffect(() => {
    console.log("Effect: Initial load page 1 trigger")
    loadPageData(1)
  }, [loadPageData])

  // Subsequent page changes
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false
      return
    }

    console.log(`Effect: currentPage changed to ${currentPage}, triggering loadPageData.`)
    loadPageData(currentPage)
  }, [currentPage, loadPageData])

  // Calculate beat scores once data is loaded with memoization
  useEffect(() => {
    if (cryptoData.length > 0) {
      const scores: Record<string, number> = {}
      cryptoData.forEach((coin) => {
        scores[coin.coingecko_id] = calculateBeatScore(coin)
      })
      setBeatScores(scores)
    }
  }, [cryptoData])

  // Memoized user authentication
  useEffect(() => {
    let isCancelled = false

    // Get initial user
    getCurrentUser().then(({ user }) => {
      if (!isCancelled) {
        setUser(user as AuthUser | null)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = onAuthStateChange((user) => {
      if (!isCancelled) {
        setUser(user)

        // Scroll to top when user logs in
        if (user) {
          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: "smooth" })
          }, 100)
        }
      }
    })

    return () => {
      isCancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const handleSort = useCallback(
    (column: SortOption) => {
      if (sortBy === column) {
        setAscending(!ascending)
      } else {
        setSortBy(column)
        setAscending(column === "rank")
      }
    },
    [sortBy, ascending],
  )

  const handleRefresh = useCallback(async () => {
    // Clear cache for current page and reload
    setPageCache((prev) => {
      const newCache = { ...prev }
      delete newCache[currentPage]
      return newCache
    })
    setPageCacheTimestamp((prev) => {
      const newTimestamp = { ...prev }
      delete newTimestamp[currentPage]
      return newTimestamp
    })

    // Clear consistency cache for current page coins
    const currentCoinIds = cryptoData.map((coin) => coin.coingecko_id)
    setConsistencyCache((prev) => {
      const newCache = { ...prev }
      currentCoinIds.forEach((coinId) => {
        delete newCache[coinId]
      })
      return newCache
    })

    await loadPageData(currentPage, true)
  }, [currentPage, loadPageData, cryptoData])

  const handleAuthSuccess = useCallback(() => {
    // Refresh user data after successful auth
    getCurrentUser().then(({ user }) => {
      setUser(user as AuthUser | null)
    })
  }, [])

  const handleSignOut = useCallback(() => {
    setUser(null)
  }, [])

  const handleAIExpansionChange = useCallback((expanded: boolean) => {
    setIsAIExpanded(expanded)
  }, [])

  const handlePageChange = useCallback(
    (page: number) => {
      console.log(`Changing to page: ${page}`)

      if (searchTerm.trim()) {
        setSearchTerm("")
      }

      setCurrentPage(page)

      // Scroll to top of table area smoothly
      setTimeout(() => {
        if (tableRef.current) {
          const headerOffset = 80
          const elementPosition = tableRef.current.getBoundingClientRect().top
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset

          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth",
          })
        }
      }, 100)
    },
    [searchTerm],
  )

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  return (
    <div className={`min-h-screen transition-all duration-1000 ${isDarkMode ? "dark" : ""}`}>
      <ModernDeFiBackground isDarkMode={isDarkMode} />

      <div ref={dashboardRef} className="relative z-10 max-w-[90rem] mx-auto p-3 sm:p-4 lg:p-6">
        {/* Header Layout */}
        <div className="flex flex-col lg:flex-row items-center justify-between mb-8 gap-6">
          {/* Logo */}
          <SiteHeader isMainPage={true} isDarkMode={isDarkMode} />

          {/* Top Right Controls */}
          <div className="flex items-center gap-3">
            {/* Dark/Light Mode Toggle */}
            <Button
              onClick={() => setIsDarkMode(!isDarkMode)}
              variant="outline"
              className={`h-10 px-4 rounded-xl transition-all duration-300 backdrop-blur-md shadow-lg border-0 ${
                isDarkMode
                  ? "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70 hover:text-slate-100 hover:scale-105"
                  : "bg-white/80 text-slate-700 hover:bg-white/90 hover:text-slate-900 hover:scale-105"
              }`}
            >
              {isDarkMode ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
              {isDarkMode ? "Light" : "Dark"}
            </Button>

            {/* Stats Badges */}
            <Badge
              variant="outline"
              className={`px-4 py-2 text-sm font-medium border rounded-xl transition-all duration-300 backdrop-blur-sm shadow-lg ${
                isDarkMode
                  ? "bg-slate-800/50 text-blue-300 border-blue-500/30 hover:bg-slate-800/70"
                  : "bg-white/60 text-sky-700 border-sky-200/50 hover:bg-white/80"
              }`}
            >
              {totalCount.toLocaleString()} Coins
            </Badge>

            {/* Authentication */}
            {user ? (
              <UserMenu user={user} isDarkMode={isDarkMode} onSignOut={handleSignOut} />
            ) : (
              <AuthModal isDarkMode={isDarkMode} onAuthSuccess={handleAuthSuccess} />
            )}
          </div>
        </div>

        {/* Controls Layout - Search + Filter + Refresh + AI Widget */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Left: Search Bar */}
          <div className="relative flex-1 max-w-lg">
            <Search
              className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 z-10 ${
                isDarkMode ? "text-slate-400" : "text-sky-500"
              }`}
            />
            <Input
              placeholder="Search current page..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-12 h-12 rounded-2xl transition-all duration-300 backdrop-blur-md shadow-lg border-0 ${
                isDarkMode
                  ? "bg-slate-800/60 text-slate-100 placeholder:text-slate-400 focus:bg-slate-800/80 focus:ring-2 focus:ring-blue-400/50"
                  : "bg-white/80 text-slate-900 placeholder:text-sky-500 focus:bg-white/90 focus:ring-2 focus:ring-sky-400/50"
              }`}
            />
          </div>

          {/* Right: Controls + AI Widget */}
          <div className="flex items-start gap-3">
            <Button
              variant="outline"
              className={`h-12 px-4 rounded-2xl transition-all duration-300 backdrop-blur-md shadow-lg border-0 ${
                isDarkMode
                  ? "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70 hover:text-slate-100 hover:scale-105"
                  : "bg-white/80 text-slate-700 hover:bg-white/90 hover:text-slate-900 hover:scale-105"
              }`}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>

            <Button
              onClick={handleRefresh}
              disabled={loading || pageLoading}
              variant="outline"
              className={`h-12 px-4 rounded-2xl transition-all duration-300 backdrop-blur-md shadow-lg border-0 ${
                isDarkMode
                  ? "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70 hover:text-slate-100 hover:scale-105 disabled:hover:scale-100"
                  : "bg-white/80 text-slate-700 hover:bg-white/90 hover:text-slate-900 hover:scale-105 disabled:hover:scale-100"
              }`}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading || pageLoading ? "animate-spin" : ""}`} />
              {loading || pageLoading ? "Loading..." : "Refresh"}
            </Button>

            {/* Elegant CocoriAI Widget */}
            <div className="min-w-[280px]">
              <ElegantCocoriAIWidget
                user={user}
                isDarkMode={isDarkMode}
                onAuthSuccess={handleAuthSuccess}
                onExpansionChange={handleAIExpansionChange}
                dashboardWidth={dashboardWidth}
              />
            </div>
          </div>
        </div>

        {/* Spacer for AI expansion */}
        <div className={`transition-all duration-600 ease-out ${isAIExpanded ? "h-[320px] mb-6" : "h-0"}`} />

        {/* Error Message */}
        {error && (
          <div
            className={`p-3 mb-4 rounded-lg border ${
              isDarkMode ? "bg-red-900/20 border-red-700 text-red-300" : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            {error}
          </div>
        )}

        {/* Consistency Loading Indicator */}
        {consistencyLoading && (
          <div
            className={`p-3 mb-4 rounded-lg border ${
              isDarkMode ? "bg-blue-900/20 border-blue-700 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Loading consistency scores...
            </div>
          </div>
        )}

        {/* Elegant Top Scroll Bar */}
        <ElegantScrollBar targetRef={tableRef} isDarkMode={isDarkMode} />

        {/* Table */}
        <div className={`transition-all duration-600 ease-out ${isAIExpanded ? "transform translate-y-0" : ""}`}>
          {loading ? (
            <div
              className={`rounded-2xl border overflow-hidden shadow-xl backdrop-blur-sm ${
                isDarkMode ? "bg-slate-800/40 border-slate-700/50" : "bg-white/70 border-sky-200/50"
              }`}
            >
              <EnhancedTableHeader
                sortBy={sortBy}
                ascending={ascending}
                onSort={handleSort}
                isDarkMode={isDarkMode}
                user={user}
              />
              <div>
                {Array.from({ length: 10 }).map((_, index) => (
                  <SkeletonCoinRow key={index} isDarkMode={isDarkMode} user={user} />
                ))}
              </div>
            </div>
          ) : (
            <>
              <div
                className={`rounded-2xl border-0 overflow-x-auto shadow-2xl backdrop-blur-md ${
                  isDarkMode ? "bg-slate-800/50" : "bg-white/80"
                }`}
                ref={tableRef}
              >
                <div className="min-w-max">
                  <EnhancedTableHeader
                    sortBy={sortBy}
                    ascending={ascending}
                    onSort={handleSort}
                    isDarkMode={isDarkMode}
                    user={user}
                  />

                  {sortedData.length === 0 ? (
                    <div className={`p-6 text-center ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                      <div className="text-4xl mb-3">🐔</div>
                      <p className="text-base font-medium">
                        {searchTerm ? "No coins found matching your search on this page" : "No coins found"}
                      </p>
                      {searchTerm && (
                        <Button onClick={() => setSearchTerm("")} variant="outline" className="mt-2">
                          Clear search
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div>
                      {pageLoading && (
                        <div className={`p-4 text-center ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Loading page {currentPage}...
                          </div>
                        </div>
                      )}
                      {sortedData.map((coin, index) => (
                        <CompactCoinRow
                          key={coin.coingecko_id}
                          data={coin}
                          index={index}
                          isDarkMode={isDarkMode}
                          beatScore={beatScores[coin.coingecko_id] || 0}
                          consistencyScore={consistencyCache[coin.coingecko_id]?.consistency_score}
                          consistencyDetails={consistencyCache[coin.coingecko_id]}
                          user={user}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  isDarkMode={isDarkMode}
                />
              )}

              {/* Stats */}
              <div className="mt-6 flex justify-center gap-4">
                <div
                  className={`text-center p-4 rounded-2xl transition-all duration-300 backdrop-blur-md shadow-lg border-0 hover:scale-105 bg-gradient-to-br from-amber-500/20 to-orange-500/20 ${
                    isDarkMode ? "bg-slate-800/40" : "bg-white/60"
                  }`}
                >
                  <div className="text-amber-600 text-xl lg:text-2xl font-bold mb-1">{totalCount.toLocaleString()}</div>
                  <div className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                    Total Coins
                  </div>
                </div>

                <div
                  className={`text-center p-4 rounded-2xl transition-all duration-300 backdrop-blur-md shadow-lg border-0 hover:scale-105 bg-gradient-to-br from-blue-500/20 to-purple-500/20 ${
                    isDarkMode ? "bg-slate-800/40" : "bg-white/60"
                  }`}
                >
                  <div className="text-blue-600 text-xl lg:text-2xl font-bold mb-1">
                    {currentPage} / {totalPages}
                  </div>
                  <div className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                    Current Page
                  </div>
                </div>

                <div
                  className={`text-center p-4 rounded-2xl transition-all duration-300 backdrop-blur-md shadow-lg border-0 hover:scale-105 bg-gradient-to-br from-green-500/20 to-emerald-500/20 ${
                    isDarkMode ? "bg-slate-800/40" : "bg-white/60"
                  }`}
                >
                  <div className="text-green-600 text-xl lg:text-2xl font-bold mb-1">
                    {((currentPage - 1) * ITEMS_PER_PAGE + 1).toLocaleString()} -{" "}
                    {Math.min(currentPage * ITEMS_PER_PAGE, totalCount).toLocaleString()}
                  </div>
                  <div className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                    Showing Range
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Status Bar */}
        <div
          className={`mt-4 flex items-center justify-center p-4 rounded-2xl backdrop-blur-md shadow-lg border-0 ${
            isDarkMode ? "bg-slate-800/50" : "bg-white/80"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-2 h-2 rounded-full shadow-lg ${loading || pageLoading ? "animate-pulse" : ""} ${loading || pageLoading ? "bg-yellow-500" : "bg-emerald-500"}`}
            />
            <span className={`text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
              {loading || pageLoading
                ? `Loading page ${currentPage}...`
                : `Live data • Page ${currentPage} • Last updated: ${lastUpdated.toLocaleTimeString()}`}
            </span>
            {consistencyLoading && (
              <span className={`text-xs ${isDarkMode ? "text-blue-300" : "text-blue-600"}`}>
                • Loading consistency scores...
              </span>
            )}
          </div>
        </div>

        {/* Elegant Footer */}
        <ElegantFooter isDarkMode={isDarkMode} />
      </div>
    </div>
  )
}
