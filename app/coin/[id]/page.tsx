import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getCoinDetailsBasic, getCoinDetails } from "../../../actions/fetch-coin-details"
import { CoinDetailPage } from "../../../components/coin-detail-page"
import { CoinDetailSkeleton } from "../../../components/coin-detail-skeleton"

// Removed purgeCoinPriceHistory and smartPurgeCoinPriceHistory functions
// Removed cache purge logic

interface CoinPageProps {
  params: Promise<{
    id: string
  }>
}

// Enhanced cache with better TTL and error handling
const coinDetailsCache = new Map<string, { data: any; timestamp: number; ttl: number }>()

// Cache TTL: 2 minutes (reduced for more frequent updates)
const CACHE_TTL = 2 * 60 * 1000

function getCachedCoinDetails(coinId: string) {
  const cached = coinDetailsCache.get(coinId)
  if (!cached) return null
  
  const now = Date.now()
  if (now - cached.timestamp > cached.ttl) {
    coinDetailsCache.delete(coinId)
    return null
  }
  
  return cached.data
}

function setCachedCoinDetails(coinId: string, data: any) {
  coinDetailsCache.set(coinId, {
    data,
    timestamp: Date.now(),
    ttl: CACHE_TTL
  })
}

// Clean up expired cache entries periodically
if (typeof window === 'undefined') { // Server-side only
  setInterval(() => {
    const now = Date.now()
    for (const [key, value] of coinDetailsCache.entries()) {
      if (now - value.timestamp > value.ttl) {
        coinDetailsCache.delete(key)
      }
    }
  }, 60000) // Clean every minute
}

export default async function CoinPage({ params }: CoinPageProps) {
  const pageStartTime = Date.now()
  const { id } = await params
  
  console.log(`🚀 [PAGE] Starting coin page for: ${id}`)
  console.log(`🔍 [PAGE] Coin ID type: ${typeof id}, length: ${id.length}`)
  
  // Check cache first
  let coinDetails = getCachedCoinDetails(id)
  
  if (!coinDetails) {
    try {
      console.log(`📊 [PAGE] Cache miss, fetching data for: ${id}`)
      const fetchStartTime = Date.now()
      
      // Directly fetch coin details (no purge)
      coinDetails = await getCoinDetails(id)
      
      console.log(`📊 [PAGE] Data fetch took ${Date.now() - fetchStartTime}ms`)
      
      if (!coinDetails) {
        console.log(`❌ [PAGE] Coin not found: ${id}`)
        notFound()
      }

      // Cache the full data for fast subsequent loads
      setCachedCoinDetails(id, coinDetails)
    } catch (error) {
      console.error(`❌ [PAGE] Error fetching coin details after ${Date.now() - pageStartTime}ms:`, error)
      notFound()
    }
  } else {
    console.log(`⚡ [PAGE] Cache hit for: ${id}`)
  }

  if (!coinDetails) {
    notFound()
  }

  // Use the actual price history from the fetched data
  const coinHistory = coinDetails.priceHistory && coinDetails.priceHistory.length > 0 
    ? coinDetails.priceHistory.map((item: any, index: number) => ({
        id: index + 1,
        coingecko_id: coinDetails.coingecko_id,
        date: item.date,
        price: item.price,
        market_cap: item.market_cap,
        volume_24h: item.volume,
        github_stars: item.github_stars,
        github_forks: item.github_forks,
        twitter_followers: item.twitter_followers,
        health_score: item.health_score, // Pass through health_score for chart
        consistency_score: item.consistency_score // Pass through consistency_score for chart
      }))
    : [] // Return empty array if no history data available

  const consistencyData = {
    github_frequency: Math.round((coinDetails.github_stars || 0) / 1000),
    twitter_frequency: Math.round((coinDetails.twitter_followers || 0) / 10000),
    github_recency: 0.8, // Mock value - would be calculated from actual data
    twitter_recency: 0.7, // Mock value - would be calculated from actual data
    github_score: Math.round((coinDetails.github_stars || 0) / 1000),
    twitter_score: Math.round((coinDetails.twitter_followers || 0) / 10000),
    consistency_score: coinDetails.consistencyScore || 50,
  }

  console.log(`✅ [PAGE] Coin page completed in ${Date.now() - pageStartTime}ms`)

  return (
    <Suspense fallback={<CoinDetailSkeleton />}>
      <CoinDetailPage
        coin={coinDetails}
        coinHistory={coinHistory}
        beatScore={coinDetails.beatScore}
        consistencyData={consistencyData}
      />
    </Suspense>
  )
}

export async function generateMetadata({ params }: CoinPageProps) {
  const { id } = await params
  
  // Use cached data if available
  let coinDetails = getCachedCoinDetails(id)
  
  if (!coinDetails) {
    try {
      // Use full version for metadata - includes all data
      coinDetails = await getCoinDetails(id)
      if (coinDetails) {
        setCachedCoinDetails(id, coinDetails)
      }
    } catch (error) {
      console.error("Error fetching coin details for metadata:", error)
    }
  }

  if (!coinDetails) {
    return {
      title: "Coin Not Found - CoinBeat",
      description: "The requested cryptocurrency could not be found.",
    }
  }

  return {
    title: `${coinDetails.name} (${coinDetails.symbol}) - CoinBeat`,
    description: `View detailed analysis of ${coinDetails.name} including price history, social metrics, and health score.`,
  }
}
