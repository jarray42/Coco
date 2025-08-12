"use server"

import type { CryptoData } from "../utils/beat-calculator"

// Replace with your actual Bunny.net URL
const BUNNY_BASE_URL = "https://cocricoin.b-cdn.net"

// More aggressive cache-busting function
const getCacheBuster = () => {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000000)
  const session = Math.random().toString(36).substring(7)
  return `?t=${timestamp}&r=${random}&s=${session}&cb=1`
}

// Get the latest crypto filename from Bunny Storage
async function getLatestCryptoJsonFilename(): Promise<string> {
  const BUNNY_STORAGE_URL = process.env.BUNNY_STORAGE_URL || "https://storage.bunnycdn.com/cocricoin/"
  const BUNNY_STORAGE_API_KEY = process.env.BUNNY_API_Storage_KEY

  const listUrl = `${BUNNY_STORAGE_URL}`
  console.log('Using Bunny Storage API Key:', BUNNY_STORAGE_API_KEY)
  const response = await fetch(listUrl, {
    method: 'GET',
    headers: {
      'AccessKey': BUNNY_STORAGE_API_KEY,
    } as Record<string, string>,
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('Bunny Storage list error:', errorText)
    throw new Error(`Failed to list files from Bunny Storage: ${response.statusText} (${errorText})`)
  }
  
  const files = await response.json()
  // files is an array of file objects with .ObjectName
  const cryptoFiles = files
    .filter((f: any) => /^crypto_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.json$/.test(f.ObjectName))
    .map((f: any) => f.ObjectName)
    .sort()
  
  if (cryptoFiles.length === 0) throw new Error('No crypto_*.json files found in Bunny Storage.')
  const latest = cryptoFiles[cryptoFiles.length - 1]
  return latest
}

export async function getAllCoinsFromBunny(): Promise<CryptoData[]> {
  try {
    console.log("Fetching all coins from Bunny.net for portfolio...")

    // Get the latest filename dynamically
    const latestFilename = await getLatestCryptoJsonFilename()
    console.log(`Using latest filename: ${latestFilename}`)

    // Fetch the JSON file from Bunny.net with aggressive cache-busting
    const cacheBuster = getCacheBuster()
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

    if (!allCoins || allCoins.length === 0) {
      console.log("No coin data found in Bunny.net")
      return []
    }

    // Calculate rank based on market cap - logo URLs are already in the JSON data
    const coinsWithRank = allCoins.map((coin, index) => ({
      ...coin,
      rank: index + 1,
      // logo_url is already provided in the JSON from Bunny.net
      // Format: "https://cocricoin.b-cdn.net/logos/bitcoin.png"
    }))

    console.log(`Successfully fetched ${coinsWithRank.length} coins from Bunny.net`)
    return coinsWithRank
  } catch (error) {
    console.error("Error in getAllCoinsFromBunny:", error)
    throw new Error("Failed to fetch all coin data from Bunny.net")
  }
} 