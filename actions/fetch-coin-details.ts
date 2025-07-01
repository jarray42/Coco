"use server"

import { supabase } from "../utils/supabase"
import type { CryptoData } from "../utils/beat-calculator"
import { calculateBeatScore, safeNumber } from "../utils/beat-calculator"

export interface CoinDetails extends CryptoData {
  beatScore: number
  consistencyScore: number
  priceHistory: Array<{
    date: string
    price: number
    market_cap: number
    volume: number
  }>
}

export async function getCoinDetails(coinId: string): Promise<CoinDetails | null> {
  try {
    console.log(`Fetching coin details for: ${coinId}`)

    // Initialize priceHistory as empty array
    let priceHistory: Array<{
      date: string
      price: number
      market_cap: number
      volume: number
    }> = []

    // First, try to find the coin by coingecko_id
    let { data: coinData, error: coinError } = await supabase
      .from("coins")
      .select("*")
      .eq("coingecko_id", coinId)
      .single()

    // If not found by coingecko_id, try by symbol (case insensitive)
    if (coinError || !coinData) {
      console.log(`Coin not found by coingecko_id, trying by symbol: ${coinId}`)
      const { data: coinBySymbol, error: symbolError } = await supabase
        .from("coins")
        .select("*")
        .ilike("symbol", coinId)
        .limit(1)
        .single()

      if (!symbolError && coinBySymbol) {
        coinData = coinBySymbol
        coinError = null
      }
    }

    // If still not found, try by name (case insensitive)
    if (coinError || !coinData) {
      console.log(`Coin not found by symbol, trying by name: ${coinId}`)
      const { data: coinByName, error: nameError } = await supabase
        .from("coins")
        .select("*")
        .ilike("name", `%${coinId}%`)
        .limit(1)
        .single()

      if (!nameError && coinByName) {
        coinData = coinByName
        coinError = null
      }
    }

    if (coinError || !coinData) {
      console.error("Coin not found:", coinError)
      return null
    }

    console.log(`Found coin: ${coinData.name} (${coinData.symbol})`)

    // Calculate beat score with proper error handling
    let beatScore = 0
    try {
      beatScore = calculateBeatScore(coinData)
      // Ensure beat score is valid
      if (!isFinite(beatScore) || isNaN(beatScore)) {
        beatScore = 0
      }
    } catch (error) {
      console.error("Error calculating beat score:", error)
      beatScore = 0
    }

    // Calculate consistency score using simple algorithm
    let consistencyScore = 0
    try {
      consistencyScore = calculateSimpleConsistencyScore(coinData)
      // Ensure consistency score is valid
      if (!isFinite(consistencyScore) || isNaN(consistencyScore)) {
        consistencyScore = 0
      }
    } catch (error) {
      console.error("Error calculating consistency score:", error)
      consistencyScore = 0
    }

    // Try to get price history from available tables
    try {
      // First try crypto_data table
      const { data: historyData, error: historyError } = await supabase
        .from("crypto_data")
        .select("scraped_at, price, market_cap, volume_24h")
        .eq("coingecko_id", coinData.coingecko_id)
        .order("scraped_at", { ascending: false })
        .limit(30)

      if (!historyError && historyData && Array.isArray(historyData) && historyData.length > 0) {
        priceHistory = historyData
          .filter((item: any) => item && item.scraped_at && item.price)
          .map((item: any) => ({
            date: item.scraped_at,
            price: safeNumber(item.price, 0),
            market_cap: safeNumber(item.market_cap, 0),
            volume: safeNumber(item.volume_24h, 0),
          }))
          .filter((item) => item.price > 0) // Remove entries with invalid prices
      } else {
        // If no crypto_data, try to create mock history from current data
        const currentPrice = safeNumber(coinData.price, 0)
        const currentMarketCap = safeNumber(coinData.market_cap, 0)
        const currentVolume = safeNumber(coinData.volume_24h, 0)

        if (currentPrice > 0) {
          priceHistory = [
            {
              date: coinData.scraped_at || new Date().toISOString(),
              price: currentPrice,
              market_cap: currentMarketCap,
              volume: currentVolume,
            },
          ]
        }
      }
    } catch (historyError) {
      console.log("Could not fetch price history:", historyError)
      // Create single point from current data if valid
      const currentPrice = safeNumber(coinData.price, 0)
      if (currentPrice > 0) {
        priceHistory = [
          {
            date: coinData.scraped_at || new Date().toISOString(),
            price: currentPrice,
            market_cap: safeNumber(coinData.market_cap, 0),
            volume: safeNumber(coinData.volume_24h, 0),
          },
        ]
      }
    }

    // Ensure all required fields are properly typed and valid
    const result: CoinDetails = {
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
      priceHistory, // This is guaranteed to be an array
    }

    console.log(`Successfully loaded coin details for ${coinData.name}`)
    return result
  } catch (error) {
    console.error("Error fetching coin details:", error)
    return null
  }
}

// Simple consistency score calculation that doesn't rely on external functions
function calculateSimpleConsistencyScore(coinData: any): number {
  try {
    let score = 0

    // GitHub activity score (0-40 points)
    const githubStars = safeNumber(coinData.github_stars, 0)
    if (githubStars > 0) {
      const starsScore = Math.min(githubStars / 1000, 20)
      score += starsScore
    }

    const githubForks = safeNumber(coinData.github_forks, 0)
    if (githubForks > 0) {
      const forksScore = Math.min(githubForks / 500, 10)
      score += forksScore
    }

    if (coinData.github_last_updated) {
      try {
        const lastUpdated = new Date(coinData.github_last_updated)
        if (!isNaN(lastUpdated.getTime())) {
          const daysSinceUpdate = Math.floor((Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24))
          const recencyScore = Math.max(10 - daysSinceUpdate / 10, 0)
          score += recencyScore
        }
      } catch {
        // Invalid date, skip
      }
    }

    // Twitter activity score (0-40 points)
    const twitterFollowers = safeNumber(coinData.twitter_followers, 0)
    if (twitterFollowers > 0) {
      const followersScore = Math.min(twitterFollowers / 10000, 20)
      score += followersScore
    }

    if (coinData.twitter_last_tweet_date) {
      try {
        const lastTweet = new Date(coinData.twitter_last_tweet_date)
        if (!isNaN(lastTweet.getTime())) {
          const daysSinceLastTweet = Math.floor((Date.now() - lastTweet.getTime()) / (1000 * 60 * 60 * 24))
          const activityScore = Math.max(20 - daysSinceLastTweet / 5, 0)
          score += activityScore
        }
      } catch {
        // Invalid date, skip
      }
    }

    // Market activity score (0-20 points)
    const volume24h = safeNumber(coinData.volume_24h, 0)
    const marketCap = safeNumber(coinData.market_cap, 0)

    if (volume24h > 0 && marketCap > 0) {
      const volumeRatio = volume24h / marketCap
      const liquidityScore = Math.min(volumeRatio * 1000, 20)
      score += liquidityScore
    }

    const finalScore = Math.min(Math.round(score), 100)
    return isFinite(finalScore) ? finalScore : 0
  } catch (error) {
    console.error("Error in simple consistency calculation:", error)
    return 0
  }
}

// Prefetch function for hover optimization
export async function prefetchCoinDetails(coinId: string): Promise<void> {
  try {
    getCoinDetails(coinId).catch((error) => {
      console.log("Prefetch failed silently:", error.message)
    })
  } catch (error) {
    // Ignore prefetch errors completely
  }
}

// Helper function to search for coins (for debugging)
export async function searchCoins(query: string) {
  try {
    const { data, error } = await supabase
      .from("coins")
      .select("coingecko_id, name, symbol")
      .or(`coingecko_id.ilike.%${query}%,name.ilike.%${query}%,symbol.ilike.%${query}%`)
      .limit(10)

    if (error) {
      console.error("Search error:", error)
      return []
    }

    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error("Search error:", error)
    return []
  }
}
