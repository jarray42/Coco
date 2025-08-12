"use server"

import type { CryptoData } from "../utils/beat-calculator"

// Bunny CDN base URL
const BUNNY_CDN_BASE = "https://cocricoin.b-cdn.net"

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
  health_score: number | null // Added for health score history
  consistency_score: number | null // Added for consistency score history
}



// Function to fetch historical data from Bunny CDN
async function fetchHistoryFromBunny(coinId: string): Promise<CoinHistoryData[]> {
  try {
    // Use the exact file name format you use on Bunny
    const cacheBuster = `?t=${Math.floor(Date.now() / 60000)}`; // 1-minute cache buster
    const url = `${BUNNY_CDN_BASE}/price_history/${coinId}.json${cacheBuster}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': `CoinBeat-History-${Date.now()}`
      },
      cache: 'no-store',
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      console.error(`❌ Failed to fetch history for ${coinId}: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    // Transform the data from the format shown in bitcoin.json
    return Object.entries(data).map(([date, dayData]: [string, any], idx) => ({
      id: idx + 1,
      coingecko_id: coinId,
      date,
      price: dayData.price || 0,
      market_cap: dayData.market_cap || 0,
      volume_24h: dayData.volume_24h || 0,
      github_stars: dayData.github_stars || null,
      github_forks: dayData.github_forks || null,
      twitter_followers: dayData.twitter_followers || null,
      health_score: dayData.health_score || null,
      consistency_score: dayData.consistency_score || null
    }));
  } catch (error) {
    console.error(`❌ Error fetching history from Bunny CDN for ${coinId}:`, error);
    return [];
  }
}

export async function getCoinHistory(coinId: string, days: number = 7): Promise<CoinHistoryData[]> {
  try {
    console.log(`🔄 Fetching ${days} days of history for ${coinId}`)

    // Fetch from Bunny CDN only
    const bunnyHistory = await fetchHistoryFromBunny(coinId)
    console.log(`📊 Bunny CDN returned ${bunnyHistory.length} records`)
    
    if (bunnyHistory.length > 0) {
      console.log(`✅ Using Bunny CDN data: ${bunnyHistory.length} records`)
      
      // Filter to the requested number of days (most recent)
      const recentHistory = bunnyHistory
        .filter(item => item.price > 0) // Only include records with valid prices
        .slice(-days) // Get the most recent 'days' records
      
      console.log(`📊 Returning ${recentHistory.length} recent history records from Bunny CDN`)
      return recentHistory
    }

    console.log("❌ No historical data found from Bunny CDN")
    return []
  } catch (error) {
    console.error("❌ Error in getCoinHistory:", error)
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
