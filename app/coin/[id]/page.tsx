import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getCoinDetails } from "../../../actions/fetch-coin-details"
import { CoinDetailPage } from "../../../components/coin-detail-page"
import { CoinDetailSkeleton } from "../../../components/coin-detail-skeleton"

interface CoinPageProps {
  params: {
    id: string
  }
}

export default async function CoinPage({ params }: CoinPageProps) {
  const coinDetails = await getCoinDetails(params.id)

  if (!coinDetails) {
    notFound()
  }

  // Convert the coin details to the expected format
  const coinHistory = coinDetails.priceHistory.map((item) => ({
    date: item.date,
    price: item.price,
    market_cap: item.market_cap,
    volume_24h: item.volume,
    github_stars: coinDetails.github_stars,
    github_forks: coinDetails.github_forks,
    twitter_followers: coinDetails.twitter_followers,
    health_score: coinDetails.beatScore,
  }))

  const consistencyData = {
    coinId: coinDetails.coingecko_id,
    githubScore: Math.round((coinDetails.github_stars || 0) / 1000),
    twitterScore: Math.round((coinDetails.twitter_followers || 0) / 10000),
    overallScore: coinDetails.consistencyScore,
    lastUpdated: new Date().toISOString(),
  }

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
  const coinDetails = await getCoinDetails(params.id)

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
