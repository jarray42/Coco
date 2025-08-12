"use server"

import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"
import { createClient } from "@supabase/supabase-js"
import { formatPrice, getHealthScore } from "../utils/beat-calculator"
import { openai } from "@ai-sdk/openai"
import { getUserQuota, checkQuotaLimit, incrementTokenUsage } from "../utils/quota-manager"
import type { AuthUser } from "../utils/supabase-auth"
import { getAllCoinsFromBunny } from "./fetch-all-coins-from-bunny"

export interface MarketAnalysisResult {
  analysis: string
  sentiment: "bullish" | "bearish" | "neutral"
  confidence: number
  keyPoints: string[]
  recommendations: string[]
  capAnalysis?: {
    totalMarketCap: number
    dominance: { [key: string]: number }
    trends: string[]
  }
  riskIndicators?: Array<{
    title: string
    severity: "low" | "medium" | "high"
    description: string
  }>
  modelUsed: string
  topPerformers: any[]
  topLosers: any[]
  healthiestCoins: any[]
  reactivatedTeams: any[]
  lowCapGems: any[]
  avgBeatScore: number
  bullishPercentage: number
  totalMarketCap: number
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

interface AIModel {
  name: string
  provider: string
  model: any
  priority: number
  dailyLimit: number
}

const AI_MODELS: AIModel[] = [
  {
    name: "Groq Llama 3.1 8B",
    provider: "groq",
    model: process.env.GROQ_API_KEY ? groq("llama-3.1-8b-instant") : null,
    priority: 1,
    dailyLimit: 14400,
  },
  {
    name: "Groq Mixtral 8x7B",
    provider: "groq",
    model: process.env.GROQ_API_KEY ? groq("mixtral-8x7b-32768") : null,
    priority: 2,
    dailyLimit: 14400,
  },
  {
    name: "OpenAI GPT-4o Mini",
    provider: "openai",
    model: process.env.OPENAI_API_KEY ? openai("gpt-4o-mini") : null,
    priority: 3,
    dailyLimit: 200,
  },
]

const modelUsage = new Map<string, { count: number; lastReset: Date }>()

function getAvailableModel(): { model: any; modelInfo: AIModel } | null {
  const today = new Date().toDateString()
  for (const modelConfig of AI_MODELS) {
    if (!modelConfig.model) continue
    const usageKey = `${modelConfig.provider}-${today}`
    const usage = modelUsage.get(usageKey) || { count: 0, lastReset: new Date() }
    if (usage.lastReset.toDateString() !== today) {
      usage.count = 0
      usage.lastReset = new Date()
      modelUsage.set(usageKey, usage)
    }
    if (usage.count < modelConfig.dailyLimit) {
      return { model: modelConfig.model, modelInfo: modelConfig }
    }
  }
  return null
}

function incrementModelUsage(provider: string) {
  const today = new Date().toDateString()
  const usageKey = `${provider}-${today}`
  const usage = modelUsage.get(usageKey) || { count: 0, lastReset: new Date() }
  usage.count++
  modelUsage.set(usageKey, usage)
}

async function generateWithFallback(
  systemPrompt: string,
  userPrompt: string,
): Promise<{ text: string; modelUsed: string }> {
  const availableModel = getAvailableModel()
  if (!availableModel) {
    throw new Error("All AI models have reached their daily limits. Please try again tomorrow! 🐓")
  }
  try {
    const { text } = await generateText({
      model: availableModel.model,
      system: systemPrompt,
      prompt: userPrompt,
    })
    incrementModelUsage(availableModel.modelInfo.provider)
    return {
      text,
      modelUsed: `${availableModel.modelInfo.name}`,
    }
  } catch (error) {
    console.error(`Error with ${availableModel.modelInfo.name}:`, error)
    const today = new Date().toDateString()
    const usageKey = `${availableModel.modelInfo.provider}-${today}`
    const usage = modelUsage.get(usageKey) || { count: 0, lastReset: new Date() }
    usage.count = availableModel.modelInfo.dailyLimit
    modelUsage.set(usageKey, usage)
    return generateWithFallback(systemPrompt, userPrompt)
  }
}

function parseDate(dateString: string | null): Date | null {
  if (!dateString) return null
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date format: ${dateString}`)
      return null
    }
    return date
  } catch (error) {
    console.warn(`Error parsing date: ${dateString}`, error)
    return null
  }
}

function calculateDaysDifference(fromDate: Date | null, toDate: Date): number {
  if (!fromDate) return 365
  const diffTime = toDate.getTime() - fromDate.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(1, diffDays)
}

function minMaxNormalize(values: number[]): number[] {
  const validValues = values.filter((v) => !isNaN(v) && isFinite(v) && v >= 0)
  if (validValues.length === 0) return values.map(() => 0)
  const min = Math.min(...validValues)
  const max = Math.max(...validValues)
  const range = max - min
  if (range === 0) return values.map(() => 50)
  return values.map((value) => {
    if (isNaN(value) || !isFinite(value) || value < 0) return 0
    return ((value - min) / range) * 100
  })
}

async function fetchAllCoins() {
  try {
    const allCoins = await getAllCoinsFromBunny()
    return allCoins || []
  } catch (error) {
    console.error("Error fetching coins from Bunny.net:", error)
    return []
  }
}

async function performCoinAnalysis(): Promise<{
  enrichedCoins: any[];
  capAnalysis: any;
  riskIndicators: any[];
}> {
  const coins = await fetchAllCoins()
  const now = new Date()
  const enrichedCoins = coins
    .map((coin: any) => {
      const firstTweetDate = parseDate(coin.twitter_first_tweet_date)
      const lastUpdateDate = parseDate(coin.github_last_updated)
      const daysSinceFirstTweet = calculateDaysDifference(firstTweetDate, now)
      const daysSinceLastUpdate = calculateDaysDifference(lastUpdateDate, now)
      const twitterFollowers = Math.max(0, coin.twitter_followers || 0)
      const socialMomentum = twitterFollowers / daysSinceFirstTweet
      const githubStars = Math.max(0, coin.github_stars || 0)
      const githubForks = Math.max(0, coin.github_forks || 0)
      const developerActivity = (githubStars + githubForks) / daysSinceLastUpdate
      const marketCap = coin.market_cap || 0
      const undervaluation = marketCap > 0 ? (1 / marketCap) * 1e12 : 0
      const recency = 1 / daysSinceLastUpdate
      const beatScore = getHealthScore(coin)
      return {
        ...coin,
        daysSinceFirstTweet,
        daysSinceLastUpdate,
        socialMomentum,
        developerActivity,
        undervaluation,
        recency,
        beatScore,
        parsedFirstTweetDate: firstTweetDate,
        parsedLastUpdateDate: lastUpdateDate,
      }
    })
    .filter((coin: any) => coin.market_cap && coin.market_cap > 0)
  if (enrichedCoins.length === 0) return { enrichedCoins: [], capAnalysis: null, riskIndicators: [] }
  const socialMomentumValues = enrichedCoins.map((coin: any) => coin.socialMomentum)
  const developerActivityValues = enrichedCoins.map((coin: any) => coin.developerActivity)
  const undervaluationValues = enrichedCoins.map((coin: any) => coin.undervaluation)
  const recencyValues = enrichedCoins.map((coin: any) => coin.recency)
  const normalizedSocialMomentum = minMaxNormalize(socialMomentumValues)
  const normalizedDeveloperActivity = minMaxNormalize(developerActivityValues)
  const normalizedUndervaluation = minMaxNormalize(undervaluationValues)
  const normalizedRecency = minMaxNormalize(recencyValues)
  const coinsWithComposite = enrichedCoins.map((coin: any, index: number) => ({
    ...coin,
    normalizedSocialMomentum: normalizedSocialMomentum[index],
    normalizedDeveloperActivity: normalizedDeveloperActivity[index],
    normalizedUndervaluation: normalizedUndervaluation[index],
    normalizedRecency: normalizedRecency[index],
    compositeScore:
      (normalizedSocialMomentum[index] +
        normalizedDeveloperActivity[index] +
        normalizedUndervaluation[index] +
        normalizedRecency[index]) /
      4,
  }))
  const marketCaps = coinsWithComposite.map((coin: any) => coin.market_cap).filter(Boolean)
  const minCap = Math.min(...marketCaps)
  const maxCap = Math.max(...marketCaps)
  const D = maxCap - minCap
  const tHigh = D / 50
  const tMid = D / 200
  const tLow = D / 1000
  const categorizedCoins = coinsWithComposite.map((coin: any) => {
    const capDiff = coin.market_cap - minCap
    let capCategory: "Low Cap" | "Mid Cap" | "High Cap"
    if (capDiff <= tLow) {
      capCategory = "Low Cap"
    } else if (capDiff <= tMid) {
      capCategory = "Mid Cap"
    } else {
      capCategory = "High Cap"
    }
    return { ...coin, capCategory }
  })
  const categories = ["Low Cap", "Mid Cap", "High Cap"] as const
  const metrics = [
    { key: "socialMomentum", normalizedKey: "normalizedSocialMomentum", name: "Social Momentum" },
    { key: "developerActivity", normalizedKey: "normalizedDeveloperActivity", name: "Developer Activity" },
    { key: "compositeScore", normalizedKey: null, name: "Composite Score" },
  ] as const
  const capAnalysis: Record<string, Record<string, any>> = {}
  categories.forEach((category) => {
    const categoryCoins = categorizedCoins.filter((coin: any) => coin.capCategory === category)
    if (categoryCoins.length > 0) {
      capAnalysis[category] = {}
      metrics.forEach((metric) => {
        const topCoin = categoryCoins.reduce((prev: any, current: any) =>
          current[metric.key] > prev[metric.key] ? current : prev,
        )
        capAnalysis[category][metric.key] = {
          id: topCoin.coingecko_id || topCoin.symbol,
          name: topCoin.name,
          symbol: topCoin.symbol,
          rawValue: topCoin[metric.key],
          normalizedValue: metric.normalizedKey ? topCoin[metric.normalizedKey] : topCoin[metric.key],
          metricName: metric.name,
        }
      })
    }
  })
  const riskIndicators = []
  const deadCoins = categorizedCoins
    .filter((coin: any) => coin.beatScore < 10)
    .sort((a: any, b: any) => a.beatScore - b.beatScore)
    .slice(0, 5)
  if (deadCoins.length > 0) {
    riskIndicators.push({
      type: "dead_coins",
      title: "Dead Coins Alert",
      description: `${deadCoins.length} coins with health scores below 10`,
      coins: deadCoins.map((coin: any) => ({
        name: coin.name,
        symbol: coin.symbol,
        score: coin.beatScore.toFixed(1),
        reason: "Extremely low health score",
      })),
    })
  }
  const lowLiquidityCoins = categorizedCoins
    .filter((coin: any) => {
      const volumeToMcRatio = (coin.volume_24h || 0) / (coin.market_cap || 1)
      return volumeToMcRatio < 0.001 && coin.market_cap > 1000000
    })
    .sort((a: any, b: any) => (a.volume_24h || 0) / (a.market_cap || 1) - (b.volume_24h || 0) / (b.market_cap || 1))
    .slice(0, 5)
  if (lowLiquidityCoins.length > 0) {
    riskIndicators.push({
      type: "low_liquidity",
      title: "Low Liquidity Warning",
      description: `${lowLiquidityCoins.length} coins with extremely low trading volume`,
      coins: lowLiquidityCoins.map((coin: any) => ({
        name: coin.name,
        symbol: coin.symbol,
        ratio: (((coin.volume_24h || 0) / (coin.market_cap || 1)) * 100).toFixed(3),
        reason: "Daily volume < 0.1% of market cap",
      })),
    })
  }
  const stagnantCoins = categorizedCoins
    .filter((coin: any) => coin.daysSinceLastUpdate > 180 && (coin.github_stars || 0) > 0)
    .sort((a: any, b: any) => b.daysSinceLastUpdate - a.daysSinceLastUpdate)
    .slice(0, 5)
  if (stagnantCoins.length > 0) {
    riskIndicators.push({
      type: "stagnant_development",
      title: "Development Stagnation",
      description: `${stagnantCoins.length} coins with no GitHub activity for 6+ months`,
      coins: stagnantCoins.map((coin: any) => ({
        name: coin.name,
        symbol: coin.symbol,
        days: coin.daysSinceLastUpdate,
        reason: `No updates for ${Math.floor(coin.daysSinceLastUpdate / 30)} months`,
      })),
    })
  }
  return { enrichedCoins: coinsWithComposite, capAnalysis, riskIndicators }
}

export async function analyzeMarket(
  detailed = false,
  model: string = 'auto',
): Promise<MarketAnalysisResult & { migrationDelistingSummary?: string }> {
  try {
    // Perform comprehensive coin analysis
    const { enrichedCoins, capAnalysis, riskIndicators } = await performCoinAnalysis()

    if (enrichedCoins.length === 0) {
      throw new Error("No coin data available for analysis")
    }

    // --- MIGRATION/DELISTING ALERTS LOGIC ---
    // Query Supabase for verified, not-archived migration/delisting alerts
    const { data: migrationDelistingAlerts, error: migrationDelistingError } = await supabase
      .from('coin_alerts')
      .select('coin_id, alert_type')
      .eq('status', 'verified')
      .eq('archived', false)
      .in('alert_type', ['migration', 'delisting'])

    let migrationDelistingSummary = "No potential migration or delisting detected"
    if (migrationDelistingAlerts && migrationDelistingAlerts.length > 0) {
      // Map coin_id to coin name/symbol
      const coinIdToCoin = Object.fromEntries(
        enrichedCoins.map((coin: any) => [coin.coingecko_id, coin])
      )
      // Deduplicate by coin_id + alert_type
      const seen = new Set()
      const summaryList = migrationDelistingAlerts
        .map((alert: any) => {
          const coin = coinIdToCoin[alert.coin_id]
          if (!coin) return null
          const key = `${alert.coin_id}:${alert.alert_type}`
          if (seen.has(key)) return null
          seen.add(key)
          return `${coin.name} (${coin.symbol}): ${alert.alert_type}`
        })
        .filter(Boolean)
      if (summaryList.length > 0) {
        migrationDelistingSummary = summaryList.join("; ")
      }
    }
    // --- END MIGRATION/DELISTING LOGIC ---

    // Sort and categorize coins for traditional analysis
    const topPerformers = enrichedCoins
      .filter((coin: any) => coin.price_change_24h > 0)
      .sort((a: any, b: any) => (b.price_change_24h || 0) - (a.price_change_24h || 0))
      .slice(0, 3)

    const topLosers = enrichedCoins
      .filter((coin: any) => coin.price_change_24h < 0)
      .sort((a: any, b: any) => (a.price_change_24h || 0) - (b.price_change_24h || 0))
      .slice(0, 3)

    const healthiestCoins = enrichedCoins.sort((a: any, b: any) => b.beatScore - a.beatScore).slice(0, 3)

    const reactivatedTeams = enrichedCoins
      .filter((coin: any) => coin.daysSinceLastUpdate < 30 && (coin.github_stars || 0) > 100)
      .sort((a: any, b: any) => a.daysSinceLastUpdate - b.daysSinceLastUpdate)
      .slice(0, 3)

    const lowCapGems = enrichedCoins
      .filter((coin: any) => (coin.market_cap || 0) < 100000000 && coin.socialMomentum > 10)
      .sort((a: any, b: any) => b.compositeScore - a.compositeScore)
      .slice(0, 3)

    // Calculate market metrics
    const totalMarketCap = enrichedCoins.reduce((sum: number, coin: any) => sum + (coin.market_cap || 0), 0)
    const avgBeatScore = enrichedCoins.reduce((sum: number, coin: any) => sum + coin.beatScore, 0) / enrichedCoins.length
    const bullishCoins = enrichedCoins.filter((coin: any) => (coin.price_change_24h || 0) > 0).length
    const bullishPercentage = (bullishCoins / enrichedCoins.length) * 100

    // Format risk indicators for prompt
    const riskSummary = riskIndicators
      .slice(0, detailed ? riskIndicators.length : 2)
      .map((risk: any) => `${risk.title}: ${risk.description}`)
      .join('; ')

    const coinList = enrichedCoins
      .map(
        (coin: any) =>
          `${coin.name} (${coin.symbol}): $${coin.price?.toFixed(4)}, MC: ${formatPrice(coin.market_cap || 0)}, Health: ${coin.beatScore.toFixed(1)}/100, 24h: ${coin.price_change_24h?.toFixed(2)}%, Composite: ${coin.compositeScore.toFixed(2)}`,
      )
      .join("\n")

    // Create a token-efficient coin list that includes all coins but doesn't exhaust quota
    const topCoinsForPrompt = enrichedCoins
      .slice(0, 50) // Top 50 coins in detail
      .map(
        (coin: any) =>
          `${coin.name} (${coin.symbol}): $${coin.price?.toFixed(4)}, MC: ${formatPrice(coin.market_cap || 0)}, Health: ${coin.beatScore.toFixed(1)}/100, 24h: ${coin.price_change_24h?.toFixed(2)}%, Composite: ${coin.compositeScore.toFixed(2)}`,
      )
      .join("\n")

    // Add a summary of all available coins
    const coinSummary = `Total coins available: ${enrichedCoins.length} from Bunny.net database. Top 50 shown above. All coins are available for analysis.`

    const systemPrompt = `You are a seasoned financial advisor with deep expertise in cryptocurrency and traditional markets. 

When analyzing the market, you must ONLY mention coins from the provided list below - do not reference any other cryptocurrencies.

AVAILABLE COINS FOR ANALYSIS (${enrichedCoins.length} coins from Bunny.net database):
${topCoinsForPrompt}

${coinSummary}

RESPONSE FORMAT (${detailed ? "DETAILED" : "CONCISE"}):

${
  detailed
    ? `
MARKET SENTIMENT: [Brief sentiment analysis - Bullish/Bearish/Neutral with percentage]

TOP PERFORMERS & MOVERS:
• [Top gainer with specific % and reasoning]
• [Emerging breakout with technical analysis]
• [Reactivated team with development metrics]

HEALTHIEST PROJECTS:
• [Highest health score coin with fundamentals]
• [Strong development activity with GitHub metrics]
• [Best social engagement with follower growth]

LOW-CAP OPPORTUNITIES:
• [Sub-$100M project with strong composite score]
• [Hidden gem with growing social momentum]
• [Undervalued project with recent development]

RISK INDICATORS:
• [All identified risks with specific coin names and details]
• [Include dead coins, low liquidity, stagnant development]
• [Web search findings about migrations/delistings]

MIGRATION & EXCHANGE ALERTS:
${migrationDelistingSummary}

STRATEGIC RECOMMENDATIONS:
• [Specific action with percentages]
• [Risk management suggestion]
• [Opportunity timing advice]
`
    : `
MARKET SENTIMENT: [Bullish/Bearish/Neutral with ${bullishPercentage.toFixed(1)}% coins positive]

TOP 3 INSIGHTS:
• [Top performer: coin name +X% - reason in 8 words max]
• [Healthiest project: coin name - key metric in 8 words max]  
• [Low-cap gem: coin name - opportunity in 8 words max]

RISK INDICATORS:
[Top 2 most critical risks only: ${riskSummary || "No major risks detected"}]

MIGRATION & DELISTING ALERTS:
${migrationDelistingSummary}

ACTION SUGGESTED:
[One action with verb + concrete numbers, or "Monitor current positions - no immediate action needed"]
`
}

Use concrete percentages, market caps, and metrics. Keep language professional and elegant. No markdown formatting.`

    const userPrompt = `Analyze this market data (${detailed ? "provide detailed insights" : "be extremely concise"}):

MARKET OVERVIEW:
- Total Market Cap: ${formatPrice(totalMarketCap)}
- Total Coins: ${enrichedCoins.length}
- Average Health Score: ${avgBeatScore.toFixed(1)}/100
- Bullish Sentiment: ${bullishPercentage.toFixed(1)}% coins positive

TOP PERFORMERS (24h):
${topPerformers.map((coin: any) => `${coin.name}: +${coin.price_change_24h?.toFixed(2)}%`).join(", ")}

TOP LOSERS (24h):
${topLosers.map((coin: any) => `${coin.name}: ${coin.price_change_24h?.toFixed(2)}%`).join(", ")}

HEALTHIEST PROJECTS:
${healthiestCoins.map((coin: any) => `${coin.name}: ${coin.beatScore.toFixed(1)}/100 health`).join(", ")}

REACTIVATED TEAMS:
${reactivatedTeams.map((coin: any) => `${coin.name}: GitHub updated ${coin.daysSinceLastUpdate} days ago`).join(", ")}

LOW-CAP GEMS (<$100M):
${lowCapGems.map((coin: any) => `${coin.name}: ${formatPrice(coin.market_cap || 0)} MC, Composite: ${coin.compositeScore.toFixed(2)}`).join(", ")}

RISK INDICATORS IDENTIFIED:
${riskIndicators.map((risk: any) => `${risk.title}: ${risk.coins.map((c: any) => `${c.name} (${c.reason})`).join(", ")}`).join("\n")}

TOP COINS BY COMPOSITE SCORE:
${enrichedCoins
  .slice(0, 10)
  .sort((a: any, b: any) => b.compositeScore - a.compositeScore)
  .map((coin: any) => `${coin.name}: ${coin.compositeScore.toFixed(2)}`)
  .join(", ")}

AVAILABLE COINS (Top 50 of ${enrichedCoins.length} total):
${topCoinsForPrompt}

${detailed ? "Provide comprehensive analysis with detailed insights for each category and include all risk indicators." : "Provide ultra-concise expert analysis following the exact format specified with top 2 risks only."}`

    // Model selection logic
    let aiModel
    if (model === 'auto' || !model) {
      const availableModel = getAvailableModel()
      if (!availableModel) throw new Error('No available AI model')
      aiModel = availableModel.model
    } else if (model === 'llama-3.1-8b-instant') {
      aiModel = groq('llama-3.1-8b-instant')
    } else if (model === 'mixtral-8x7b-32768') {
      aiModel = groq('mixtral-8x7b-32768')
    } else if (model === 'gpt-4o-mini') {
      aiModel = openai('gpt-4o-mini')
    } else if (model === 'claude-3-haiku-20240307') {
      const { anthropic } = await import('@ai-sdk/anthropic')
      aiModel = anthropic('claude-3-haiku-20240307')
    } else {
      const availableModel = getAvailableModel()
      if (!availableModel) throw new Error('No available AI model')
      aiModel = availableModel.model
    }
    const { text: analysis } = await generateText({
      model: aiModel,
      system: systemPrompt,
      prompt: userPrompt,
    })

    // Return all the structured data for frontend cards
    return {
      analysis,
      modelUsed: model,
      capAnalysis,
      riskIndicators,
      topPerformers,
      topLosers,
      healthiestCoins,
      reactivatedTeams,
      lowCapGems,
      avgBeatScore,
      bullishPercentage,
      totalMarketCap,
      sentiment: 'neutral',
      confidence: 80,
      keyPoints: [],
      recommendations: [],
      migrationDelistingSummary,
    }
  } catch (error) {
    console.error("Error analyzing market:", error)
    throw new Error("Failed to analyze market. Please try again.")
  }
}
