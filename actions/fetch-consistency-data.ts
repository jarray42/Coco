"use server"

import { supabase } from "../utils/supabase"


// Optimized batch consistency scores with better caching and error handling
export async function getBatchConsistencyScores(coinIds: string[]): Promise<Record<string, any>> {
  const results: Record<string, any> = {}

  if (!coinIds || coinIds.length === 0) {
    return results
  }

  try {
    console.log(`Fetching consistency data for ${coinIds.length} coins`)
    const startTime = Date.now()

    // Fetch pre-calculated consistency scores from the coins table
    const { data: coinsData, error: coinsError } = await supabase
      .from("coins")
      .select("coingecko_id, consistency_score, health_score, twitter_subscore, github_subscore")
      .in("coingecko_id", coinIds)

    if (coinsError) {
      console.error("Error fetching consistency data from coins table:", coinsError)
      // Return default scores instead of failing completely
      coinIds.forEach((coinId) => {
        results[coinId] = getDefaultConsistencyResult()
      })
      return results
    }

    console.log(`Fetched ${coinsData?.length || 0} coins with pre-calculated scores in ${Date.now() - startTime}ms`)

    // Create consistency results from pre-calculated scores
    coinIds.forEach((coinId) => {
      const coinData = coinsData?.find((coin) => coin.coingecko_id === coinId)
      if (coinData && coinData.consistency_score !== null && coinData.consistency_score !== undefined) {
        results[coinId] = {
          github_frequency: 0, // These would need to be calculated separately if needed
          twitter_frequency: 0,
          github_recency: 0,
          twitter_recency: 0,
          github_score: coinData.github_subscore || 0,
          twitter_score: coinData.twitter_subscore || 0,
          consistency_score: coinData.consistency_score,
        }
      } else {
        results[coinId] = getDefaultConsistencyResult()
      }
    })

    console.log(`Processed ${coinIds.length} consistency scores in ${Date.now() - startTime}ms`)

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
function getDefaultConsistencyResult(): any {
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
export async function getConsistencyScore(coinId: string): Promise<any | null> {
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
