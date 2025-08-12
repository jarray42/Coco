"use server"

import type { CryptoData } from "../utils/beat-calculator"
import { safeNumber } from "../utils/beat-calculator"
import { getCoinHistory } from "./fetch-coin-history"
import { getCoinByIdFromBunny } from "./fetch-coins-from-bunny"

export interface CoinDetails extends CryptoData {
  beatScore: number
  consistencyScore: number
  priceHistory: Array<{
    date: string
    price: number
    market_cap: number
    volume: number
    github_stars?: number | null
    github_forks?: number | null
    twitter_followers?: number | null
  }>
}

// Lightweight version for navigation - no price history
export interface CoinDetailsBasic extends CryptoData {
  beatScore: number
  consistencyScore: number
}

// In-memory cache for coin details
const coinCache = new Map<string, { data: CoinDetails; timestamp: number }>()
const basicCoinCache = new Map<string, { data: CoinDetailsBasic; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

function getCachedCoin(coinId: string): CoinDetails | null {
  const cached = coinCache.get(coinId)
  if (!cached) return null
  
  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    coinCache.delete(coinId)
    return null
  }
  
  return cached.data
}

function getCachedBasicCoin(coinId: string): CoinDetailsBasic | null {
  const cached = basicCoinCache.get(coinId)
  if (!cached) return null
  
  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    basicCoinCache.delete(coinId)
    return null
  }
  
  return cached.data
}

function setCachedCoin(coinId: string, data: CoinDetails) {
  coinCache.set(coinId, { data, timestamp: Date.now() })
}

function setCachedBasicCoin(coinId: string, data: CoinDetailsBasic) {
  basicCoinCache.set(coinId, { data, timestamp: Date.now() })
}

// Lightweight version for navigation - NO price history fetching
export async function getCoinDetailsBasic(coinId: string): Promise<CoinDetailsBasic | null> {
  const startTime = Date.now()
  try {
    console.log(`🚀 [PERF] Starting getCoinDetailsBasic for: ${coinId}`)

    // Check cache first
    const cached = getCachedBasicCoin(coinId)
    if (cached) {
      console.log(`⚡ [PERF] Cache hit for ${coinId} in ${Date.now() - startTime}ms`)
      return cached
    }

    const bunnyStartTime = Date.now()
    // Get coin data from Bunny.net only
    let coinData = await getCoinByIdFromBunny(coinId)

    console.log(`📊 [PERF] Bunny.net query took ${Date.now() - bunnyStartTime}ms`)

    if (!coinData) {
      console.error("❌ [PERF] Coin not found in Bunny.net")
      return null
    }

    console.log(`✅ [PERF] Found coin: ${coinData.name} (${coinData.symbol})`)

    // Use pre-calculated scores from Bunny CDN
    let beatScore = safeNumber(coinData.health_score, 0)
    let consistencyScore = safeNumber(coinData.consistency_score, 0)

    // Use health score from Bunny CDN only - no fallback calculation
    if (beatScore === 0) {
      beatScore = 50 // Default value if not available in Bunny CDN
    }

    // Use consistency score from Bunny CDN only - no fallback calculation
    if (consistencyScore === 0) {
      consistencyScore = 50 // Default value if not available in Bunny CDN
    }

    // Ensure all required fields are properly typed and valid
    const result: CoinDetailsBasic = {
      ...coinData,
      // Ensure numeric fields are valid numbers
      price: safeNumber(coinData.price, 0),
      market_cap: safeNumber(coinData.market_cap, 0),
      volume_24h: safeNumber(coinData.volume_24h, 0),
      price_change_24h: safeNumber(coinData.price_change_24h, 0),
      github_stars: coinData.github_stars ? safeNumber(coinData.github_stars, 0) : null,
      github_forks: coinData.github_forks ? safeNumber(coinData.github_forks, 0) : null,
      twitter_followers: coinData.twitter_followers ? safeNumber(coinData.twitter_followers, 0) : null,
      rank: safeNumber(coinData.rank, 999999),
      // Add calculated fields
      beatScore,
      consistencyScore,
    }

    // Cache the result
    setCachedBasicCoin(coinId, result)

    console.log(`✅ [PERF] getCoinDetailsBasic completed in ${Date.now() - startTime}ms`)
    return result
  } catch (error) {
    console.error(`❌ [PERF] Error in getCoinDetailsBasic after ${Date.now() - startTime}ms:`, error)
    return null
  }
}

export async function getCoinDetails(coinId: string, includeHistory: boolean = true): Promise<CoinDetails | null> {
  try {
    console.log(`Fetching coin details for: ${coinId} (history: ${includeHistory})`)

    // Check cache first
    const cached = getCachedCoin(coinId)
    if (cached) {
      console.log(`Returning cached data for ${coinId}`)
      return cached
    }

    // Get basic coin data first
    const basicData = await getCoinDetailsBasic(coinId)
    if (!basicData) {
      return null
    }

    // If history is not needed, return basic data with empty history
    if (!includeHistory) {
      const result: CoinDetails = {
        ...basicData,
        priceHistory: []
      }
      setCachedCoin(coinId, result)
      return result
    }

    // Simplified price history - fetch more comprehensive data for better charts
    let priceHistory: Array<{
      date: string
      price: number
      market_cap: number
      volume: number
      github_stars?: number | null
      github_forks?: number | null
      twitter_followers?: number | null
    }> = []

    try {
      console.log(`Fetching comprehensive history for ${basicData.coingecko_id}`)

      // Use the dedicated getCoinHistory function which fetches all historical data
      // Force fresh fetch by bypassing any potential caching
      const historyData = await getCoinHistory(basicData.coingecko_id, 7) // Get 7 days of history by default

      if (historyData && historyData.length > 0) {
        priceHistory = historyData
          .filter((item: any) => item && item.date && item.price)
          .map((item: any) => ({
            date: item.date,
            price: safeNumber(item.price, 0),
            market_cap: safeNumber(item.market_cap, 0),
            volume: safeNumber(item.volume_24h, 0),
            github_stars: item.github_stars,
            github_forks: item.github_forks,
            twitter_followers: item.twitter_followers,
            health_score: item.health_score, // Pass through health_score for chart
            consistency_score: item.consistency_score // Pass through consistency_score for chart
          }))
          .filter((item) => item.price > 0)
          // Data is already in chronological order (oldest to newest) from Bunny CDN

        console.log(`✅ Found ${priceHistory.length} valid history records from Bunny CDN`)
      } else {
        console.log("❌ No historical data found from Bunny CDN")
        // Return empty array instead of creating mock data
          priceHistory = []
      }
    } catch (historyError) {
      console.error("❌ Error fetching price history:", historyError)
      // Return empty array instead of creating mock data
        priceHistory = []
    }

    // Ensure all required fields are properly typed and valid
    const result: CoinDetails = {
      ...basicData,
      priceHistory, // This is guaranteed to be an array
    }

    // Cache the result
    setCachedCoin(coinId, result)

    console.log(`Successfully loaded coin details for ${basicData.name}`)
    return result
  } catch (error) {
    console.error("Error fetching coin details:", error)
    return null
  }
}

// Enhanced coin details with custom time range
export async function getCoinDetailsWithHistory(
  coinId: string, 
  historyDays: number = 30
): Promise<CoinDetails | null> {
  try {
    // Use lightweight version first for faster loading
    const basicResult = await getCoinDetailsBasic(coinId)
    if (!basicResult) return null

    // Create result with empty history initially
    const result: CoinDetails = {
      ...basicResult,
      priceHistory: []
    }

    // Only fetch history if specifically requested
    if (historyDays > 0) {
      const customHistory = await getCustomHistoryRange(coinId, historyDays)
      if (customHistory.length > 0) {
        result.priceHistory = customHistory
      }
    }

    return result
  } catch (error) {
    console.error("Error in getCoinDetailsWithHistory:", error)
    return null
  }
}

// Get historical data for a custom time range
async function getCustomHistoryRange(coinId: string, days: number): Promise<Array<{
  date: string
  price: number
  market_cap: number
  volume: number
  github_stars?: number | null
  github_forks?: number | null
  twitter_followers?: number | null
}>> {
  try {
    // Use the dedicated getCoinHistory function for comprehensive data
    const historyData = await getCoinHistory(coinId, days)

    if (historyData && historyData.length > 0) {
      return historyData
        .filter((item: any) => item && item.date && item.price > 0)
        .map((item: any) => ({
          date: item.date,
          price: safeNumber(item.price, 0),
          market_cap: safeNumber(item.market_cap, 0),
          volume: safeNumber(item.volume_24h, 0),
          github_stars: item.github_stars,
          github_forks: item.github_forks,
          twitter_followers: item.twitter_followers,
        }))
    }

    return []
  } catch (error) {
    console.error("Error fetching custom history range:", error)
    return []
  }
}

// Prefetch function for hover optimization
export async function prefetchCoinDetails(coinId: string): Promise<void> {
  try {
    // Only prefetch if not already cached - use lightweight version
    if (!getCachedBasicCoin(coinId)) {
      getCoinDetailsBasic(coinId).catch((error) => {
        console.log("Prefetch failed silently:", error.message)
      })
    }
  } catch (error) {
    // Ignore prefetch errors completely
  }
}


