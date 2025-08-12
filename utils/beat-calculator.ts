export interface CryptoData {
  rank: number
  name: string
  symbol: string
  coingecko_url: string
  price: number
  market_cap: number
  twitter_handle?: string
  twitter_url?: string
  twitter_followers?: number | null
  twitter_first_tweet_date?: string
  github_url?: string
  github_stars?: number | null
  github_forks?: number | null
  github_last_updated?: string
  scraped_at: string
  coingecko_id: string
  price_change_24h: number
  volume_24h: number
  last_updated: string
  logo_url?: string | null
  logo_storage_path?: string | null
  first_added_date?: string | null
  // New pre-calculated score fields from database
  health_score?: number | null
  twitter_subscore?: number | null
  github_subscore?: number | null
  consistency_score?: number | null
  gem_score?: number | null
}

export type SortOption = "rank" | "name" | "price" | "marketCap" | "volume" | "priceChange24h" | "githubStars" | "twitterFollowers" | "healthScore" | "consistencyScore"

// Safe number conversion with fallback
export function safeNumber(value: any, fallback = 0): number {
  if (value === null || value === undefined || value === "") {
    return fallback
  }

  const num = typeof value === "string" ? Number.parseFloat(value) : Number(value)
  return isNaN(num) || !isFinite(num) ? fallback : num
}

// Safe percentage conversion
export function safePercentage(value: any, fallback = 0): number {
  const num = safeNumber(value, fallback)
  return Math.max(-100, Math.min(1000, num)) // Cap between -100% and 1000%
}

// Format large numbers with K, M, B, T suffixes
export function formatNumber(num: number): string {
  if (num === 0) return "0"

  const absNum = Math.abs(num)
  const sign = num < 0 ? "-" : ""

  if (absNum >= 1e12) {
    return sign + Math.round(absNum / 1e12) + "T"
  } else if (absNum >= 1e9) {
    return sign + Math.round(absNum / 1e9) + "B"
  } else if (absNum >= 1e6) {
    return sign + Math.round(absNum / 1e6) + "M"
  } else if (absNum >= 1e3) {
    return sign + Math.round(absNum / 1e3) + "K"
  } else {
    return sign + absNum.toFixed(0)
  }
}

// Format price with appropriate decimal places
export function formatPrice(price: number): string {
  if (price === 0) return "$0.00"

  if (price >= 1) {
    return (
      "$" +
      price.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    )
  } else if (price >= 0.01) {
    return "$" + price.toFixed(4)
  } else {
    return "$" + price.toFixed(8)
  }
}

// Calculate beat score (1-100)
export function calculateBeatScore(coin: CryptoData): number {
  try {
    let score = 0

    // GitHub activity (0-40 points)
    const githubStars = safeNumber(coin.github_stars, 0)
    const githubForks = safeNumber(coin.github_forks, 0)

    if (githubStars > 0) {
      // Stars score: 0-25 points (logarithmic scale)
      const starsScore = Math.min(25, Math.log10(githubStars + 1) * 5)
      score += starsScore
    }

    if (githubForks > 0) {
      // Forks score: 0-15 points (logarithmic scale)
      const forksScore = Math.min(15, Math.log10(githubForks + 1) * 3)
      score += forksScore
    }

    // Twitter activity (0-30 points)
    const twitterFollowers = safeNumber(coin.twitter_followers, 0)
    if (twitterFollowers > 0) {
      // Followers score: 0-30 points (logarithmic scale)
      const followersScore = Math.min(30, Math.log10(twitterFollowers + 1) * 4)
      score += followersScore
    }

    // Market activity (0-30 points)
    const volume24h = safeNumber(coin.volume_24h, 0)
    const marketCap = safeNumber(coin.market_cap, 0)

    if (volume24h > 0 && marketCap > 0) {
      // Volume/Market Cap ratio (liquidity indicator)
      const volumeRatio = volume24h / marketCap
      const liquidityScore = Math.min(20, volumeRatio * 100)
      score += liquidityScore
    }

    // Market cap score: 0-10 points
    if (marketCap > 0) {
      const marketCapScore = Math.min(10, Math.log10(marketCap) - 6) // Starts scoring at $1M market cap
      score += Math.max(0, marketCapScore)
    }

    // Normalize to 1-100 scale
    const normalizedScore = Math.max(1, Math.min(100, Math.round(score)))

    return normalizedScore
  } catch (error) {
    console.error("Error calculating beat score:", error)
    return 1
  }
}

// Get color for beat score
export function getBeatScoreColor(score: number): string {
  if (score >= 80) return "text-green-500"
  if (score >= 60) return "text-yellow-500"
  if (score >= 40) return "text-orange-500"
  return "text-red-500"
}

// Get label for beat score
export function getBeatScoreLabel(score: number): string {
  if (score >= 80) return "Alive & Kicking"
  if (score >= 60) return "Active"
  if (score >= 40) return "Moderate"
  if (score >= 20) return "Weak"
  return "Nearly Dead"
}

// Sort coins by different criteria
export function sortCoins(coins: CryptoData[], sortBy: string, sortOrder: "asc" | "desc" = "desc"): CryptoData[] {
  const sorted = [...coins].sort((a, b) => {
    let aValue: number
    let bValue: number

    switch (sortBy) {
      case "rank":
        aValue = safeNumber(a.rank, 999999)
        bValue = safeNumber(b.rank, 999999)
        break
      case "price":
        aValue = safeNumber(a.price, 0)
        bValue = safeNumber(b.price, 0)
        break
      case "market_cap":
        aValue = safeNumber(a.market_cap, 0)
        bValue = safeNumber(b.market_cap, 0)
        break
      case "volume_24h":
        aValue = safeNumber(a.volume_24h, 0)
        bValue = safeNumber(b.volume_24h, 0)
        break
      case "price_change_24h":
        aValue = safeNumber(a.price_change_24h, 0)
        bValue = safeNumber(b.price_change_24h, 0)
        break
      case "github_stars":
        aValue = safeNumber(a.github_stars, 0)
        bValue = safeNumber(b.github_stars, 0)
        break
      case "twitter_followers":
        aValue = safeNumber(a.twitter_followers, 0)
        bValue = safeNumber(b.twitter_followers, 0)
        break
      case "beat_score":
        aValue = getHealthScore(a)
        bValue = getHealthScore(b)
        break
      default:
        aValue = safeNumber(a.market_cap, 0)
        bValue = safeNumber(b.market_cap, 0)
    }

    if (sortOrder === "asc") {
      return aValue - bValue
    } else {
      return bValue - aValue
    }
  })

  return sorted
}

// Get health score from database (pre-calculated) or fallback to default
export function getHealthScore(coin: CryptoData | { health_score?: number | null; [key: string]: any }): number {
  // Use pre-calculated health_score from database if available
  if (coin.health_score !== null && coin.health_score !== undefined) {
    return safeNumber(coin.health_score, 0)
  }
  
  // Return default score if not available in database
  return 50
}



// Get gem score from database (pre-calculated) or fallback to default
export function getGemScore(coin: CryptoData | { gem_score?: number | null; [key: string]: any }): number {
  // Use pre-calculated gem_score from database if available
  if (coin.gem_score !== null && coin.gem_score !== undefined) {
    return safeNumber(coin.gem_score, 0)
  }
  
  // Fallback to default score
  return 50
}
