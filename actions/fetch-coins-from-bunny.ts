"use server"

import type { CryptoData } from "../utils/beat-calculator"
import { getLatestCryptoJsonFilename } from "../utils/bunny-client"

// Replace with your actual Bunny.net URL
const BUNNY_BASE_URL = "https://cocricoin.b-cdn.net"

// Nuclear cache-busting function - bypasses ALL caching
const getCacheBuster = () => {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000000)
  const session = Math.random().toString(36).substring(7)
  const uuid = crypto.randomUUID ? crypto.randomUUID() : `${Math.random()}-${Date.now()}`
  return `?t=${timestamp}&r=${random}&s=${session}&u=${uuid}&cb=1&nocache=true&bypass=1&fresh=${Date.now()}`
}

export async function getCoinsFromBunny(
  page = 1,
  limit = 50,
): Promise<{
  coins: CryptoData[]
  totalCount: number
  hasNextPage: boolean
  hasPrevPage: boolean
}> {
  try {
    console.log(`Fetching coins from Bunny.net - Page: ${page}, Limit: ${limit}`)
    const startTime = Date.now()

    // Fetch the JSON file from Bunny.net with aggressive cache-busting
    const cacheBuster = getCacheBuster()
    const latestFilename = await getLatestCryptoJsonFilename()
    const url = `${BUNNY_BASE_URL}/${latestFilename}${cacheBuster}`
    console.log(`Fetching from: ${url}`)
    
    const response = await fetch(url, {
      // Force fresh fetch with multiple cache-busting options
      cache: 'no-store',
      next: { revalidate: 0 },
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': `CoinBeat-${Date.now()}`
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from Bunny.net: ${response.statusText}`)
    }

    const allCoins: CryptoData[] = await response.json()
    
    // Apply pagination
    const offset = (page - 1) * limit
    const coins = allCoins.slice(offset, offset + limit)
    const totalCount = allCoins.length

    console.log(`Fetched ${coins.length} coins from Bunny.net in ${Date.now() - startTime}ms`)

    return {
      coins,
      totalCount,
      hasNextPage: page * limit < totalCount,
      hasPrevPage: page > 1,
    }
  } catch (error) {
    console.error("Error fetching from Bunny.net:", error)
    throw error
  }
}

// Get single coin by ID
export async function getCoinByIdFromBunny(coinId: string): Promise<CryptoData | null> {
  try {
    console.log(`Fetching coin by ID from Bunny.net: ${coinId}`)

    const cacheBuster = getCacheBuster()
    const latestFilename = await getLatestCryptoJsonFilename()
    const url = `${BUNNY_BASE_URL}/${latestFilename}${cacheBuster}`
    
    const response = await fetch(url, {
      cache: 'no-store',
      next: { revalidate: 0 },
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': `CoinBeat-${Date.now()}`
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from Bunny.net: ${response.statusText}`)
    }

    const allCoins: CryptoData[] = await response.json()
    const coin = allCoins.find(c => c.coingecko_id === coinId)

    if (!coin) {
      console.warn(`No coin found with ID: ${coinId}`)
      return null
    }

    return coin
  } catch (error) {
    console.error("Error in getCoinByIdFromBunny:", error)
    return null
  }
}

// Search coins
export async function searchCoinsFromBunny(query: string): Promise<{
  coins: CryptoData[]
  error?: string
}> {
  try {
    const cacheBuster = getCacheBuster()
    const latestFilename = await getLatestCryptoJsonFilename()
    const url = `${BUNNY_BASE_URL}/${latestFilename}${cacheBuster}`
    
    const response = await fetch(url, {
      cache: 'no-store',
      next: { revalidate: 0 },
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': `CoinBeat-${Date.now()}`
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from Bunny.net: ${response.statusText}`)
    }

    const allCoins: CryptoData[] = await response.json()
    
    const filteredCoins = allCoins
      .filter(coin => 
        coin.name.toLowerCase().includes(query.toLowerCase()) ||
        coin.symbol.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 20)

    return { coins: filteredCoins }
  } catch (error) {
    console.error("Error in searchCoinsFromBunny:", error)
    return { coins: [], error: "Failed to search coins" }
  }
}

// Get coins by IDs from Bunny.net
export async function getCoinsByIdsFromBunny(coinIds: string[]): Promise<CryptoData[]> {
  try {
    if (!coinIds || coinIds.length === 0) {
      return []
    }

    console.log(`Fetching ${coinIds.length} coins by IDs from Bunny.net`)

    const cacheBuster = getCacheBuster()
    const latestFilename = await getLatestCryptoJsonFilename()
    const url = `${BUNNY_BASE_URL}/${latestFilename}${cacheBuster}`
    
    const response = await fetch(url, {
      cache: 'no-store',
      next: { revalidate: 0 },
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': `CoinBeat-${Date.now()}`
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from Bunny.net: ${response.statusText}`)
    }

    const allCoins: CryptoData[] = await response.json()
    
    // Filter coins by the requested IDs
    const requestedCoins = allCoins.filter(coin => 
      coinIds.includes(coin.coingecko_id) || 
      coinIds.includes(coin.symbol.toLowerCase()) ||
      coinIds.includes(coin.name.toLowerCase())
    )

    console.log(`Successfully fetched ${requestedCoins.length} coins from Bunny.net`)
    return requestedCoins
  } catch (error) {
    console.error("Error in getCoinsByIdsFromBunny:", error)
    return []
  }
}

// Get coins filtered by gem score > 40 AND health score > 70
export async function getGemFilteredCoinsFromBunny(
  page = 1,
  limit = 50,
): Promise<{
  coins: CryptoData[]
  totalCount: number
  hasNextPage: boolean
  hasPrevPage: boolean
}> {
  try {
    console.log(`Fetching gem-filtered coins from Bunny.net - Page: ${page}, Limit: ${limit}`)
    const startTime = Date.now()

    // Fetch the JSON file from Bunny.net with aggressive cache-busting
    const cacheBuster = getCacheBuster()
    const latestFilename = await getLatestCryptoJsonFilename()
    const url = `${BUNNY_BASE_URL}/${latestFilename}${cacheBuster}`
    console.log(`Fetching from: ${url}`)
    
    const response = await fetch(url, {
      // Force fresh fetch with multiple cache-busting options
      cache: 'no-store',
      next: { revalidate: 0 },
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': `CoinBeat-${Date.now()}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch from Bunny.net: ${response.statusText}`)
    }

    const allCoins: CryptoData[] = await response.json()

    // Calculate pagination before filtering
    const offset = (page - 1) * limit

    // Filter coins by gem score > 40 AND health score > 70
    const gemFilteredCoins = allCoins.filter(coin => {
      const gemScore = coin.gem_score || 0
      const healthScore = coin.health_score || 0
      return gemScore > 40 && healthScore > 70
    })

    // Apply pagination after filtering
    const coins = gemFilteredCoins.slice(offset, offset + limit)
    const totalCount = gemFilteredCoins.length

    console.log(`Fetched ${coins.length} gem-filtered coins from Bunny.net in ${Date.now() - startTime}ms (total filtered: ${totalCount})`)

    return {
      coins,
      totalCount,
      hasNextPage: page * limit < totalCount,
      hasPrevPage: page > 1,
    }
  } catch (error) {
    console.error("Error fetching gem-filtered coins from Bunny.net:", error)
    throw error
  }
}

// Get coins filtered by recent addition (no more than 5 days ago)
export async function getNewFilteredCoinsFromBunny(
  page = 1,
  limit = 50,
): Promise<{
  coins: CryptoData[]
  totalCount: number
  hasNextPage: boolean
  hasPrevPage: boolean
}> {
  try {
    console.log(`Fetching new-filtered coins from Bunny.net - Page: ${page}, Limit: ${limit}`)
    const startTime = Date.now()

    // Fetch the JSON file from Bunny.net with aggressive cache-busting
    const cacheBuster = getCacheBuster()
    const latestFilename = await getLatestCryptoJsonFilename()
    const url = `${BUNNY_BASE_URL}/${latestFilename}${cacheBuster}`
    console.log(`Fetching from: ${url}`)
    
    const response = await fetch(url, {
      // Force fresh fetch with multiple cache-busting options
      cache: 'no-store',
      next: { revalidate: 0 },
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': `CoinBeat-${Date.now()}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch from Bunny.net: ${response.statusText}`)
    }

    const allCoins: CryptoData[] = await response.json()

    // Calculate the date 5 days ago
    const fiveDaysAgo = new Date()
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)

    // Calculate pagination before filtering
    const offset = (page - 1) * limit

    // Debug: Log some sample coins to see the data structure
    console.log('Sample coins for new filter debug:', allCoins.slice(0, 3).map(coin => ({
      name: coin.name,
      first_added_date: coin.first_added_date,
      scraped_at: coin.scraped_at,
      last_updated: coin.last_updated
    })))

    // Debug: Log all available fields in first coin
    if (allCoins.length > 0) {
      console.log('All fields in first coin:', Object.keys(allCoins[0]))
      console.log('First coin sample:', allCoins[0])
    }

    // Filter coins by first_added_date (no more than 5 days ago) and limit to 50 total
    const newFilteredCoins = allCoins
      .filter(coin => {
        if (!coin.first_added_date) {
          // Debug: Count coins without first_added_date
          return false
        }
        const firstAddedDate = new Date(coin.first_added_date)
                const isRecent = firstAddedDate >= fiveDaysAgo // Back to 5 days
        
        // Debug logging for first few coins
        if (allCoins.indexOf(coin) < 5) {
          console.log(`Coin ${coin.name}: first_added_date=${coin.first_added_date}, parsed=${firstAddedDate}, fiveDaysAgo=${fiveDaysAgo}, isRecent=${isRecent}`)
        }
        
        return isRecent
      })
      .slice(0, 50) // Limit to maximum 50 coins as specified

    console.log(`Filtered ${newFilteredCoins.length} coins from ${allCoins.length} total coins`)
    console.log('Coins without first_added_date:', allCoins.filter(coin => !coin.first_added_date).length)
    console.log('Date comparison - 5 days ago:', fiveDaysAgo.toISOString())
    
    // Show sample of first_added_date values
    const sampleDates = allCoins.slice(0, 10).map(coin => ({
      name: coin.name,
      first_added_date: coin.first_added_date
    }))
    console.log('Sample first_added_date values:', sampleDates)

    // Apply pagination after filtering
    const coins = newFilteredCoins.slice(offset, offset + limit)
    const totalCount = newFilteredCoins.length

    console.log(`Fetched ${coins.length} new-filtered coins from Bunny.net in ${Date.now() - startTime}ms (total filtered: ${totalCount}, max 50)`)

    return {
      coins,
      totalCount,
      hasNextPage: page * limit < totalCount,
      hasPrevPage: page > 1,
    }
  } catch (error) {
    console.error("Error fetching new-filtered coins from Bunny.net:", error)
    throw error
  }
}