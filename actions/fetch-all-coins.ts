"use server"

import type { CryptoData } from "../utils/beat-calculator"
import { getAllCoinsFromBunny } from "./fetch-all-coins-from-bunny"

export async function getAllCoinsData(): Promise<CryptoData[]> {
  try {
    console.log("Fetching all coins for portfolio from Bunny CDN...")

    // Fetch all coins from Bunny CDN (includes pre-calculated scores)
    const allCoins = await getAllCoinsFromBunny()

    if (!allCoins || allCoins.length === 0) {
      console.log("No coin data found from Bunny CDN")
      return []
    }

    // Calculate rank based on market cap and add logo URL processing
    const coinsWithRank = allCoins.map((coin: CryptoData, index: number) => ({
      ...coin,
      rank: index + 1,
      logo_url:
        coin.logo_url ||
        `https://assets.coingecko.com/coins/images/${coin.coingecko_id}/large/${coin.coingecko_id}.png`,
    }))

    console.log(`Successfully fetched ${coinsWithRank.length} coins from Bunny CDN`)
    return coinsWithRank
  } catch (error) {
    console.error("Error in getAllCoinsData:", error)
    throw new Error("Failed to fetch all coin data from Bunny CDN")
  }
}
