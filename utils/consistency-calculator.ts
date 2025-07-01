export interface PriceHistoryData {
  date: string
  github_last_updated: string | null
  twitter_first_tweet_date: string | null
}

export interface ConsistencyResult {
  github_frequency: number
  twitter_frequency: number
  github_recency: number
  twitter_recency: number
  github_score: number
  twitter_score: number
  consistency_score: number
}

// Algorithm constants (can be overridden)
const DEFAULT_CONFIG = {
  lookbackDays: 30,
  githubFreqBaseline: 20,
  twitterFreqBaseline: 60,
  githubStalenessMax: 90,
  twitterStalenessMax: 30,
  githubWeight: 0.7,
  twitterWeight: 0.6,
  globalBlend: 0.6,
}

function parseDate(dateString: string | null): Date | null {
  if (!dateString) return null
  try {
    const date = new Date(dateString)
    return isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}

function daysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function calculateConsistencyScore(
  priceHistory: PriceHistoryData[],
  config = DEFAULT_CONFIG,
): ConsistencyResult {
  if (!priceHistory || priceHistory.length === 0) {
    return {
      github_frequency: 0,
      twitter_frequency: 0,
      github_recency: 0,
      twitter_recency: 0,
      github_score: 0,
      twitter_score: 0,
      consistency_score: 0,
    }
  }

  const now = new Date()
  const lookbackDate = new Date(now.getTime() - config.lookbackDays * 24 * 60 * 60 * 1000)

  // Filter data to lookback window
  const recentData = priceHistory.filter((entry) => {
    const entryDate = parseDate(entry.date)
    return entryDate && entryDate >= lookbackDate
  })

  if (recentData.length === 0) {
    return {
      github_frequency: 0,
      twitter_frequency: 0,
      github_recency: 0,
      twitter_recency: 0,
      github_score: 0,
      twitter_score: 0,
      consistency_score: 0,
    }
  }

  // Step 1 & 2: Count frequency changes
  const githubDates = new Set<string>()
  const twitterDates = new Set<string>()
  let mostRecentGithub: Date | null = null
  let mostRecentTwitter: Date | null = null

  recentData.forEach((entry) => {
    if (entry.github_last_updated) {
      githubDates.add(entry.github_last_updated)
      const githubDate = parseDate(entry.github_last_updated)
      if (githubDate && (!mostRecentGithub || githubDate > mostRecentGithub)) {
        mostRecentGithub = githubDate
      }
    }

    // Fixed: Use twitter_first_tweet_date instead of twitter_last_tweet_date
    if (entry.twitter_first_tweet_date) {
      twitterDates.add(entry.twitter_first_tweet_date)
      const twitterDate = parseDate(entry.twitter_first_tweet_date)
      if (twitterDate && (!mostRecentTwitter || twitterDate > mostRecentTwitter)) {
        mostRecentTwitter = twitterDate
      }
    }
  })

  const N_g = githubDates.size
  const N_t = twitterDates.size

  // Step 3 & 4: Calculate days since most recent activity
  const D_g = mostRecentGithub ? daysBetween(mostRecentGithub, now) : config.githubStalenessMax
  const D_t = mostRecentTwitter ? daysBetween(mostRecentTwitter, now) : config.twitterStalenessMax

  // Step 5: Normalize frequency
  const F_g = Math.min(1, N_g / config.githubFreqBaseline)
  const F_t = Math.min(1, N_t / config.twitterFreqBaseline)

  // Step 6: Normalize recency
  const R_g = Math.max(0, 1 - D_g / config.githubStalenessMax)
  const R_t = Math.max(0, 1 - D_t / config.twitterStalenessMax)

  // Step 7: Channel scores
  const github_score = config.githubWeight * F_g + (1 - config.githubWeight) * R_g
  const twitter_score = config.twitterWeight * F_t + (1 - config.twitterWeight) * R_t

  // Step 8: Final consistency score
  const consistency_score = Math.min(
    100,
    Math.max(0, 100 * (config.globalBlend * github_score + (1 - config.globalBlend) * twitter_score)),
  )

  return {
    github_frequency: N_g,
    twitter_frequency: N_t,
    github_recency: R_g,
    twitter_recency: R_t,
    github_score,
    twitter_score,
    consistency_score: Math.round(consistency_score * 10) / 10, // Round to 1 decimal
  }
}
