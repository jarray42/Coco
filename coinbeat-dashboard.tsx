"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { CompactCoinRow } from "./components/compact-coin-row"
import { EnhancedTableHeader } from "./components/enhanced-table-header"
import { Pagination } from "./components/pagination"
import { ElegantScrollBar } from "./components/elegant-scroll-bar"
import type { CryptoData, SortOption } from "./utils/beat-calculator"
import { getHealthScore } from "./utils/beat-calculator"
import { Input } from "@/components/ui/input"
import { Search, RefreshCw, Sun, Moon, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getCoinsFromBunny, getGemFilteredCoinsFromBunny, getNewFilteredCoinsFromBunny } from "./actions/fetch-coins-from-bunny"
import { fetchCoinsFromBunnyClient } from "./utils/bunny-client"
import { searchCoinsFromBunnyClient } from "./utils/bunny-client"
import { SkeletonCoinRow } from "./components/skeleton-coin-row"
import { SiteHeader } from "./components/site-header"
import { ModernDeFiBackground } from "./components/modern-defi-background"
import { getCurrentUser, onAuthStateChange, type AuthUser } from "./utils/supabase-auth"
import { AuthModal } from "./components/auth-modal"
import { UserMenu } from "./components/user-menu"
import { NotificationBell } from "./components/notification-bell"
import { AnimatedNotificationList } from "./components/animated-notification-list"
import { ElegantCocoriAIWidget } from "./components/elegant-cocori-ai-widget"
import { Badge } from "@/components/ui/badge"
import { ElegantFooter } from "./components/elegant-footer"
import { ElegantTooltip } from "./components/elegant-tooltip"
import { useDebounce } from "./hooks/use-debounce"
import React from "react"
import { SearchIndexItem } from "./app/api/search-index/route"

// Memoized version of CompactCoinRow for better performance
const MemoizedCompactCoinRow = React.memo(CompactCoinRow)

const ITEMS_PER_PAGE = 50

// Client-side cache-busting utility
function getClientCacheBuster() {
  const now = new Date();
  const isoTimestamp = now.toISOString();
  const random = Math.floor(Math.random() * 1000000);
  return `?cb=${encodeURIComponent(isoTimestamp)}&r=${random}&client=1`;
}

export default function CoinBeatDashboard() {
  const [searchTerm, setSearchTerm] = useState("")
  const [cryptoData, setCryptoData] = useState<CryptoData[]>([])
  const [sortBy, setSortBy] = useState<SortOption>("rank")
  const [ascending, setAscending] = useState(true)
  const [coinsLastUpdated, setCoinsLastUpdated] = useState<string | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [pageLoading, setPageLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const tableRef = useRef<HTMLDivElement>(null)
  const dashboardRef = useRef<HTMLDivElement>(null)

  // Cache for loaded pages with longer duration
  const [pageCache, setPageCache] = useState<Record<string, CryptoData[]>>({})
  const [pageCacheTimestamp, setPageCacheTimestamp] = useState<Record<string, number>>({})

  // AI Widget expansion state
  const [isAIExpanded, setIsAIExpanded] = useState(false)
  const [dashboardWidth, setDashboardWidth] = useState(0)

  // Pre-calculate beat scores for better performance
  const [beatScores, setBeatScores] = useState<Record<string, number>>({})

  // Batch load user-specific data for better performance
  const [portfolioStatus, setPortfolioStatus] = useState<Record<string, boolean>>({})
  const [alertStatus, setAlertStatus] = useState<Record<string, boolean>>({})
  const [stakeStatus, setStakeStatus] = useState<Record<string, boolean>>({})
  const [verifiedAlertsStatus, setVerifiedAlertsStatus] = useState<Record<string, string[]>>({})
  const [userDataLoading, setUserDataLoading] = useState(false)
  const [userDataLoadedForCryptoData, setUserDataLoadedForCryptoData] = useState<string>("")

  // Memoized user data to prevent unnecessary re-renders
  const memoizedPortfolioStatus = useMemo(() => portfolioStatus, [portfolioStatus])
  const memoizedAlertStatus = useMemo(() => alertStatus, [alertStatus])
  
  // Track if user data has been loaded to prevent showing neutral states
  const userDataLoaded = useMemo(() => {
    return userDataLoadedForCryptoData !== "" && cryptoData.length > 0 && !userDataLoading
  }, [userDataLoadedForCryptoData, cryptoData.length, userDataLoading])

  // Debounced search for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Sibling Row with Columns approach for dropdown alignment
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterButtonRef = useRef<HTMLButtonElement>(null)
  const filterDropdownRef = useRef<HTMLDivElement>(null)
  const [filterGithub, setFilterGithub] = useState(false)
  const [filterTwitter, setFilterTwitter] = useState(false)

  // Gem filter state
  const [isGemFilterActive, setIsGemFilterActive] = useState(false)
  // New filter state
  const [isNewFilterActive, setIsNewFilterActive] = useState(false)

  // Global search index state
  const [searchIndex, setSearchIndex] = useState<SearchIndexItem[]>([])
  const [searchIndexLoading, setSearchIndexLoading] = useState(false)
  const [searchIndexLoaded, setSearchIndexLoaded] = useState(false)
  const [globalSearchResults, setGlobalSearchResults] = useState<CryptoData[]>([])
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false)
  const [isGlobalSearchActive, setIsGlobalSearchActive] = useState(false)

  // Cache for global search results
  // Cache global search results with TTL and Bunny dataset version awareness
  type GlobalSearchCacheEntry = {
    results: CryptoData[]
    timestamp: number
    filename: string
  }
  const [globalSearchCache, setGlobalSearchCache] = useState<Record<string, GlobalSearchCacheEntry>>({})
  const [fallbackSearchCache, setFallbackSearchCache] = useState<Record<string, GlobalSearchCacheEntry>>({})

  // Memoized calculations for better performance
  // Combine search, filtering, and sorting into one displayedData variable
  const displayedData = useMemo(() => {
    // Use global search results if global search is active
    let data = isGlobalSearchActive ? globalSearchResults : cryptoData

    // Apply local search filter only if global search is not active and there's a search term
    if (!isGlobalSearchActive && debouncedSearchTerm.trim()) {
      const searchLower = debouncedSearchTerm.toLowerCase()
      data = data.filter(
        (coin) => coin.name.toLowerCase().includes(searchLower) || coin.symbol.toLowerCase().includes(searchLower),
      )
    }

    // Apply GitHub/Twitter filters
    if (filterGithub) data = data.filter((coin) => (coin.github_stars ?? 0) > 0)
    if (filterTwitter) data = data.filter((coin) => (coin.twitter_followers ?? 0) > 0)

    // Apply sorting
    return [...data].sort((a, b) => {
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
          aValue = beatScores[a.coingecko_id] || getHealthScore(a)
          bValue = beatScores[b.coingecko_id] || getHealthScore(b)
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
          aValue = a.consistency_score || 50
          bValue = b.consistency_score || 50
          break
        default:
          return 0
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return ascending ? aValue - bValue : bValue - aValue
      }

      return 0
    })
  }, [cryptoData, globalSearchResults, isGlobalSearchActive, debouncedSearchTerm, sortBy, ascending, beatScores, filterGithub, filterTwitter, isGemFilterActive, isNewFilterActive])

  // Filter logic
  const filteredData = useMemo(() => {
    let filtered = cryptoData
    if (filterGithub) filtered = filtered.filter((coin) => (coin.github_stars ?? 0) > 0)
    if (filterTwitter) filtered = filtered.filter((coin) => (coin.twitter_followers ?? 0) > 0)
    return filtered
  }, [cryptoData, filterGithub, filterTwitter])

  // Close dropdown on outside click
  useEffect(() => {
    if (!isFilterOpen) return
    function handleClick(e: MouseEvent) {
      if (
        filterButtonRef.current &&
        filterDropdownRef.current &&
        !filterButtonRef.current.contains(e.target as Node) &&
        !filterDropdownRef.current.contains(e.target as Node)
      ) {
        setIsFilterOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [isFilterOpen])

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
      const cacheKey = isGemFilterActive ? `gem_${page}` : isNewFilterActive ? `new_${page}` : page;
      const cacheTimestamp = pageCacheTimestamp[cacheKey];
      const now = Date.now();
      const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

      // If forceRefresh, clear cache for this page
      if (forceRefresh) {
        setPageCache((prev) => {
          const newCache = { ...prev };
          delete newCache[cacheKey];
          return newCache;
        });
        setPageCacheTimestamp((prev) => {
          const newTimestamp = { ...prev };
          delete newTimestamp[cacheKey];
          return newTimestamp;
        });
      }

      // Only use cache if not forceRefresh
      if (!forceRefresh && pageCache[cacheKey] && (now - (cacheTimestamp || 0) < CACHE_DURATION)) {
        setCryptoData(pageCache[cacheKey]);
        if (pageCache[cacheKey][0]?.last_updated) {
          setCoinsLastUpdated(pageCache[cacheKey][0].last_updated);
        }
        return;
      }

      try {
        console.log(`Loading page ${page} from Bunny.net API (client-side only)${isGemFilterActive ? ' with gem filter' : isNewFilterActive ? ' with new filter' : ''}`);
        setLoading(true);
        
        let coins: CryptoData[];
        let count: number;
        
        if (isGemFilterActive) {
          // Use gem-filtered data
          const result = await getGemFilteredCoinsFromBunny(page, ITEMS_PER_PAGE);
          coins = result.coins;
          count = result.totalCount;
        } else if (isNewFilterActive) {
          // Use new-filtered data
          const result = await getNewFilteredCoinsFromBunny(page, ITEMS_PER_PAGE);
          coins = result.coins;
          count = result.totalCount;
        } else {
          // Use regular data
          // Always fetch from Bunny CDN client-side
          // 1. Fetch the latest filename from the API
          const filenameRes = await fetch('/api/bunny-coins');
          const filenameJson = await filenameRes.json();
          if (!filenameJson.filename) throw new Error(filenameJson.error || 'No filename returned');
          const latestFilename = filenameJson.filename;
          // 2. Fetch the coin data from Bunny CDN using the latest filename
          const cacheBuster = getClientCacheBuster();
          const url = `https://cocricoin.b-cdn.net/${latestFilename}${cacheBuster}`;
          const response = await fetch(url, { method: 'GET' });
          if (!response.ok) throw new Error('Failed to fetch coin data from Bunny CDN');
          const allCoins = await response.json();
          // Apply pagination
          const offset = (page - 1) * ITEMS_PER_PAGE;
          coins = allCoins.slice(offset, offset + ITEMS_PER_PAGE);
          count = allCoins.length;
        }
        
        // Extract last_updated from the first coin (if available)
        if (coins && coins.length > 0 && coins[0].last_updated) {
          setCoinsLastUpdated(coins[0].last_updated);
        } else {
          setCoinsLastUpdated(null);
        }
        console.log(`Loaded ${coins.length} coins for page ${page}${isGemFilterActive ? ' (gem filtered)' : isNewFilterActive ? ' (new filtered)' : ''}`);
        // Update cache
        setPageCache((prev) => ({ ...prev, [cacheKey]: coins }));
        setPageCacheTimestamp((prev) => ({ ...prev, [cacheKey]: now }));
        setCryptoData(coins);
        setTotalCount(count);
      } catch (err) {
        console.error("Failed to load coin data:", err);
        setError("Failed to load coin data. Please try again.");
      } finally {
        setLoading(false);
        setPageLoading(false);
      }
    },
    [pageCache, pageCacheTimestamp, isGemFilterActive, isNewFilterActive]
  );

  // Load search index for global search
  const loadSearchIndex = useCallback(async () => {
    if (searchIndexLoaded || searchIndexLoading) return;
    
    console.log('[SEARCH] Loading search index...');
    setSearchIndexLoading(true);
    
    try {
      const response = await fetch('/api/search-index');
      const data = await response.json();
      
      if (response.ok && data.searchIndex) {
        setSearchIndex(data.searchIndex);
        setSearchIndexLoaded(true);
        console.log(`[SEARCH] Loaded search index with ${data.totalCount} coins (cached: ${data.cached})`);
      } else {
        console.error('[SEARCH] Failed to load search index:', data.error);
        setError('Failed to load search index. Global search may not work properly.');
      }
    } catch (error) {
      console.error('[SEARCH] Error loading search index:', error);
      setError('Failed to load search index. Global search may not work properly.');
    } finally {
      setSearchIndexLoading(false);
    }
  }, [searchIndexLoaded, searchIndexLoading]);

  // Perform global search and load coin details
  const performGlobalSearch = useCallback(async (query: string) => {
    if (!query.trim() || !searchIndexLoaded) {
      setIsGlobalSearchActive(false);
      setGlobalSearchResults([]);
      return;
    }

    const normalizedQuery = query.toLowerCase().trim();
    console.log(`[SEARCH] Performing global search for: "${normalizedQuery}"`);

    // Always get the latest Bunny filename first so cache keys are tied to data version
    const filenameRes = await fetch('/api/bunny-coins');
    const filenameJson = await filenameRes.json();
    if (!filenameJson.filename) throw new Error('Failed to get latest filename');
    const latestFilename: string = filenameJson.filename;

    // TTL for search cache (freshness window)
    const SEARCH_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
    const cacheKey = `${normalizedQuery}@${latestFilename}`;

    // Check versioned cache first
    const cached = globalSearchCache[cacheKey];
    if (cached && (Date.now() - cached.timestamp) < SEARCH_CACHE_TTL_MS) {
      console.log('[SEARCH] Using cached search results (fresh, version-matched)');
      setGlobalSearchResults(cached.results);
      setIsGlobalSearchActive(true);
      return;
    }

    setGlobalSearchLoading(true);
    setIsGlobalSearchActive(true);

    try {
      // Search the lightweight index
      const matchingCoins = searchIndex.filter(coin => 
        coin.name.toLowerCase().includes(normalizedQuery) ||
        coin.symbol.toLowerCase().includes(normalizedQuery)
      ).slice(0, 100); // Limit to top 100 results

      if (matchingCoins.length === 0) {
        setGlobalSearchResults([]);
        return;
      }

      console.log(`[SEARCH] Found ${matchingCoins.length} matching coins in index`);

      // Get coin IDs for fetching full details
      const coinIds = matchingCoins.map(coin => coin.coingecko_id);

      // Fetch full coin details from Bunny using the latest filename
      const cacheBuster = `?cb=${encodeURIComponent(new Date().toISOString())}&r=${Math.floor(Math.random() * 1000000)}&search=1`;
      const url = `https://cocricoin.b-cdn.net/${latestFilename}${cacheBuster}`;
      
      const response = await fetch(url, { 
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent': `CoinBeat-Search-${Date.now()}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch coin details');
      
      const allCoins = await response.json();
      
      // Filter to only the coins that matched our search
      const searchResults = allCoins.filter((coin: CryptoData) => 
        coinIds.includes(coin.coingecko_id)
      );

      // Sort results by rank
      searchResults.sort((a: CryptoData, b: CryptoData) => a.rank - b.rank);

      console.log(`[SEARCH] Loaded full details for ${searchResults.length} search results`);

      // Cache the results with TTL and version
      setGlobalSearchCache(prev => ({
        ...prev,
        [cacheKey]: {
          results: searchResults,
          timestamp: Date.now(),
          filename: latestFilename,
        }
      }));

      setGlobalSearchResults(searchResults);
    } catch (error) {
      console.error('[SEARCH] Error in global search:', error);
      setError('Failed to perform global search. Please try again.');
      setIsGlobalSearchActive(false);
    } finally {
      setGlobalSearchLoading(false);
    }
  }, [searchIndex, searchIndexLoaded, globalSearchCache]);

  // Fallback search when search index isn't ready yet
  const performFallbackSearch = useCallback(async (query: string) => {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) {
      setIsGlobalSearchActive(false);
      setGlobalSearchResults([]);
      return;
    }

    // Get current dataset version
    const filenameRes = await fetch('/api/bunny-coins');
    const filenameJson = await filenameRes.json();
    if (!filenameJson.filename) throw new Error('Failed to get latest filename');
    const latestFilename: string = filenameJson.filename;

    const FALLBACK_TTL_MS = 60 * 1000; // 1 minute
    const cacheKey = `${normalizedQuery}@${latestFilename}`;
    const cached = fallbackSearchCache[cacheKey];
    if (cached && (Date.now() - cached.timestamp) < FALLBACK_TTL_MS) {
      setGlobalSearchResults(cached.results);
      setIsGlobalSearchActive(true);
      return;
    }

    setGlobalSearchLoading(true);
    setIsGlobalSearchActive(true);
    try {
      const { coins } = await searchCoinsFromBunnyClient(normalizedQuery);
      setFallbackSearchCache(prev => ({
        ...prev,
        [cacheKey]: { results: coins, timestamp: Date.now(), filename: latestFilename }
      }));
      setGlobalSearchResults(coins);
    } catch (e) {
      setIsGlobalSearchActive(false);
    } finally {
      setGlobalSearchLoading(false);
    }
  }, [fallbackSearchCache]);

  // Batch load user-specific data for better performance
  const loadUserData = useCallback(async () => {
    if (!user || cryptoData.length === 0) return

    // Prevent multiple simultaneous calls
    if (userDataLoading) {
      console.log('⏳ User data loading already in progress, skipping')
      return
    }

    // Create a hash of the current crypto data to track if we've already loaded for this data
    const cryptoDataHash = cryptoData.map(c => c.coingecko_id).join(',')
    
    // Check if we already have data for this user and crypto set
    if (userDataLoadedForCryptoData === cryptoDataHash) {
      console.log('User data already loaded for this crypto set, skipping reload')
      return
    }

    // Check if we have cached data that's still fresh (30 minutes instead of 5)
    const cacheKey = `user_data_${user.id}_${cryptoDataHash}`
    const cachedData = sessionStorage.getItem(cacheKey)
    if (cachedData) {
      try {
        const { data, timestamp } = JSON.parse(cachedData)
        const now = Date.now()
        const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes (increased from 5)
        
        if (now - timestamp < CACHE_DURATION) {
          console.log('Using cached user data')
          setPortfolioStatus(data.portfolio || {})
          setAlertStatus(data.alerts || {})
          setStakeStatus(data.stake || {})
          setVerifiedAlertsStatus(data.verifiedAlerts || {})
          setUserDataLoadedForCryptoData(cryptoDataHash)
          return
        }
      } catch (error) {
        console.log('Invalid cached data, will reload')
      }
    }

    setUserDataLoading(true)
    try {
      console.log('Loading user data for', cryptoData.length, 'coins')
      
      // Single API call to get all user data (portfolio, alerts, and staking)
      const response = await fetch('/api/user-data-batch', {
        headers: { 
          'Authorization': `Bearer ${user.id}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Set all the data from the single API call
        setPortfolioStatus(data.portfolio.map || {})
        setAlertStatus(data.alerts.map || {})
        setStakeStatus(data.staked.map || {})
        setVerifiedAlertsStatus(data.verifiedAlerts.map || {})

        // Cache the data with longer duration
        const cacheData = {
          portfolio: data.portfolio.map || {},
          alerts: data.alerts.map || {},
          stake: data.staked.map || {},
          verifiedAlerts: data.verifiedAlerts.map || {},
          timestamp: Date.now()
        }
        sessionStorage.setItem(cacheKey, JSON.stringify({ data: cacheData, timestamp: Date.now() }))

        // Mark that we've loaded data for this crypto data set
        setUserDataLoadedForCryptoData(cryptoDataHash)
        
        console.log('User data loaded and cached:', {
          portfolio: data.portfolio.count,
          alerts: data.alerts.count,
          staked: data.staked.count,
          verifiedAlerts: data.verifiedAlerts.count
        })
      } else {
        console.error('Failed to load user data:', response.statusText)
      }
    } catch (error) {
      console.error('Failed to load user data:', error)
    } finally {
      setUserDataLoading(false)
    }
  }, [user, cryptoData, userDataLoading, userDataLoadedForCryptoData])

  // Function to invalidate user data cache when user makes changes
  const invalidateUserDataCache = useCallback(() => {
    if (!user) return
    
    console.log(`🔄 Invalidating user data cache for user: ${user.id}`)
    
    // Clear the cache for this user
    const keysToRemove: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && key.startsWith(`user_data_${user.id}_`)) {
        keysToRemove.push(key)
      }
    }
    
    console.log(`🗑️ Removing ${keysToRemove.length} cached items:`, keysToRemove)
    keysToRemove.forEach(key => sessionStorage.removeItem(key))
    
    // Reset the loaded state to force reload
    setUserDataLoadedForCryptoData("")
    setPortfolioStatus({})
    setAlertStatus({})
    setStakeStatus({})
    setVerifiedAlertsStatus({})
    
    console.log(`✅ User data cache invalidated, will reload on next data fetch`)
    
    // Trigger immediate reload of user data if we have crypto data
    if (cryptoData.length > 0) {
      console.log(`🚀 Triggering immediate user data reload for ${cryptoData.length} coins`)
      // Use setTimeout to ensure state updates are processed first
      setTimeout(() => {
        loadUserData()
      }, 0)
    }
  }, [user, cryptoData.length, loadUserData])

  // Expose the invalidate function to child components
  const userDataContext = useMemo(() => ({
    invalidateCache: invalidateUserDataCache
  }), [invalidateUserDataCache])

  const isInitialRender = useRef(true)

  // Load initial data
  useEffect(() => {
    const initializeData = async () => {
      await loadPageData(1)
    }
    
    initializeData()
  }, [])

  // Load search index when component mounts
  useEffect(() => {
    loadSearchIndex()
  }, [loadSearchIndex])

  // Trigger global search when debounced search term changes
  useEffect(() => {
    if (!debouncedSearchTerm.trim()) {
      setIsGlobalSearchActive(false);
      setGlobalSearchResults([]);
      return;
    }

    if (searchIndexLoaded) {
      performGlobalSearch(debouncedSearchTerm)
    } else if (!searchIndexLoading) {
      // Use fallback search until index is ready
      performFallbackSearch(debouncedSearchTerm)
    }
  }, [debouncedSearchTerm, searchIndexLoaded, searchIndexLoading, performGlobalSearch, performFallbackSearch])

  // Subsequent page changes
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false
      return
    }

    console.log(`Effect: currentPage changed to ${currentPage}, triggering loadPageData.`)
    loadPageData(currentPage)
  }, [currentPage])

  // Calculate beat scores once data is loaded with memoization - OPTIMIZED
  useEffect(() => {
    if (cryptoData.length > 0) {
      // Use setTimeout to defer calculation and prevent UI blocking
      const calculateScores = () => {
        const scores: Record<string, number> = {}
        cryptoData.forEach((coin) => {
          scores[coin.coingecko_id] = getHealthScore(coin)
        })
        setBeatScores(scores)
      }

      // Defer calculation to prevent blocking coin navigation
      setTimeout(calculateScores, 0)
    }
  }, [cryptoData])

  // Load user-specific data when user or crypto data changes - OPTIMIZED
  useEffect(() => {
    if (user && cryptoData.length > 0 && !userDataLoading) {
      // Create a hash of the current crypto data
      const cryptoDataHash = cryptoData.map(c => c.coingecko_id).join(',')
      
      // Only load if we haven't loaded for this exact crypto data set
      if (userDataLoadedForCryptoData !== cryptoDataHash) {
        console.log('Crypto data changed, loading user data')
        // Load user data immediately to prevent visual reloads
        loadUserData()
      } else {
        console.log('Crypto data unchanged, skipping user data reload')
      }
    }
  }, [user, cryptoData, loadUserData, userDataLoading, userDataLoadedForCryptoData])

  // Memoized user authentication
  useEffect(() => {
    let isCancelled = false
    let previousUserId: string | null = null

    // Get initial user
    getCurrentUser().then(({ user }) => {
      if (!isCancelled) {
        setUser(user as AuthUser | null)
        previousUserId = user?.id || null
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = onAuthStateChange((user) => {
      if (!isCancelled) {
        const currentUserId = user?.id || null
        
        // Only clear cache if the user actually changed (login/logout)
        if (previousUserId !== currentUserId) {
          console.log('User changed, clearing cache')
          setPortfolioStatus({})
          setAlertStatus({})
          setStakeStatus({})
          setUserDataLoadedForCryptoData("")
          previousUserId = currentUserId
        }
        
        setUser(user)
      }
    })

    return () => {
      isCancelled = true
      subscription.unsubscribe()
    }
  }, [])

  // Listen for notification deletion events from other pages
  useEffect(() => {
    let lastProcessedTimestamp = 0

    const handleNotificationDeleted = (event: CustomEvent) => {
      console.log(`🎯 Main dashboard received notificationDeleted event:`, event.detail)
      const { coinId, userId } = event.detail
      if (userId === user?.id) {
        console.log(`✅ Notification deleted for coin ${coinId}, invalidating cache`)
        invalidateUserDataCache()
      } else {
        console.log(`❌ User ID mismatch: ${userId} vs ${user?.id}`)
      }
    }

    const handleStorageChange = (event: StorageEvent) => {
      console.log(`🎯 Main dashboard received storage event:`, event.key, event.newValue)
      if (event.key === 'notificationDeleted' && event.newValue) {
        try {
          const data = JSON.parse(event.newValue)
          console.log(`📊 Parsed storage data:`, data)
          if (data.userId === user?.id && data.timestamp > lastProcessedTimestamp) {
            console.log(`✅ Notification deleted for coin ${data.coinId} (from storage), invalidating cache`)
            lastProcessedTimestamp = data.timestamp
            invalidateUserDataCache()
            // Clear the storage item to prevent multiple triggers
            localStorage.removeItem('notificationDeleted')
          } else {
            console.log(`❌ Storage event ignored: userId=${data.userId}, user?.id=${user?.id}, timestamp=${data.timestamp}, lastProcessed=${lastProcessedTimestamp}`)
          }
        } catch (error) {
          console.error('Error parsing notification deleted event:', error)
        }
      }
    }

    console.log(`🎧 Setting up event listeners for user: ${user?.id}`)
    
    // Listen for custom events
    window.addEventListener('notificationDeleted', handleNotificationDeleted as EventListener)
    
    // Listen for storage events (for cross-tab communication)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      console.log(`🎧 Cleaning up event listeners for user: ${user?.id}`)
      window.removeEventListener('notificationDeleted', handleNotificationDeleted as EventListener)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [user?.id, invalidateUserDataCache])

  // Disabled auto-refresh on tab visibility change to prevent unwanted reloads when returning to the tab.
  // If you want to restore this feature, uncomment this block.
  /*
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && cryptoData.length > 0) {
        // Auto-purge and refresh when user returns to the tab
        const refreshData = async () => {
          await autoPurgeCache()
          await loadPageData(currentPage, true)
        }
        refreshData()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [cryptoData.length, currentPage, autoPurgeCache])
  */

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

  // Update handleRefresh to always force a fresh fetch from Bunny and invalidate user data cache
  const handleRefresh = useCallback(async () => {
    // Invalidate user data cache first
    invalidateUserDataCache();
    // Clear global search cache and re-run the active search (to refresh stale results)
    setGlobalSearchCache({});
    if (isGlobalSearchActive && debouncedSearchTerm.trim()) {
      try {
        await performGlobalSearch(debouncedSearchTerm);
      } catch (e) {
        // ignore
      }
    }
    // Clear cache for current page and reload with forceRefresh=true
    await loadPageData(currentPage, true);
  }, [currentPage, loadPageData, invalidateUserDataCache, isGlobalSearchActive, debouncedSearchTerm, performGlobalSearch]);

  // Handle gem filter toggle
  const handleGemFilterToggle = useCallback(async () => {
    const newGemFilterState = !isGemFilterActive;
    
    // Reset to page 1 when switching modes
    setCurrentPage(1);
    
    // Clear search term when switching modes
    if (searchTerm.trim()) {
      setSearchTerm("");
    }
    
    // Disable other filters when activating gem filter
    if (newGemFilterState) {
      setIsNewFilterActive(false);
    }
    
    // Update state immediately
    setIsGemFilterActive(newGemFilterState);
    
    // Load data with the new filter state by calling the function directly
    try {
      console.log(`Loading page 1 with gem filter: ${newGemFilterState}`);
      
      // Clear cache for the new filter state
      const cacheKey = newGemFilterState ? `gem_1` : 1;
      setPageCache((prev) => {
        const newCache = { ...prev };
        delete newCache[cacheKey];
        return newCache;
      });
      setPageCacheTimestamp((prev) => {
        const newTimestamp = { ...prev };
        delete newTimestamp[cacheKey];
        return newTimestamp;
      });
      
      setLoading(true);
      
      let coins: CryptoData[];
      let count: number;
      
      if (newGemFilterState) {
        // Use gem-filtered data
        const result = await getGemFilteredCoinsFromBunny(1, ITEMS_PER_PAGE);
        coins = result.coins;
        count = result.totalCount;
      } else {
        // Use regular data
        const filenameRes = await fetch('/api/bunny-coins');
        const filenameJson = await filenameRes.json();
        if (!filenameJson.filename) throw new Error(filenameJson.error || 'No filename returned');
        const latestFilename = filenameJson.filename;
        const cacheBuster = getClientCacheBuster();
        const url = `https://cocricoin.b-cdn.net/${latestFilename}${cacheBuster}`;
        const response = await fetch(url, { method: 'GET' });
        if (!response.ok) throw new Error('Failed to fetch coin data from Bunny CDN');
        const allCoins = await response.json();
        const offset = 0; // page 1
        coins = allCoins.slice(offset, offset + ITEMS_PER_PAGE);
        count = allCoins.length;
      }
      
      // Extract last_updated from the first coin (if available)
      if (coins && coins.length > 0 && coins[0].last_updated) {
        setCoinsLastUpdated(coins[0].last_updated);
      } else {
        setCoinsLastUpdated(null);
      }
      
      console.log(`Loaded ${coins.length} coins for page 1${newGemFilterState ? ' (gem filtered)' : ''}`);
      
      // Update cache and data
      const now = Date.now();
      setPageCache((prev) => ({ ...prev, [cacheKey]: coins }));
      setPageCacheTimestamp((prev) => ({ ...prev, [cacheKey]: now }));
      setCryptoData(coins);
      setTotalCount(count);
      
    } catch (err) {
      console.error("Failed to load coin data:", err);
      setError("Failed to load coin data. Please try again.");
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  }, [isGemFilterActive, searchTerm, pageCache, pageCacheTimestamp]);

  // Handle new filter toggle
  const handleNewFilterToggle = useCallback(async () => {
    const newNewFilterState = !isNewFilterActive;
    
    // Reset to page 1 when switching modes
    setCurrentPage(1);
    
    // Clear search term when switching modes
    if (searchTerm.trim()) {
      setSearchTerm("");
    }
    
    // Disable other filters when activating new filter
    if (newNewFilterState) {
      setIsGemFilterActive(false);
    }
    
    // Update state immediately
    setIsNewFilterActive(newNewFilterState);
    
    // Load data with the new filter state by calling the function directly
    try {
      console.log(`Loading page 1 with new filter: ${newNewFilterState}`);
      
      // Clear cache for the new filter state
      const cacheKey = newNewFilterState ? `new_1` : 1;
      setPageCache((prev) => {
        const newCache = { ...prev };
        delete newCache[cacheKey];
        return newCache;
      });
      setPageCacheTimestamp((prev) => {
        const newTimestamp = { ...prev };
        delete newTimestamp[cacheKey];
        return newTimestamp;
      });
      
      setLoading(true);
      
      let coins: CryptoData[];
      let count: number;
      
      if (newNewFilterState) {
        // Use new-filtered data
        const result = await getNewFilteredCoinsFromBunny(1, ITEMS_PER_PAGE);
        coins = result.coins;
        count = result.totalCount;
      } else {
        // Use regular data
        const filenameRes = await fetch('/api/bunny-coins');
        const filenameJson = await filenameRes.json();
        if (!filenameJson.filename) throw new Error(filenameJson.error || 'No filename returned');
        const latestFilename = filenameJson.filename;
        const cacheBuster = getClientCacheBuster();
        const url = `https://cocricoin.b-cdn.net/${latestFilename}${cacheBuster}`;
        const response = await fetch(url, { method: 'GET' });
        if (!response.ok) throw new Error('Failed to fetch coin data from Bunny CDN');
        const allCoins = await response.json();
        const offset = 0; // page 1
        coins = allCoins.slice(offset, offset + ITEMS_PER_PAGE);
        count = allCoins.length;
      }
      
      // Extract last_updated from the first coin (if available)
      if (coins && coins.length > 0 && coins[0].last_updated) {
        setCoinsLastUpdated(coins[0].last_updated);
      } else {
        setCoinsLastUpdated(null);
      }
      
      console.log(`Loaded ${coins.length} coins for page 1${newNewFilterState ? ' (new filtered)' : ''}`);
      
      // Update cache and data
      const now = Date.now();
      setPageCache((prev) => ({ ...prev, [cacheKey]: coins }));
      setPageCacheTimestamp((prev) => ({ ...prev, [cacheKey]: now }));
      setCryptoData(coins);
      setTotalCount(count);
      
    } catch (err) {
      console.error("Failed to load coin data:", err);
      setError("Failed to load coin data. Please try again.");
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  }, [isNewFilterActive, searchTerm, pageCache, pageCacheTimestamp]);

  const handleAuthSuccess = useCallback(() => {
    // Refresh user data after successful auth
    getCurrentUser().then(({ user }) => {
      setUser(user as AuthUser | null)
    })
  }, [])

  const handleSignOut = useCallback(() => {
    setUser(null)
    // Refresh the main page after logout
    if (typeof window !== "undefined") {
      window.location.reload()
    }
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

  const [expandedAlertCoinId, setExpandedAlertCoinId] = useState<string | null>(null)
  const [expandedNotificationCoinId, setExpandedNotificationCoinId] = useState<string | null>(null)

  return (
    <div className={`min-h-screen transition-all duration-1000 ${isDarkMode ? "dark" : ""}`}>
      <ModernDeFiBackground isDarkMode={isDarkMode} />

      <div ref={dashboardRef} className={`relative z-10 mx-auto p-3 sm:p-4 lg:p-6 ${user ? 'max-w-[90rem]' : 'max-w-[75rem]'}`}>
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

            {/* Features Button */}
            <Button
              asChild
              variant="outline"
              className={`h-10 px-4 rounded-xl transition-all duration-300 backdrop-blur-md shadow-lg border-0 ${
                isDarkMode
                  ? "bg-slate-800/60 text-blue-300 hover:bg-slate-700/70 hover:text-blue-200 hover:scale-105"
                  : "bg-white/80 text-sky-700 hover:bg-white/90 hover:text-sky-900 hover:scale-105"
              }`}
            >
              <a href="/features">Features</a>
            </Button>

            {/* Plans Button */}
            <Button
              asChild
              variant="outline"
              className={`h-10 px-4 rounded-xl transition-all duration-300 backdrop-blur-md shadow-lg border-0 ${
                isDarkMode
                  ? "bg-slate-800/60 text-purple-300 hover:bg-slate-700/70 hover:text-purple-200 hover:scale-105"
                  : "bg-white/80 text-purple-700 hover:bg-white/90 hover:text-purple-900 hover:scale-105"
              }`}
            >
              <a href="/plans">Plans</a>
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
              {totalCount.toLocaleString()} {isGemFilterActive ? "Gems" : isNewFilterActive ? "New Coins" : "Coins"}
            </Badge>

            {/* Authentication */}
            {user ? (
              <div className="flex items-center gap-3">
                <NotificationBell user={user} isDarkMode={isDarkMode} />
                <UserMenu user={user} isDarkMode={isDarkMode} onSignOut={handleSignOut} />
              </div>
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
              placeholder={
                searchIndexLoaded 
                  ? "Search coins..." 
                  : searchIndexLoading 
                    ? "Loading search index..." 
                    : "Search current page..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-12 ${isGlobalSearchActive ? 'pr-20' : 'pr-4'} h-12 rounded-2xl transition-all duration-300 backdrop-blur-md shadow-lg border-0 ${
                isDarkMode
                  ? "bg-slate-800/60 text-slate-100 placeholder:text-slate-400 focus:bg-slate-800/80 focus:ring-2 focus:ring-blue-400/50"
                  : "bg-white/80 text-slate-900 placeholder:text-sky-500 focus:bg-white/90 focus:ring-2 focus:ring-sky-400/50"
              }`}
              disabled={searchIndexLoading}
            />
            {/* Global search indicator */}
            {isGlobalSearchActive && (
              <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 px-2 py-1 rounded-md text-xs font-medium ${
                isDarkMode 
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" 
                  : "bg-blue-100 text-blue-700 border border-blue-200"
              }`}>
                {globalSearchLoading ? "Searching..." : `${displayedData.length} found`}
              </div>
            )}
          </div>

          {/* Right: Controls + AI Widget */}
          <div className="flex items-start gap-3">
            <Button
              ref={filterButtonRef}
              variant="outline"
              onClick={() => setIsFilterOpen((v) => !v)}
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
            <Button
              onClick={handleNewFilterToggle}
              disabled={loading || pageLoading}
              variant="outline"
              className={`h-12 px-4 rounded-2xl transition-all duration-300 backdrop-blur-md shadow-lg border-0 ${
                isNewFilterActive
                  ? isDarkMode
                    ? "bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30 hover:scale-105"
                    : "bg-green-100 text-green-700 border-green-200 hover:bg-green-200 hover:scale-105"
                  : isDarkMode
                    ? "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70 hover:text-slate-100 hover:scale-105 disabled:hover:scale-100"
                    : "bg-white/80 text-slate-700 hover:bg-white/90 hover:text-slate-900 hover:scale-105 disabled:hover:scale-100"
              }`}
            >
              <span className="w-4 h-4 mr-2 text-xs font-bold flex items-center justify-center">✨</span>
              {isNewFilterActive ? "Show All" : "New"}
            </Button>
            <ElegantTooltip
              content={
                <div className="text-center">
                  <div className="text-sm font-semibold">
                    {isGemFilterActive ? "Show all coins" : "Show gems only"}
                  </div>
                </div>
              }
              position="top"
              isDarkMode={isDarkMode}
            >
              <button
                onClick={handleGemFilterToggle}
                disabled={loading || pageLoading}
                className="relative transition-all duration-300 hover:scale-110 disabled:hover:scale-100 disabled:opacity-50"
              >
                <img
                  src={isGemFilterActive ? "/gem2.png" : "/gem1.png"}
                  alt="Gem Filter"
                  className={`w-[53px] h-[53px] drop-shadow-lg transition-all duration-300 ${
                    isGemFilterActive 
                      ? "filter drop-shadow-amber-400/50" 
                      : "filter drop-shadow-slate-400/30"
                  }`}
                />
              </button>
            </ElegantTooltip>
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
        
        {/* Filter dropdown row - only appears when filter is open */}
        {isFilterOpen && (
          <div className="flex flex-col lg:flex-row gap-4 mb-2">
            {/* Left: Empty space to match search bar */}
            <div className="flex-1 max-w-lg" />
            {/* Right: Filter dropdown positioned to align under Filter button */}
            <div className="flex items-start gap-3">
              <div
                ref={filterDropdownRef}
                className={`overflow-hidden rounded-2xl shadow-2xl border-0 backdrop-blur-md w-[320px] animate-fade-in ${
                  isDarkMode
                    ? "bg-slate-800/90 text-slate-100 border-slate-700"
                    : "bg-white/90 text-slate-900 border-sky-200"
                }`}
                style={{ transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)' }}
              >
                <div className="p-6 flex flex-row gap-6 justify-center">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={filterGithub}
                      onChange={() => setFilterGithub((v) => !v)}
                      className="accent-blue-500 w-5 h-5 rounded focus:ring-2 focus:ring-blue-400"
                    />
                    <span className="text-sm font-medium whitespace-nowrap">Has GitHub</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={filterTwitter}
                      onChange={() => setFilterTwitter((v) => !v)}
                      className="accent-blue-500 w-5 h-5 rounded focus:ring-2 focus:ring-blue-400"
                    />
                    <span className="text-sm font-medium whitespace-nowrap">Has Twitter</span>
                  </label>
                </div>
              </div>
              {/* Empty space to match other controls */}
              <div className="flex-grow" />
            </div>
          </div>
        )}

        {/* Spacer for AI expansion */}
        <div className={`transition-all duration-600 ease-out ${isAIExpanded ? "h-[375px] mb-6" : "h-0"}`} />

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

        {/* Elegant Top Scroll Bar */}
        <ElegantScrollBar targetRef={tableRef as React.RefObject<HTMLElement>} isDarkMode={isDarkMode} />

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
                <div className="w-full">
                  <EnhancedTableHeader
                    sortBy={sortBy}
                    ascending={ascending}
                    onSort={handleSort}
                    isDarkMode={isDarkMode}
                    user={user}
                  />

                  {displayedData.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 dark:text-slate-500">No coins match the selected filters.</div>
                  ) : (
                    // Deduplicate by coingecko_id to ensure unique keys
                    Array.from(new Map(displayedData.map(coin => [coin.coingecko_id, coin])).values()).map((coin) => (
                      <MemoizedCompactCoinRow
                        key={coin.coingecko_id}
                        data={coin}
                        index={cryptoData.findIndex(c => c.coingecko_id === coin.coingecko_id)}
                        isDarkMode={isDarkMode}
                        beatScore={beatScores[coin.coingecko_id] || getHealthScore(coin)}
                        consistencyScore={coin.consistency_score || 0}
                        consistencyDetails={undefined}
                        user={user}
                        expandedAlert={expandedAlertCoinId === coin.coingecko_id}
                        onExpandAlert={() => setExpandedAlertCoinId(expandedAlertCoinId === coin.coingecko_id ? null : coin.coingecko_id)}
                        expandedNotification={expandedNotificationCoinId === coin.coingecko_id}
                        onExpandNotification={() => setExpandedNotificationCoinId(expandedNotificationCoinId === coin.coingecko_id ? null : coin.coingecko_id)}
                        inPortfolio={userDataLoaded ? (memoizedPortfolioStatus[coin.coingecko_id] || false) : undefined}
                        hasAlerts={userDataLoaded ? (memoizedAlertStatus[coin.coingecko_id] || false) : undefined}
                        hasStaked={userDataLoaded ? (stakeStatus[coin.coingecko_id] || false) : undefined}
                        batchVerifiedAlerts={userDataLoaded ? (verifiedAlertsStatus[coin.coingecko_id] || []) : undefined}
                      />
                    ))
                  )}
                </div>
              </div>

              {totalPages > 1 && !isGlobalSearchActive && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  isDarkMode={isDarkMode}
                />
              )}


            </>
          )}
        </div>

        {/* Status Bar */}
        <div
          className={`mt-4 flex items-center justify-between p-4 rounded-2xl backdrop-blur-md shadow-lg border-0 ${
            isDarkMode ? "bg-slate-800/50" : "bg-white/80"
          }`}
        >
          {/* Left: Showing info */}
          <div className={`text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
            {isGlobalSearchActive 
              ? `Showing ${displayedData.length} search results`
              : `Showing ${((currentPage - 1) * ITEMS_PER_PAGE + 1).toLocaleString()} to ${Math.min(currentPage * ITEMS_PER_PAGE, totalCount).toLocaleString()} of ${totalCount.toLocaleString()} ${isGemFilterActive ? "gems" : isNewFilterActive ? "new coins" : "coins"}`}
          </div>

          {/* Right: Status info */}
          <div className="flex items-center gap-3">
            <div
              className={`w-2 h-2 rounded-full shadow-lg ${loading || pageLoading ? "animate-pulse" : ""} ${loading || pageLoading ? "bg-yellow-500" : "bg-emerald-500"}`}
            />
            <span className={`text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
              {loading || pageLoading
                ? `Loading page ${currentPage}...`
                : `Live data • Page ${currentPage} • Last updated: ${coinsLastUpdated ? coinsLastUpdated : "N/A"}`}
            </span>
          </div>
        </div>

        {/* Elegant Footer */}
        <ElegantFooter isDarkMode={isDarkMode} />
      </div>

      {/* Animated Notification List */}
      {user && <AnimatedNotificationList user={user} isDarkMode={isDarkMode} />}
    </div>
  )
}