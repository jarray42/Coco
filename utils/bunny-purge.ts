// Bunny.net CDN Cache Purge Utility
// This automatically purges the CDN cache when you upload new data

const BUNNY_API_URL = "https://api.bunny.net"
const BUNNY_STORAGE_ZONE = "cocricoin" // Your storage zone name
const BUNNY_API_KEY = process.env.BUNNY_API_KEY // Add this to your .env file

// Purge a specific file from Bunny.net CDN
export const purgeBunnyFile = async (filePath: string): Promise<boolean> => {
  try {
    if (!BUNNY_API_KEY) {
      console.error("BUNNY_API_KEY not found in environment variables")
      return false
    }

    const purgeUrl = `${BUNNY_API_URL}/purge?url=https://${BUNNY_STORAGE_ZONE}.b-cdn.net/${filePath}`
    
    console.log(`Purging Bunny.net cache for: ${filePath}`)
    
    const response = await fetch(purgeUrl, {
      method: 'GET',
      headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      console.log(`✅ Successfully purged cache for: ${filePath}`)
      return true
    } else {
      const errorText = await response.text()
      console.error(`❌ Failed to purge cache for ${filePath}:`, errorText)
      return false
    }
  } catch (error) {
    console.error(`❌ Error purging cache for ${filePath}:`, error)
    return false
  }
}

// Purge the coins data file
export const purgeCoinsData = async (): Promise<boolean> => {
  // Get the latest filename and purge it
  try {
    const { getLatestCryptoJsonFilename } = await import('./bunny-client')
    const latestFilename = await getLatestCryptoJsonFilename()
    return await purgeBunnyFile(latestFilename)
  } catch (error) {
    console.error("Error getting latest filename for purge:", error)
    // Fallback to old filename if dynamic lookup fails
    return await purgeBunnyFile("current_coins.json")
  }
}

// Purge multiple files
export const purgeMultipleFiles = async (files: string[]): Promise<boolean[]> => {
  const results = await Promise.all(
    files.map(file => purgeBunnyFile(file))
  )
  return results
}

// Purge all common data files
export const purgeAllDataFiles = async (): Promise<boolean[]> => {
  const commonFiles = [
    "current_coins.json",
    // Add other files you commonly update
    // "price-history/bitcoin.json",
    // "price-history/ethereum.json",
  ]
  
  return await purgeMultipleFiles(commonFiles)
} 