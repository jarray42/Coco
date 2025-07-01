"use server"

import { supabase } from "../utils/supabase"
import { calculateConsistencyScore, type ConsistencyResult } from "../utils/consistency-calculator"

// Optimized batch consistency scores with better caching and error handling
export async function getBatchConsistencyScores(coinIds: string[]): Promise<Record<string, ConsistencyResult>> {
  const results: Record<string, ConsistencyResult> = {}

  if (!coinIds || coinIds.length === 0) {
    return results
  }

  try {
    console.log(`Fetching consistency data for ${coinIds.length} coins`)
    const startTime = Date.now()

    // Single optimized query instead of batches - much faster
    const { data: historyData, error } = await supabase
      .from("price_history")
      .select("coingecko_id, date, github_last_updated, twitter_first_tweet_date")
      .in("coingecko_id", coinIds)
      .order("date", { ascending: false })
      .limit(50 * coinIds.length) // Limit per coin to prevent huge queries

    if (error) {
      console.error("Error fetching consistency data:", error)
      // Return default scores instead of failing completely
      coinIds.forEach((coinId) => {
        results[coinId] = getDefaultConsistencyResult()
      })
      return results
    }

    console.log(`Fetched ${historyData?.length || 0} history records in ${Date.now() - startTime}ms`)

    // Group by coin ID efficiently
    const groupedData: Record<string, any[]> = {}
    historyData?.forEach((entry) => {
      if (!groupedData[entry.coingecko_id]) {
        groupedData[entry.coingecko_id] = []
      }
      groupedData[entry.coingecko_id].push(entry)
    })

    // Calculate consistency scores for each coin
    const calcStart = Date.now()
    coinIds.forEach((coinId) => {
      const coinHistory = groupedData[coinId] || []
      try {
        if (coinHistory.length > 0) {
          results[coinId] = calculateConsistencyScore(coinHistory)
        } else {
          results[coinId] = getDefaultConsistencyResult()
        }
      } catch (error) {
        console.error(`Error calculating consistency for ${coinId}:`, error)
        results[coinId] = getDefaultConsistencyResult()
      }
    })

    console.log(`Calculated ${coinIds.length} consistency scores in ${Date.now() - calcStart}ms`)
    console.log(`Total consistency processing time: ${Date.now() - startTime}ms`)

    return results
  } catch (error) {
    console.error("Error in getBatchConsistencyScores:", error)
    // Return default scores for all coins instead of empty object
    coinIds.forEach((coinId) => {
      results[coinId] = getDefaultConsistencyResult()
    })
    return results
  }
}

// Helper function for default consistency result
function getDefaultConsistencyResult(): ConsistencyResult {
  return {
    github_frequency: 0,
    twitter_frequency: 0,
    github_recency: 0,
    twitter_recency: 0,
    github_score: 0,
    twitter_score: 0,
    consistency_score: 0,
  }
}

// Single coin consistency score (optimized)
export async function getConsistencyScore(coinId: string): Promise<ConsistencyResult | null> {
  const results = await getBatchConsistencyScores([coinId])
  return results[coinId] || null
}

// Prefetch consistency scores for better performance
export async function prefetchConsistencyScores(coinIds: string[]): Promise<void> {
  try {
    // This runs in background and doesn't block the UI
    await getBatchConsistencyScores(coinIds)
    console.log(`Prefetched consistency scores for ${coinIds.length} coins`)
  } catch (error) {
    console.warn("Prefetch consistency scores failed:", error)
  }
}
