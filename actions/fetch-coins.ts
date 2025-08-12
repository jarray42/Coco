"use server"

import { supabase } from "../utils/supabase"
import type { CryptoData } from "../utils/beat-calculator"
import { getCoinsFromBunny } from "./fetch-coins-from-bunny"

// Enhanced coin fetching with better error handling and performance
export async function getCoinsData(
  page = 1,
  limit = 50,
): Promise<{
  coins: CryptoData[]
  totalCount: number
  hasNextPage: boolean
  hasPrevPage: boolean
}> {
  try {
    console.log(`Fetching coins data - Page: ${page}, Limit: ${limit}`)
    const startTime = Date.now()
    const offset = (page - 1) * limit

    // Fetch all coins from Bunny CDN (includes pre-calculated scores)
    const bunnyResult = await getCoinsFromBunny(page, limit)
    const coins = bunnyResult.coins
    const totalCount = bunnyResult.totalCount

    console.log(`Fetched ${coins.length} coins in ${Date.now() - startTime}ms`)

    // Process the data to add public URLs for logos
    const processedCoins = coins.map((coin: CryptoData) => ({
      ...coin,
      logo_url: coin.logo_storage_path ? getPublicUrl(coin.logo_storage_path) : null,
    }))

    return {
      coins: processedCoins,
      totalCount,
      hasNextPage: page * limit < totalCount,
      hasPrevPage: page > 1,
    }
  } catch (error) {
    console.error("Error in getCoinsData:", error)
    throw error
  }
}

// Helper function to get public URL for storage files
function getPublicUrl(path: string | null): string | null {
  if (!path) return null
  const baseUrl = "https://ohlwxgwioqeyttxtjlyb.supabase.co/storage/v1/object/public/"
  return baseUrl + path
}

// Prefetch next page for better UX
export async function prefetchNextPage(page: number, limit: number): Promise<void> {
  try {
    console.log(`Prefetching page ${page}`)
    await getCoinsData(page, limit)
    console.log(`Successfully prefetched page ${page}`)
  } catch (error) {
    console.warn(`Failed to prefetch page ${page}:`, error)
  }
}

// Get single coin by ID with proper error handling
export async function getCoinById(coinId: string): Promise<CryptoData | null> {
  try {
    console.log(`Fetching coin by ID: ${coinId}`)

    const { data, error } = await supabase.from("coins").select("*").eq("coingecko_id", coinId).single()

    if (error) {
      console.error("Error fetching coin by ID:", error)
      return null
    }

    if (!data) {
      console.warn(`No coin found with ID: ${coinId}`)
      return null
    }

    // Process the data to add public URL for logo
    return {
      ...data,
      logo_url: data.logo_storage_path ? getPublicUrl(data.logo_storage_path) : null,
    }
  } catch (error) {
    console.error("Error in getCoinById:", error)
    return null
  }
}

// Batch fetch coins by IDs
export async function getCoinsByIds(coinIds: string[]): Promise<CryptoData[]> {
  try {
    if (!coinIds || coinIds.length === 0) {
      return []
    }

    console.log(`Fetching ${coinIds.length} coins by IDs`)

    const { data, error } = await supabase.from("coins").select("*").in("coingecko_id", coinIds)

    if (error) {
      console.error("Error fetching coins by IDs:", error)
      return []
    }

    // Process the data to add public URLs for logos
    const processedCoins = (data || []).map((coin) => ({
      ...coin,
      logo_url: coin.logo_storage_path ? getPublicUrl(coin.logo_storage_path) : null,
    }))

    console.log(`Successfully fetched ${processedCoins.length} coins`)
    return processedCoins
  } catch (error) {
    console.error("Error in getCoinsByIds:", error)
    return []
  }
}

// Legacy function for backward compatibility
export async function fetchCoins(
  page = 1,
  limit = 50,
): Promise<{
  coins: CryptoData[]
  totalCount: number
  error?: string
}> {
  try {
    const result = await getCoinsData(page, limit)
    return {
      coins: result.coins,
      totalCount: result.totalCount,
    }
  } catch (error) {
    console.error("Error in fetchCoins:", error)
    return {
      coins: [],
      totalCount: 0,
      error: error instanceof Error ? error.message : "Failed to fetch coin data",
    }
  }
}

// Search coins function
export async function searchCoins(query: string): Promise<{
  coins: CryptoData[]
  error?: string
}> {
  try {
    const { data, error } = await supabase
      .from("coins")
      .select("*")
      .or(`name.ilike.%${query}%,symbol.ilike.%${query}%`)
      .order("market_cap", { ascending: false })
      .limit(20)

    if (error) {
      console.error("Error searching coins:", error)
      return { coins: [], error: error.message }
    }

    // Process the data to add public URLs for logos
    const processedCoins = (data || []).map((coin) => ({
      ...coin,
      logo_url: coin.logo_storage_path ? getPublicUrl(coin.logo_storage_path) : null,
    }))

    return { coins: processedCoins }
  } catch (error) {
    console.error("Error in searchCoins:", error)
    return { coins: [], error: "Failed to search coins" }
  }
}
