"use server"

import { supabase } from "../utils/supabase"
import type { CryptoData } from "../utils/beat-calculator"

export interface CoinHistoryData {
  id: number
  coingecko_id: string
  price: number
  market_cap: number
  volume_24h: number
  github_stars: number | null
  github_forks: number | null
  twitter_followers: number | null
  date: string
}

export async function getCoinDetails(coinId: string): Promise<CryptoData | null> {
  try {
    console.log("Fetching coin details for:", coinId)
    const { data, error } = await supabase.from("coins").select("*").eq("coingecko_id", coinId).single()

    if (error) {
      console.error("Error fetching coin details:", error)
      return null
    }

    console.log("Raw coin data from database:", data)

    // Process the data to add public URLs for logos
    if (data.logo_storage_path) {
      const baseUrl = "https://ohlwxgwioqeyttxtjlyb.supabase.co/storage/v1/object/public/"
      data.logo_url = baseUrl + data.logo_storage_path
    }

    return data
  } catch (error) {
    console.error("Error in getCoinDetails:", error)
    return null
  }
}

export async function getCoinHistory(coinId: string, days: number = 7): Promise<CoinHistoryData[]> {
  try {
    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)

    const startDateStr = startDate.toISOString().split("T")[0] // Format: YYYY-MM-DD
    const endDateStr = endDate.toISOString().split("T")[0] // Format: YYYY-MM-DD

    console.log(`Fetching ${days} days of history for ${coinId} from ${startDateStr} to ${endDateStr}`)

    // Try different parameter orders for the function
    let data, error

    // Try with start_date, end_date order
    const result1 = await supabase.rpc("get_historical_data", {
      p_coin_id: coinId,
      p_start_date: startDateStr,
      p_end_date: endDateStr,
    })

    if (!result1.error) {
      console.log(`Found ${result1.data?.length || 0} records from RPC function`)
      return result1.data || []
    }

    // Try with different parameter names
    const result2 = await supabase.rpc("get_historical_data", {
      coin_id: coinId,
      start_date: startDateStr,
      end_date: endDateStr,
    })

    if (!result2.error) {
      console.log(`Found ${result2.data?.length || 0} records from RPC function (variant 2)`)
      return result2.data || []
    }

    // Try with positional parameters (original order from your example)
    const result3 = await supabase.rpc("get_historical_data", [coinId, startDateStr, endDateStr])

    if (!result3.error) {
      console.log(`Found ${result3.data?.length || 0} records from RPC function (positional)`)
      return result3.data || []
    }

    // Fallback 1: Query the price_history table directly
    console.log("RPC function failed, trying price_history table...")
    const priceHistoryResult = await supabase
      .from("price_history")
      .select("*")
      .eq("coingecko_id", coinId)
      .gte("date", startDateStr)
      .lte("date", endDateStr)
      .order("date", { ascending: true })

    if (!priceHistoryResult.error && priceHistoryResult.data && priceHistoryResult.data.length > 0) {
      console.log(`Found ${priceHistoryResult.data.length} records from price_history table`)
      return priceHistoryResult.data
    }

    // Fallback 2: Query the crypto_data table
    console.log("price_history table failed, trying crypto_data table...")
    const cryptoDataResult = await supabase
      .from("crypto_data")
      .select("coingecko_id, price, market_cap, volume_24h, github_stars, github_forks, twitter_followers, scraped_at")
      .eq("coingecko_id", coinId)
      .gte("scraped_at", startDate.toISOString())
      .lte("scraped_at", endDate.toISOString())
      .order("scraped_at", { ascending: true })
      .limit(Math.min(days * 10, 200)) // Reasonable limit based on days

    if (!cryptoDataResult.error && cryptoDataResult.data && cryptoDataResult.data.length > 0) {
      // Transform crypto_data format to match CoinHistoryData interface
      const transformedData = cryptoDataResult.data.map((item: any, index: number) => ({
        id: index + 1,
        coingecko_id: item.coingecko_id,
        price: item.price || 0,
        market_cap: item.market_cap || 0,
        volume_24h: item.volume_24h || 0,
        github_stars: item.github_stars,
        github_forks: item.github_forks,
        twitter_followers: item.twitter_followers,
        date: item.scraped_at.split('T')[0], // Convert to YYYY-MM-DD format
      }))

      console.log(`Found ${transformedData.length} records from crypto_data table`)
      return transformedData
    }

    console.log("No historical data found in any table")
    return []
  } catch (error) {
    console.error("Error in getCoinHistory:", error)
    return []
  }
}

// Helper function to get different time ranges
export async function getCoinHistoryForPeriod(
  coinId: string, 
  period: '7d' | '30d' | '90d' | '1y'
): Promise<CoinHistoryData[]> {
  const dayMap = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365
  }

  return getCoinHistory(coinId, dayMap[period])
}
