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

export async function getCoinHistory(coinId: string): Promise<CoinHistoryData[]> {
  try {
    // Calculate date range for last 7 days
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - 7)

    const startDateStr = startDate.toISOString().split("T")[0] // Format: YYYY-MM-DD
    const endDateStr = endDate.toISOString().split("T")[0] // Format: YYYY-MM-DD

    // Try different parameter orders for the function
    let data, error

    // Try with start_date, end_date order
    const result1 = await supabase.rpc("get_historical_data", {
      p_coin_id: coinId,
      p_start_date: startDateStr,
      p_end_date: endDateStr,
    })

    if (!result1.error) {
      return result1.data || []
    }

    // Try with different parameter names
    const result2 = await supabase.rpc("get_historical_data", {
      coin_id: coinId,
      start_date: startDateStr,
      end_date: endDateStr,
    })

    if (!result2.error) {
      return result2.data || []
    }

    // Try with positional parameters (original order from your example)
    const result3 = await supabase.rpc("get_historical_data", [coinId, startDateStr, endDateStr])

    if (!result3.error) {
      return result3.data || []
    }

    // Fallback: Query the price_history table directly
    console.log("Function call failed, trying direct table query...")
    const fallbackResult = await supabase
      .from("price_history")
      .select("*")
      .eq("coingecko_id", coinId)
      .gte("date", startDateStr)
      .lte("date", endDateStr)
      .order("date", { ascending: true })

    if (fallbackResult.error) {
      console.error("Error fetching coin history (fallback):", fallbackResult.error)
      return []
    }

    return fallbackResult.data || []
  } catch (error) {
    console.error("Error in getCoinHistory:", error)
    return []
  }
}
