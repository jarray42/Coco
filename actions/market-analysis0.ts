"use server"

import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"
import { openai } from "@ai-sdk/openai"
import { createClient } from "@supabase/supabase-js"
import { formatPrice, getHealthScore } from "../utils/beat-calculator"

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

// Fetch all coins from Supabase
async function fetchAllCoins() {
  const { data: coins, error } = await supabase
    .from("coins")
    .select("*, health_score, twitter_subscore, github_subscore, consistency_score, gem_score")
    .order("market_cap", { ascending: false })

  if (error) {
    console.error("Error fetching coins:", error)
    return []
  }

  return coins || []
}

// Proper date parsing function
function parseDate(dateString: string | null): Date | null {
  if (!dateString) return null

  try {
    // Handle various date formats
    const date = new Date(dateString)

    // Check if date is valid
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

// Calculate days between dates with proper validation
function calculateDaysDifference(fromDate: Date | null, toDate: Date): number {
  if (!fromDate) return 365 // Default to 1 year if no date

  const diffTime = toDate.getTime() - fromDate.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  // Ensure minimum 1 day to avoid division by zero
  return Math.max(1, diffDays)
}

// Min-max normalization function (returns 0-100 scale)
function minMaxNormalize(values: number[]): number[] {
  const validValues = values.filter((v) => !isNaN(v) && isFinite(v) && v >= 0)
  if (validValues.length === 0) return values.map(() => 0)

  const min = Math.min(...validValues)
  const max = Math.max(...validValues)
  const range = max - min

  if (range === 0) return values.map(() => 50) // Return middle value if all same

  return values.map((value) => {
    if (isNaN(value) || !isFinite(value) || value < 0) return 0
    return ((value - min) / range) * 100 // Scale to 0-100
  })
}

// Enhanced coin analysis with verified calculations
async function performCoinAnalysis() {
  const coins = await fetchAllCoins()
  const now = new Date()

  console.log(`Analyzing ${coins.length} coins at ${now.toISOString()}`)

  // Calculate metrics for each coin with proper date handling
  const enrichedCoins = coins
    .map((coin) => {
      // Parse dates properly
      const firstTweetDate = parseDate(coin.twitter_first_tweet_date)
      const lastUpdateDate = parseDate(coin.github_last_updated)

      // 1. Days since first tweet
      const daysSinceFirstTweet = calculateDaysDifference(firstTweetDate, now)

      // 2. Days since last GitHub update
      const daysSinceLastUpdate = calculateDaysDifference(lastUpdateDate, now)

      // 3. Social momentum = twitter_followers / days_since_first_tweet
      const twitterFollowers = Math.max(0, coin.twitter_followers || 0)
      const socialMomentum = twitterFollowers / daysSinceFirstTweet

      // 4. Developer activity = (github_stars + github_forks) / days_since_last_update
      const githubStars = Math.max(0, coin.github_stars || 0)
      const githubForks = Math.max(0, coin.github_forks || 0)
      const developerActivity = (githubStars + githubForks) / daysSinceLastUpdate

      // 5. Undervaluation = 1 / market_cap (handle very large numbers)
      const marketCap = coin.market_cap || 0
      const undervaluation = marketCap > 0 ? (1 / marketCap) * 1e12 : 0 // Scale for better normalization

      // 6. Recency = 1 / days_since_last_update
      const recency = 1 / daysSinceLastUpdate

      // Use pre-calculated health score from database
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
        // Store parsed dates for debugging
        parsedFirstTweetDate: firstTweetDate,
        parsedLastUpdateDate: lastUpdateDate,
      }
    })
    .filter((coin) => coin.market_cap && coin.market_cap > 0) // Filter out coins without market cap

  if (enrichedCoins.length === 0) return { enrichedCoins: [], capAnalysis: null, riskIndicators: [] }

  console.log(`Filtered to ${enrichedCoins.length} coins with valid market cap`)

  // 7. Min-max normalize each metric (0-100 scale)
  const socialMomentumValues = enrichedCoins.map((coin) => coin.socialMomentum)
  const developerActivityValues = enrichedCoins.map((coin) => coin.developerActivity)
  const undervaluationValues = enrichedCoins.map((coin) => coin.undervaluation)
  const recencyValues = enrichedCoins.map((coin) => coin.recency)

  const normalizedSocialMomentum = minMaxNormalize(socialMomentumValues)
  const normalizedDeveloperActivity = minMaxNormalize(developerActivityValues)
  const normalizedUndervaluation = minMaxNormalize(undervaluationValues)
  const normalizedRecency = minMaxNormalize(recencyValues)

  // 8. Calculate composite scores
  const coinsWithComposite = enrichedCoins.map((coin, index) => ({
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

  // Calculate market cap thresholds
  const marketCaps = coinsWithComposite.map((coin) => coin.market_cap).filter(Boolean)
  const minCap = Math.min(...marketCaps)
  const maxCap = Math.max(...marketCaps)
  const D = maxCap - minCap

  const tHigh = D / 50
  const tMid = D / 200
  const tLow = D / 1000

  console.log(`Market cap thresholds: Low=${tLow}, Mid=${tMid}, High=${tHigh}`)

  // Categorize coins by market cap
  const categorizedCoins = coinsWithComposite.map((coin) => {
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

  // Find top coins in each category for each metric
  const categories = ["Low Cap", "Mid Cap", "High Cap"] as const
  const metrics = [
    { key: "socialMomentum", normalizedKey: "normalizedSocialMomentum", name: "Social Momentum" },
    { key: "developerActivity", normalizedKey: "normalizedDeveloperActivity", name: "Developer Activity" },
    { key: "compositeScore", normalizedKey: null, name: "Composite Score" },
  ] as const

  const capAnalysis: Record<string, Record<string, any>> = {}

  categories.forEach((category) => {
    const categoryCoins = categorizedCoins.filter((coin) => coin.capCategory === category)

    if (categoryCoins.length > 0) {
      capAnalysis[category] = {}

      metrics.forEach((metric) => {
        const topCoin = categoryCoins.reduce((prev, current) =>
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

  // Identify risk indicators
  const riskIndicators = []

  // Dead coins (health below 10)
  const deadCoins = categorizedCoins
    .filter((coin) => coin.beatScore < 10)
    .sort((a, b) => a.beatScore - b.beatScore)
    .slice(0, 5)

  if (deadCoins.length > 0) {
    riskIndicators.push({
      type: "dead_coins",
      title: "Dead Coins Alert",
      description: `${deadCoins.length} coins with health scores below 10`,
      coins: deadCoins.map((coin) => ({
        name: coin.name,
        symbol: coin.symbol,
        score: coin.beatScore.toFixed(1),
        reason: "Extremely low health score",
      })),
    })
  }

  // Low liquidity (very low volume relative to market cap)
  const lowLiquidityCoins = categorizedCoins
    .filter((coin) => {
      const volumeToMcRatio = (coin.volume_24h || 0) / (coin.market_cap || 1)
      return volumeToMcRatio < 0.001 && coin.market_cap > 1000000 // Less than 0.1% daily volume
    })
    .sort((a, b) => (a.volume_24h || 0) / (a.market_cap || 1) - (b.volume_24h || 0) / (b.market_cap || 1))
    .slice(0, 5)

  if (lowLiquidityCoins.length > 0) {
    riskIndicators.push({
      type: "low_liquidity",
      title: "Low Liquidity Warning",
      description: `${lowLiquidityCoins.length} coins with extremely low trading volume`,
      coins: lowLiquidityCoins.map((coin) => ({
        name: coin.name,
        symbol: coin.symbol,
        ratio: (((coin.volume_24h || 0) / (coin.market_cap || 1)) * 100).toFixed(3),
        reason: "Daily volume < 0.1% of market cap",
      })),
    })
  }

  // Stagnant development (no GitHub updates in 6+ months)
  const stagnantCoins = categorizedCoins
    .filter((coin) => coin.daysSinceLastUpdate > 180 && (coin.github_stars || 0) > 0)
    .sort((a, b) => b.daysSinceLastUpdate - a.daysSinceLastUpdate)
    .slice(0, 5)

  if (stagnantCoins.length > 0) {
    riskIndicators.push({
      type: "stagnant_development",
      title: "Development Stagnation",
      description: `${stagnantCoins.length} coins with no GitHub activity for 6+ months`,
      coins: stagnantCoins.map((coin) => ({
        name: coin.name,
        symbol: coin.symbol,
        days: coin.daysSinceLastUpdate,
        reason: `No updates for ${Math.floor(coin.daysSinceLastUpdate / 30)} months`,
      })),
    })
  }

  return { enrichedCoins: coinsWithComposite, capAnalysis, riskIndicators }
}

// Enhanced web search for crypto news and risks
async function searchCryptoRisks(coins: string[]): Promise<any[]> {
  try {
    const searchResults = []

    for (const coin of coins.slice(0, 8)) {
      try {
        const searchQueries = [
          `${coin} delisted exchange binance coinbase 2024 2025`,
          `${coin} contract migration token swap upgrade`,
          `${coin} security vulnerability hack exploit recent`,
          `${coin} low liquidity trading volume issues`,
          `${coin} exchange listing announcement new`,
        ]

        for (const query of searchQueries) {
          try {
            const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
            const response = await fetch(searchUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (compatible; CocoriBot/1.0)",
              },
            })

            if (response.ok) {
              const data = await response.json()
              const sources = [
                data.AbstractText,
                data.Answer,
                data.RelatedTopics?.[0]?.Text,
                data.Results?.[0]?.Text,
              ].filter(Boolean)

              if (sources.length > 0) {
                searchResults.push({
                  coin,
                  query: query.split(" ").slice(1, 3).join(" "),
                  result: sources[0],
                  risk_type: query.includes("delisted")
                    ? "delisting"
                    : query.includes("migration")
                      ? "migration"
                      : query.includes("security")
                        ? "security"
                        : query.includes("liquidity")
                          ? "liquidity"
                          : "listing",
                  timestamp: new Date().toISOString(),
                })
                break
              }
            }
          } catch (searchError) {
            console.error(`Search error for ${query}:`, searchError)
          }
        }
      } catch (coinError) {
        console.error(`Error processing ${coin}:`, coinError)
      }
    }

    return searchResults
  } catch (error) {
    console.error("Error in crypto risk search:", error)
    return []
  }
}

export async function analyzeMarket(
  detailed = false,
): Promise<{ analysis: string; modelUsed: string; capAnalysis?: any; riskIndicators?: any[] }> {
  try {
    // Perform comprehensive coin analysis
    const { enrichedCoins, capAnalysis, riskIndicators } = await performCoinAnalysis()

    if (enrichedCoins.length === 0) {
      throw new Error("No coin data available for analysis")
    }

    // Sort and categorize coins for traditional analysis
    const topPerformers = enrichedCoins
      .filter((coin) => coin.price_change_24h > 0)
      .sort((a, b) => (b.price_change_24h || 0) - (a.price_change_24h || 0))
      .slice(0, 3)

    const topLosers = enrichedCoins
      .filter((coin) => coin.price_change_24h < 0)
      .sort((a, b) => (a.price_change_24h || 0) - (b.price_change_24h || 0))
      .slice(0, 3)

    const healthiestCoins = enrichedCoins.sort((a, b) => b.beatScore - a.beatScore).slice(0, 3)

    const reactivatedTeams = enrichedCoins
      .filter((coin) => coin.daysSinceLastUpdate < 30 && (coin.github_stars || 0) > 100)
      .sort((a, b) => a.daysSinceLastUpdate - b.daysSinceLastUpdate)
      .slice(0, 3)

    const lowCapGems = enrichedCoins
      .filter((coin) => (coin.market_cap || 0) < 100000000 && coin.socialMomentum > 10)
      .sort((a, b) => b.compositeScore - a.compositeScore)
      .slice(0, 3)

    // Perform web search for risks
    const coinNames = enrichedCoins.slice(0, 15).map((coin) => coin.name)
    const riskResults = await searchCryptoRisks(coinNames)

    // Calculate market metrics
    const totalMarketCap = enrichedCoins.reduce((sum, coin) => sum + (coin.market_cap || 0), 0)
    const avgBeatScore = enrichedCoins.reduce((sum, coin) => sum + coin.beatScore, 0) / enrichedCoins.length
    const bullishCoins = enrichedCoins.filter((coin) => (coin.price_change_24h || 0) > 0).length
    const bullishPercentage = (bullishCoins / enrichedCoins.length) * 100

    const coinList = enrichedCoins
      .slice(0, 20)
      .map(
        (coin) =>
          `${coin.name} (${coin.symbol}): $${coin.price?.toFixed(4)}, MC: ${formatPrice(coin.market_cap || 0)}, Health: ${coin.beatScore.toFixed(1)}/100, 24h: ${coin.price_change_24h?.toFixed(2)}%, Composite: ${coin.compositeScore.toFixed(2)}`,
      )
      .join("\n")

    // Format risk indicators for prompt
    const riskSummary = riskIndicators
      .slice(0, detailed ? riskIndicators.length : 2)
      .map((risk) => `${risk.title}: ${risk.description}`)
      .join("; ")

    const systemPrompt = `You are a seasoned financial advisor with deep expertise in cryptocurrency and traditional markets. 

When analyzing the market, you must ONLY mention coins from the provided list - do not reference any other cryptocurrencies.

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
[Specific migration/delisting alerts with sources, or "No potential migration or delisting detected"]

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
[One line: specific alert with coin name, or "No potential migration or delisting detected"]

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
${topPerformers.map((coin) => `${coin.name}: +${coin.price_change_24h?.toFixed(2)}%`).join(", ")}

TOP LOSERS (24h):
${topLosers.map((coin) => `${coin.name}: ${coin.price_change_24h?.toFixed(2)}%`).join(", ")}

HEALTHIEST PROJECTS:
${healthiestCoins.map((coin) => `${coin.name}: ${coin.beatScore.toFixed(1)}/100 health`).join(", ")}

REACTIVATED TEAMS:
${reactivatedTeams.map((coin) => `${coin.name}: GitHub updated ${coin.daysSinceLastUpdate} days ago`).join(", ")}

LOW-CAP GEMS (<$100M):
${lowCapGems.map((coin) => `${coin.name}: ${formatPrice(coin.market_cap || 0)} MC, Composite: ${coin.compositeScore.toFixed(2)}`).join(", ")}

RISK INDICATORS IDENTIFIED:
${riskIndicators.map((risk) => `${risk.title}: ${risk.coins.map((c: any) => `${c.name} (${c.reason})`).join(", ")}`).join("\n")}

WEB SEARCH RISK RESULTS:
${riskResults.map((result) => `${result.coin} (${result.risk_type}): ${result.result.substring(0, 100)}...`).join("\n")}

TOP COINS BY COMPOSITE SCORE:
${enrichedCoins
  .slice(0, 10)
  .sort((a, b) => b.compositeScore - a.compositeScore)
  .map((coin) => `${coin.name}: ${coin.compositeScore.toFixed(2)}`)
  .join(", ")}

ALL AVAILABLE COINS:
${coinList}

${detailed ? "Provide comprehensive analysis with detailed insights for each category and include all risk indicators." : "Provide ultra-concise expert analysis following the exact format specified with top 2 risks only."}
`

    const { text: analysis, modelUsed } = await generateWithFallback(systemPrompt, userPrompt)

    return { analysis, modelUsed, capAnalysis, riskIndicators }
  } catch (error) {
    console.error("Error analyzing market:", error)
    throw new Error("Failed to analyze market. Please try again.")
  }
}