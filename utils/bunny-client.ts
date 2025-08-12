// Client-side Bunny.net fetching utility
// This runs in the browser and bypasses server-side caching

const BUNNY_BASE_URL = "https://cocricoin.b-cdn.net"

const BUNNY_STORAGE_URL = process.env.BUNNY_STORAGE_URL || "https://storage.bunnycdn.com/cocricoin/"
const BUNNY_API_KEY = process.env.BUNNY_API_KEY
const BUNNY_ZONE_NAME = process.env.BUNNY_ZONE_NAME || "cocricoin"
const BUNNY_STORAGE_API_KEY = process.env.BUNNY_API_Storage_KEY;

// Client-side cache-busting
const getClientCacheBuster = () => {
  // Use ISO string with milliseconds for maximum uniqueness
  const now = new Date();
  const isoTimestamp = now.toISOString(); // e.g., 2025-07-23T15:52:06.123Z
  const random = Math.floor(Math.random() * 1000000);
  return `?cb=${encodeURIComponent(isoTimestamp)}&r=${random}&client=1`;
}

// Cache for latest filename
let latestFilenameCache: { filename: string; timestamp: number } | null = null;
const FILENAME_CACHE_DURATION = 60 * 1000; // 1 minute

// List all crypto_*.json files and return the most recent one
export async function getLatestCryptoJsonFilename(): Promise<string> {
  const now = Date.now();
  if (latestFilenameCache && now - latestFilenameCache.timestamp < FILENAME_CACHE_DURATION) {
    return latestFilenameCache.filename;
  }

  const listUrl = `${BUNNY_STORAGE_URL}`;
  console.log('Using Bunny Storage API Key:', BUNNY_STORAGE_API_KEY);
  const response = await fetch(listUrl, {
    method: 'GET',
    headers: {
      'AccessKey': BUNNY_STORAGE_API_KEY,
    } as Record<string, string>,
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Bunny Storage list error:', errorText);
    throw new Error(`Failed to list files from Bunny Storage: ${response.statusText} (${errorText})`);
  }
  const files = await response.json();
  // files is an array of file objects with .ObjectName
  const cryptoFiles = files
    .filter((f: any) => /^crypto_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.json$/.test(f.ObjectName))
    .map((f: any) => f.ObjectName)
    .sort()
  if (cryptoFiles.length === 0) throw new Error('No crypto_*.json files found in Bunny Storage.');
  const latest = cryptoFiles[cryptoFiles.length - 1];
  latestFilenameCache = { filename: latest, timestamp: now };
  return latest;
}

export const fetchCoinsFromBunnyClient = async (
  page = 1,
  limit = 50
): Promise<{
  coins: any[]
  totalCount: number
  hasNextPage: boolean
  hasPrevPage: boolean
}> => {
  try {
    console.log(`[CLIENT] Fetching coins from Bunny.net - Page: ${page}, Limit: ${limit}`)
    
    const latestFilename = await getLatestCryptoJsonFilename();
    const cacheBuster = getClientCacheBuster()
    const url = `${BUNNY_BASE_URL}/${latestFilename}${cacheBuster}`
    console.log(`[CLIENT] Fetching from: ${url}`)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': `CoinBeat-Client-${Date.now()}`
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from Bunny.net: ${response.statusText}`)
    }

    const json = await response.json();
    const allCoins = Array.isArray(json) ? json : json.coins;
    console.log('[CLIENT] Parsed coins:', allCoins);
    // Apply pagination
    const offset = (page - 1) * limit
    const coins = allCoins.slice(offset, offset + limit)
    const totalCount = allCoins.length

    console.log(`[CLIENT] Fetched ${coins.length} coins from Bunny.net`)

    return {
      coins,
      totalCount,
      hasNextPage: page * limit < totalCount,
      hasPrevPage: page > 1,
    }
  } catch (error) {
    console.error("[CLIENT] Error fetching from Bunny.net:", error)
    throw error
  }
}

export const searchCoinsFromBunnyClient = async (query: string): Promise<{
  coins: any[]
  error?: string
}> => {
  try {
    const latestFilename = await getLatestCryptoJsonFilename();
    const cacheBuster = getClientCacheBuster()
    const url = `${BUNNY_BASE_URL}/${latestFilename}${cacheBuster}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': `CoinBeat-Client-${Date.now()}`
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from Bunny.net: ${response.statusText}`)
    }

    const json = await response.json();
    const allCoins = Array.isArray(json) ? json : json.coins;
    const filteredCoins = allCoins
      .filter((coin: any) => 
        coin.name.toLowerCase().includes(query.toLowerCase()) ||
        coin.symbol.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 20)

    return { coins: filteredCoins }
  } catch (error) {
    console.error("[CLIENT] Error in searchCoinsFromBunnyClient:", error)
    return { coins: [], error: "Failed to search coins" }
  }
} 