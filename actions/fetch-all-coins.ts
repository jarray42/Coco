"use server"

import { supabase } from "../utils/supabase"
import type { CryptoData } from "../utils/beat-calculator"

export async function getAllCoinsData(): Promise<CryptoData[]> {
  try {
    console.log("Fetching all coins for portfolio...")

    const { data, error } = await supabase
      .from("coins")
      .select("*, health_score, twitter_subscore, github_subscore, consistency_score, gem_score")
      .order("market_cap", { ascending: false })

    if (error) {
      console.error("Error fetching all coins:", error)
      throw new Error(`Database error: ${error.message}`)
    }

    if (!data) {
      console.log("No coin data found")
      return []
    }

    // Calculate rank based on market cap and add logo URL processing
    const coinsWithRank = data.map((coin, index) => ({
      ...coin,
      rank: index + 1,
      logo_url:
        coin.logo_url ||
        `https://assets.coingecko.com/coins/images/${coin.coingecko_id}/large/${coin.coingecko_id}.png`,
    }))

    console.log(`Successfully fetched ${coinsWithRank.length} coins`)
    return coinsWithRank
  } catch (error) {
    console.error("Error in getAllCoinsData:", error)
    throw new Error("Failed to fetch all coin data")
  }
}
