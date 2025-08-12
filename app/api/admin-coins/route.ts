import { NextRequest, NextResponse } from "next/server"
import { getAllCoinsFromBunny } from "@/actions/fetch-all-coins-from-bunny"
import type { CryptoData } from "@/utils/beat-calculator"

// GET: Get list of coins for admin selection from Bunny CDN
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search") || ""
    const limit = parseInt(searchParams.get("limit") || "3000")

    // Fetch all coins from Bunny CDN
    const allCoins = await getAllCoinsFromBunny()
    
    if (!allCoins || allCoins.length === 0) {
      return NextResponse.json({ error: "Failed to fetch coins from Bunny CDN" }, { status: 500 })
    }

    // Sort by market cap (descending)
    const sortedCoins = allCoins
      .filter((coin: CryptoData) => coin.market_cap && coin.market_cap > 0)
      .sort((a: CryptoData, b: CryptoData) => (b.market_cap || 0) - (a.market_cap || 0))

    // Apply search filter if provided
    let filteredCoins = sortedCoins
    if (search.trim()) {
      const searchLower = search.toLowerCase()
      filteredCoins = sortedCoins.filter((coin: CryptoData) => 
        coin.name?.toLowerCase().includes(searchLower) ||
        coin.symbol?.toLowerCase().includes(searchLower)
      )
    }

    // Apply limit
    const limitedCoins = filteredCoins.slice(0, limit)

    // Format the response
    const coins = limitedCoins.map((coin: CryptoData) => ({
      id: coin.coingecko_id,
      name: coin.name,
      symbol: coin.symbol,
      market_cap: coin.market_cap
    }))

    return NextResponse.json({ coins })

  } catch (err: any) {
    console.error("Error fetching coins from Bunny CDN for admin:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
} 