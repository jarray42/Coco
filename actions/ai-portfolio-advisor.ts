"use server"

import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"
import { openai } from "@ai-sdk/openai"
import { anthropic } from "@ai-sdk/anthropic"
import { getUserPortfolio, type PortfolioItem } from "../utils/portfolio"
import { fetchCoins } from "./fetch-coins"
import { getHealthScore, type CryptoData } from "../utils/beat-calculator"
import { formatPrice } from "../utils/beat-calculator"
import type { AuthUser } from "../utils/supabase-auth"
import { getAllCoinsFromBunny } from "./fetch-all-coins-from-bunny"

interface PortfolioAnalysis {
  totalValue: number
  totalCoins: number
  avgHealthScore: number
  topPerformer: any
  worstPerformer: any
  riskLevel: string
  diversification: string
  recommendations: string[]
  inactiveTeams: any[]
  webSearchResults: any[]
}

interface AIModel {
  name: string
  provider: string
  model: any
  priority: number
  dailyLimit: number
  quality: "excellent" | "very-good" | "good" | "basic"
  speed: "very-fast" | "fast" | "medium" | "slow"
}

// Update the AI_MODELS array with currently supported Groq models
const AI_MODELS: AIModel[] = [
  {
    name: "Groq Llama 3.1 8B",
    provider: "groq",
    model: process.env.GROQ_API_KEY ? groq("llama-3.1-8b-instant") : null,
    priority: 1,
    dailyLimit: 14400, // 600/hour * 24 hours
    quality: "very-good",
    speed: "very-fast",
  },
  {
    name: "Groq Mixtral 8x7B",
    provider: "groq",
    model: process.env.GROQ_API_KEY ? groq("mixtral-8x7b-32768") : null,
    priority: 2,
    dailyLimit: 14400,
    quality: "excellent",
    speed: "very-fast",
  },
  {
    name: "OpenAI GPT-4o Mini",
    provider: "openai",
    model: process.env.OPENAI_API_KEY ? openai("gpt-4o-mini") : null,
    priority: 3,
    dailyLimit: 200, // Free tier daily limit
    quality: "excellent",
    speed: "fast",
  },
  {
    name: "OpenAI GPT-3.5 Turbo",
    provider: "openai",
    model: process.env.OPENAI_API_KEY ? openai("gpt-3.5-turbo") : null,
    priority: 4,
    dailyLimit: 200,
    quality: "very-good",
    speed: "fast",
  },
  {
    name: "Anthropic Claude Haiku",
    provider: "anthropic",
    model: process.env.ANTHROPIC_API_KEY ? anthropic("claude-3-haiku-20240307") : null,
    priority: 5,
    dailyLimit: 100, // Conservative estimate for free tier
    quality: "very-good",
    speed: "medium",
  },
]

// Simple in-memory usage tracking (in production, use Redis or database)
const modelUsage = new Map<string, { count: number; lastReset: Date }>()

function getAvailableModel(): { model: any; modelInfo: AIModel } | null {
  const today = new Date().toDateString()

  for (const modelConfig of AI_MODELS) {
    if (!modelConfig.model) continue // Skip if API key not available

    const usageKey = `${modelConfig.provider}-${today}`
    const usage = modelUsage.get(usageKey) || { count: 0, lastReset: new Date() }

    // Reset daily counter if it's a new day
    if (usage.lastReset.toDateString() !== today) {
      usage.count = 0
      usage.lastReset = new Date()
      modelUsage.set(usageKey, usage)
    }

    // Check if model is under daily limit
    if (usage.count < modelConfig.dailyLimit) {
      return { model: modelConfig.model, modelInfo: modelConfig }
    }
  }

  return null // No available models
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

    // Increment usage counter on success
    incrementModelUsage(availableModel.modelInfo.provider)

    return {
      text,
      modelUsed: `${availableModel.modelInfo.name} (${availableModel.modelInfo.quality} quality, ${availableModel.modelInfo.speed} speed)`,
    }
  } catch (error) {
    console.error(`Error with ${availableModel.modelInfo.name}:`, error)

    // Mark this model as temporarily unavailable and try next one
    const today = new Date().toDateString()
    const usageKey = `${availableModel.modelInfo.provider}-${today}`
    const usage = modelUsage.get(usageKey) || { count: 0, lastReset: new Date() }
    usage.count = availableModel.modelInfo.dailyLimit // Max out this model
    modelUsage.set(usageKey, usage)

    // Recursively try the next available model
    return generateWithFallback(systemPrompt, userPrompt)
  }
}

// New: allow explicit model preference aligned with market AI
async function generateWithModelPreference(
  systemPrompt: string,
  userPrompt: string,
  model: string,
): Promise<{ text: string; modelUsed: string }> {
  try {
    if (model && model.startsWith('openrouter-')) {
      const openRouterModelMap: Record<string, string> = {
        'openrouter-qwen3-235b-a22b-07-25': 'qwen/qwen3-235b-a22b-07-25',
        'openrouter-deepseek-r1t2-chimera': 'tngtech/deepseek-r1t2-chimera',
        'openrouter-mistral-small-3.2-24b': 'mistralai/mistral-small-3.2-24b-instruct',
        'openrouter-qwen3-4b': 'qwen/qwen3-4b',
        'openrouter-qwen3-235b-a22b': 'qwen/qwen3-235b-a22b',
        'openrouter-gemma-3-27b-it': 'google/gemma-3-27b-it',
        'openrouter-gemini-pro': 'google/gemini-pro',
        'openrouter-gpt-4o-mini-2024-07-18': 'openai/gpt-4o-mini-2024-07-18',
        'openrouter-gbtoss': 'openai/gpt-oss-20b:free',
      }
      const modelId = openRouterModelMap[model] || 'qwen2-72b-instruct'
      const apiKey = process.env.OPENROUTER_API_KEY
      if (!apiKey) throw new Error('OPENROUTER_API_KEY not set')
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      })
      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(`OpenRouter API error: ${response.status} ${errorBody}`)
      }
      const data = await response.json()
      const text = data.choices?.[0]?.message?.content || 'No response from OpenRouter model.'
      return { text, modelUsed: model }
    }
    if (model === 'auto' || !model) {
      return generateWithFallback(systemPrompt, userPrompt)
    }
    let selectedModel: any
    if (model === 'llama-3.1-8b-instant') {
      selectedModel = groq('llama-3.1-8b-instant')
    } else if (model === 'mixtral-8x7b-32768') {
      selectedModel = groq('mixtral-8x7b-32768')
    } else if (model === 'gpt-4o-mini') {
      selectedModel = openai('gpt-4o-mini')
    } else if (model === 'claude-3-haiku-20240307') {
      selectedModel = anthropic('claude-3-haiku-20240307')
    } else {
      selectedModel = groq('llama-3.1-8b-instant')
    }
    const { text } = await generateText({ model: selectedModel, system: systemPrompt, prompt: userPrompt })
    return { text, modelUsed: model }
  } catch (err) {
    console.error('[generateWithModelPreference ERROR]', err)
    // fallback chain
    return generateWithFallback(systemPrompt, userPrompt)
  }
}

// Add a fetchWithTimeout helper at the top of the file
async function fetchWithTimeout(resource: string, options: any = {}, timeout = 3000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    return null;
  }
}

// Refactor searchCryptoNews to run all fetches in parallel
async function searchCryptoNews(coins: string[]): Promise<any[]> {
  try {
    const searchResults = []
    const queries = []
    for (const coin of coins.slice(0, 5)) {
      for (const query of [
        `${coin} contract migration token swap 2024 2025`,
        `${coin} delisted exchange binance coinbase kraken`,
        `${coin} security vulnerability hack exploit`,
        `${coin} mainnet upgrade hard fork`,
        `${coin} exchange listing new trading pairs`,
      ]) {
        for (const url of [
          `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
          `https://api.duckduckgo.com/?q=${encodeURIComponent(`${coin} crypto news`)}&format=json&no_html=1&skip_disambig=1`,
        ]) {
          queries.push({ coin, query, url })
        }
      }
    }
    // Run all fetches in parallel with timeout
    const fetches = queries.map(async ({ coin, query, url }) => {
      const response = await fetchWithTimeout(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; CocoriBot/1.0)" }
      }, 3000)
      if (response && response.ok) {
        const data = await response.json()
        const sources = [
          data.AbstractText,
          data.Answer,
          data.RelatedTopics?.[0]?.Text,
          data.Results?.[0]?.Text,
        ].filter(Boolean)
        if (sources.length > 0) {
          return {
            coin,
            query,
            result: sources[0],
            source: "Web Search",
            timestamp: new Date().toISOString(),
          }
        }
      }
      return null
    })
    const results = await Promise.all(fetches)
    for (const res of results) {
      if (res) searchResults.push(res)
    }
    if (searchResults.length === 0) {
      searchResults.push({
        coin: "General",
        query: "market news",
        result: "No specific migration or delisting alerts found. Monitor official channels and exchanges for updates.",
        source: "General Advisory",
        timestamp: new Date().toISOString(),
      })
    }
    return searchResults
  } catch (error) {
    console.error("Error in comprehensive web search:", error)
    return [
      {
        coin: "Search System",
        query: "system error",
        result:
          "News search temporarily unavailable. Please check official coin websites and exchange announcements manually.",
        source: "System Error",
        timestamp: new Date().toISOString(),
      },
    ]
  }
}

// Helper to map CoinData to CryptoData
function mapCoinDataToCryptoData(coin: any) {
  return {
    rank: coin.rank ?? 0,
    name: coin.name ?? "",
    symbol: coin.symbol ?? "",
    coingecko_url: coin.coingecko_url ?? "",
    price: coin.price ?? 0,
    market_cap: coin.market_cap ?? 0,
    twitter_handle: coin.twitter_handle ?? "",
    twitter_url: coin.twitter_url ?? "",
    twitter_followers: coin.twitter_followers ?? 0,
    twitter_first_tweet_date: coin.twitter_first_tweet_date ?? "",
            github: coin.github_url ?? "",
    github_stars: coin.github_stars ?? 0,
    github_forks: coin.github_forks ?? 0,
    github_last_updated: coin.github_last_updated ?? "",
    scraped_at: coin.scraped_at ?? "",
    coingecko_id: coin.coingecko_id ?? "",
    price_change_24h: coin.price_change_24h ?? 0,
    volume_24h: coin.volume_24h ?? 0,
    last_updated: coin.last_updated ?? "",
    logo_url: coin.logo_url ?? "",
    logo_storage_path: coin.logo_storage_path ?? "",
  }
}

export async function analyzePortfolioWithAI(
  user: AuthUser,
  model: string = 'auto',
): Promise<{ analysis: PortfolioAnalysis; advice: string; modelUsed: string }> {
  try {
    // Get user's portfolio
    const portfolioItems = await getUserPortfolio(user)
    console.log("Fetched portfolioItems for user", user.id, portfolioItems);
    const allCoins = await getAllCoinsFromBunny()

    // Enrich portfolio with current market data
    const enrichedPortfolio = portfolioItems.map((item) => {
      const coinData = allCoins.find((coin) => coin.coingecko_id === item.coingecko_id)
      if (!coinData) {
        console.warn("No coinData found for", item.coingecko_id, item.coin_name);
      }
      const beatScore = coinData ? getHealthScore(coinData) : 0
      const totalValue = coinData && item.amount ? coinData.price * item.amount : 0
      const priceChange24h = coinData?.price_change_24h || 0

      return {
        ...item,
        coinData,
        beatScore,
        totalValue,
        priceChange24h,
        marketCap: coinData?.market_cap || 0,
        volume24h: coinData?.volume_24h || 0,
        githubStars: coinData?.github_stars || 0,
        twitterFollowers: coinData?.twitter_followers || 0,
        githubLastUpdated: coinData?.github_last_updated,
        twitterFirstTweet: coinData?.twitter_first_tweet_date,
      }
    })
    console.log("Enriched portfolio for AI:", enrichedPortfolio);

    // Calculate portfolio analysis
    const totalValue = enrichedPortfolio.reduce((sum, item) => sum + (item.totalValue || 0), 0)
    const avgHealthScore =
      enrichedPortfolio.length > 0
        ? enrichedPortfolio.reduce((sum, item) => sum + (item.beatScore || 0), 0) / enrichedPortfolio.length
        : 0

    // Find top and worst performers
    const sortedByPerformance = enrichedPortfolio
      .filter((item) => item.priceChange24h !== undefined)
      .sort((a, b) => (b.priceChange24h || 0) - (a.priceChange24h || 0))

    const topPerformer = sortedByPerformance[0]
    const worstPerformer = sortedByPerformance[sortedByPerformance.length - 1]

    // Identify inactive teams (GitHub not updated in 90+ days, low Twitter activity)
    const inactiveTeams = enrichedPortfolio.filter((item) => {
      const githubStale = item.githubLastUpdated
        ? (new Date().getTime() - new Date(item.githubLastUpdated).getTime()) / (1000 * 60 * 60 * 24) > 90
        : true
      const lowSocial = (item.githubStars || 0) < 100 && (item.twitterFollowers || 0) < 1000
      return githubStale || lowSocial
    })

    // Calculate risk level based on portfolio composition
    const highRiskCoins = enrichedPortfolio.filter((item) => (item.beatScore || 0) < 30).length
    const totalCoins = enrichedPortfolio.length
    const riskPercentage = totalCoins > 0 ? (highRiskCoins / totalCoins) * 100 : 0

    let riskLevel = "Low"
    if (riskPercentage > 60) riskLevel = "High"
    else if (riskPercentage > 30) riskLevel = "Medium"

    // Assess diversification
    const marketCapDistribution = {
      large: enrichedPortfolio.filter((item) => (item.marketCap || 0) > 10e9).length,
      medium: enrichedPortfolio.filter((item) => (item.marketCap || 0) > 1e9 && (item.marketCap || 0) <= 10e9).length,
      small: enrichedPortfolio.filter((item) => (item.marketCap || 0) <= 1e9).length,
    }

    let diversification = "Poor"
    if (marketCapDistribution.large > 0 && marketCapDistribution.medium > 0 && marketCapDistribution.small > 0) {
      diversification = "Excellent"
    } else if (
      (marketCapDistribution.large > 0 && marketCapDistribution.medium > 0) ||
      (marketCapDistribution.medium > 0 && marketCapDistribution.small > 0)
    ) {
      diversification = "Good"
    } else if (totalCoins > 3) {
      diversification = "Fair"
    }

    // Perform web search for contract migrations and delistings
    const coinNames = enrichedPortfolio.map((item) => item.coin_name)
    const webSearchResults = await searchCryptoNews(coinNames)

    const analysis: PortfolioAnalysis = {
      totalValue,
      totalCoins,
      avgHealthScore,
      topPerformer,
      worstPerformer,
      riskLevel,
      diversification,
      recommendations: [],
      inactiveTeams,
      webSearchResults,
    }

    // Create detailed portfolio summary for AI
    const portfolioSummary = enrichedPortfolio.map((item) => ({
      name: item.coin_name,
      symbol: item.coin_symbol,
      amount: item.amount,
      value: item.totalValue,
      healthScore: item.beatScore,
      priceChange24h: item.priceChange24h,
      marketCap: item.marketCap,
      githubStars: item.githubStars,
      twitterFollowers: item.twitterFollowers,
      githubLastUpdated: item.githubLastUpdated,
      isInactive: inactiveTeams.some((inactive) => inactive.coin_name === item.coin_name),
    }))
    console.log("AI Prompt Portfolio Summary:", portfolioSummary);

    const systemPrompt = `You are a seasoned financial advisor with deep expertise in cryptocurrency and traditional markets. 

When analyzing a portfolio, you must:
1. Analyze portfolio health & allocation (diversification, volatility, risk, best performer)
2. Compare performance vs benchmarks, highlight top/bottom movers, flag low development/social activity
3. Identify rebalancing needs and recommend based on GitHub/Twitter activity from all coins
4. Analyze price history charts from price_history table for technical signals
5. Search recent crypto news for security issues, migrations, delistings, exchange listings
6. Run scenario tests for risk assessment

RESPONSE FORMAT (elegant and professional):

PORTFOLIO HEALTH: [One clear, professional assessment line]

TOP 3 INSIGHTS:
• [Insight 1 - clear statement with concrete numbers]
• [Insight 2 - clear statement with concrete numbers] 
• [Insight 3 - clear statement with concrete numbers]

MIGRATION & DELISTING ALERTS:
[One clear line: either specific alert with source or "No potential migration or delisting detected"]

ACTION REQUIRED:
[One clear recommendation with verb + concrete numbers, or "No immediate action required"]

Keep language professional and elegant. Use concrete percentages and amounts. No markdown formatting.`

    const userPrompt = `Analyze this portfolio (be extremely concise):

PORTFOLIO: ${formatPrice(totalValue)}, ${totalCoins} coins, ${avgHealthScore.toFixed(1)}/100 health
BEST: ${topPerformer ? `${topPerformer.coin_name} (+${topPerformer.priceChange24h?.toFixed(2)}%)` : "None"}
WORST: ${worstPerformer ? `${worstPerformer.coin_name} (${worstPerformer.priceChange24h?.toFixed(2)}%)` : "None"}

HOLDINGS:
${portfolioSummary
  .map(
    (coin) =>
      `${coin.name}: ${formatPrice(coin.value || 0)}, Health: ${coin.healthScore?.toFixed(1)}/100, GitHub: ${coin.githubStars || 0} stars, Social: ${coin.twitterFollowers || 0}${coin.isInactive ? " [INACTIVE]" : ""}`,
  )
  .join("\n")}

WEB SEARCH RESULTS:
${webSearchResults.map((result) => `${result.coin}: ${result.result}`).join("\n")}

Provide ultra-concise expert analysis.`

    const { text: advice, modelUsed } = await generateWithModelPreference(systemPrompt, userPrompt, model)

    return { analysis, advice, modelUsed }
  } catch (error) {
    console.error("Error analyzing portfolio with AI:", error)
    throw new Error("Failed to analyze portfolio. Please try again.")
  }
}

// Add a new function for detailed analysis
export async function getDetailedPortfolioAnalysis(
  user: AuthUser,
  model: string = 'auto',
): Promise<{ analysis: PortfolioAnalysis; advice: string; modelUsed: string }> {
  try {
    // Get user's portfolio (same as analyzePortfolioWithAI)
    const portfolioItems = await getUserPortfolio(user)
    const allCoins = await getAllCoinsFromBunny()

    // Enrich portfolio with current market data
    const enrichedPortfolio = portfolioItems.map((item) => {
      const coinData = allCoins.find((coin) => coin.coingecko_id === item.coingecko_id)
      const beatScore = coinData ? getHealthScore(coinData) : 0
      const totalValue = coinData && item.amount ? coinData.price * item.amount : 0
      const priceChange24h = coinData?.price_change_24h || 0

      return {
        ...item,
        coinData,
        beatScore,
        totalValue,
        priceChange24h,
        marketCap: coinData?.market_cap || 0,
        volume24h: coinData?.volume_24h || 0,
        githubStars: coinData?.github_stars || 0,
        twitterFollowers: coinData?.twitter_followers || 0,
        githubLastUpdated: coinData?.github_last_updated,
        twitterFirstTweet: coinData?.twitter_first_tweet_date,
      }
    })

    // Calculate portfolio analysis (same logic as before)
    const totalValue = enrichedPortfolio.reduce((sum, item) => sum + (item.totalValue || 0), 0)
    const avgHealthScore =
      enrichedPortfolio.length > 0
        ? enrichedPortfolio.reduce((sum, item) => sum + (item.beatScore || 0), 0) / enrichedPortfolio.length
        : 0

    const sortedByPerformance = enrichedPortfolio
      .filter((item) => item.priceChange24h !== undefined)
      .sort((a, b) => (b.priceChange24h || 0) - (a.priceChange24h || 0))

    const topPerformer = sortedByPerformance[0]
    const worstPerformer = sortedByPerformance[sortedByPerformance.length - 1]

    const inactiveTeams = enrichedPortfolio.filter((item) => {
      const githubStale = item.githubLastUpdated
        ? (new Date().getTime() - new Date(item.githubLastUpdated).getTime()) / (1000 * 60 * 60 * 24) > 90
        : true
      const lowSocial = (item.githubStars || 0) < 100 && (item.twitterFollowers || 0) < 1000
      return githubStale || lowSocial
    })

    const highRiskCoins = enrichedPortfolio.filter((item) => (item.beatScore || 0) < 30).length
    const totalCoins = enrichedPortfolio.length
    const riskPercentage = totalCoins > 0 ? (highRiskCoins / totalCoins) * 100 : 0

    let riskLevel = "Low"
    if (riskPercentage > 60) riskLevel = "High"
    else if (riskPercentage > 30) riskLevel = "Medium"

    const marketCapDistribution = {
      large: enrichedPortfolio.filter((item) => (item.marketCap || 0) > 10e9).length,
      medium: enrichedPortfolio.filter((item) => (item.marketCap || 0) > 1e9 && (item.marketCap || 0) <= 10e9).length,
      small: enrichedPortfolio.filter((item) => (item.marketCap || 0) <= 1e9).length,
    }

    let diversification = "Poor"
    if (marketCapDistribution.large > 0 && marketCapDistribution.medium > 0 && marketCapDistribution.small > 0) {
      diversification = "Excellent"
    } else if (
      (marketCapDistribution.large > 0 && marketCapDistribution.medium > 0) ||
      (marketCapDistribution.medium > 0 && marketCapDistribution.small > 0)
    ) {
      diversification = "Good"
    } else if (totalCoins > 3) {
      diversification = "Fair"
    }

    const coinNames = enrichedPortfolio.map((item) => item.coin_name)
    const webSearchResults = await searchCryptoNews(coinNames)

    const analysis: PortfolioAnalysis = {
      totalValue,
      totalCoins,
      avgHealthScore,
      topPerformer,
      worstPerformer,
      riskLevel,
      diversification,
      recommendations: [],
      inactiveTeams,
      webSearchResults,
    }

    const portfolioSummary = enrichedPortfolio.map((item) => ({
      name: item.coin_name,
      symbol: item.coin_symbol,
      amount: item.amount,
      value: item.totalValue,
      healthScore: item.beatScore,
      priceChange24h: item.priceChange24h,
      marketCap: item.marketCap,
      githubStars: item.githubStars,
      twitterFollowers: item.twitterFollowers,
      githubLastUpdated: item.githubLastUpdated,
      isInactive: inactiveTeams.some((inactive) => inactive.coin_name === item.coin_name),
    }))

    const detailedSystemPrompt = `You are a seasoned financial advisor providing comprehensive cryptocurrency portfolio analysis.

Structure your response with clear sections using this EXACT format:

EXECUTIVE SUMMARY
[One paragraph overview of portfolio health and key findings]

PORTFOLIO COMPOSITION ANALYSIS
• [Bullet point about diversification]
• [Bullet point about allocation balance]
• [Bullet point about risk distribution]

PERFORMANCE & DEVELOPMENT METRICS
• [Bullet point about GitHub activity trends]
• [Bullet point about social engagement analysis]
• [Bullet point about price performance vs benchmarks]

RISK ASSESSMENT & SCENARIOS
• [Bullet point about current risk exposure]
• [Bullet point about correlation analysis]
• [Bullet point about stress test scenarios]

MARKET INTELLIGENCE & ALERTS
• [Bullet point about migration/delisting status]
• [Bullet point about exchange listing opportunities]
• [Bullet point about security considerations]

STRATEGIC RECOMMENDATIONS
• [Bullet point with specific rebalancing advice]
• [Bullet point with tactical adjustments]
• [Bullet point with timeline for actions]

TECHNICAL ANALYSIS INSIGHTS
• [Bullet point about price trends and patterns]
• [Bullet point about volume analysis]
• [Bullet point about support/resistance levels]

Use professional, elegant language. Each bullet point should be concise but actionable with specific percentages or amounts where relevant. No markdown formatting.`

    const detailedUserPrompt = `Provide comprehensive portfolio analysis:

PORTFOLIO OVERVIEW:
- Total Value: ${formatPrice(totalValue)}
- Total Coins: ${totalCoins}
- Average Health Score: ${avgHealthScore.toFixed(1)}/100
- Risk Level: ${riskLevel}
- Diversification: ${diversification}

PERFORMANCE DATA:
- Best Performer: ${topPerformer ? `${topPerformer.coin_name} (+${topPerformer.priceChange24h?.toFixed(2)}%)` : "None"}
- Worst Performer: ${worstPerformer ? `${worstPerformer.coin_name} (${worstPerformer.priceChange24h?.toFixed(2)}%)` : "None"}

DETAILED HOLDINGS:
${portfolioSummary
  .map(
    (coin) =>
      `${coin.name} (${coin.symbol}):
  - Amount: ${coin.amount}
  - Value: ${formatPrice(coin.value || 0)}
  - Health Score: ${coin.healthScore?.toFixed(1)}/100
  - 24h Change: ${coin.priceChange24h?.toFixed(2)}%
  - Market Cap: ${formatPrice(coin.marketCap || 0)}
  - GitHub Stars: ${coin.githubStars || 0}
  - Twitter Followers: ${coin.twitterFollowers || 0}
  - Development Status: ${coin.isInactive ? "INACTIVE" : "ACTIVE"}`,
  )
  .join("\n\n")}

INACTIVE DEVELOPMENT TEAMS:
${inactiveTeams.map((team) => `${team.coin_name}: Stale GitHub activity or low social engagement`).join("\n")}

MARKET NEWS & ALERTS:
${webSearchResults.map((result) => `${result.coin}: ${result.result}`).join("\n")}

HISTORICAL DATA ACCESS:
- Price history data available from price_history table for technical analysis
- GitHub activity trends from github_last_updated timestamps
- Social engagement patterns from twitter metrics over time

Provide comprehensive analysis with specific actionable recommendations, concrete percentages, and detailed insights for each section.`

    const { text: advice, modelUsed } = await generateWithModelPreference(detailedSystemPrompt, detailedUserPrompt, model)

    return { analysis, advice, modelUsed }
  } catch (error) {
    console.error("Error in detailed portfolio analysis:", error)
    throw new Error("Failed to generate detailed analysis. Please try again.")
  }
}

export async function chatWithPortfolioBot(
  user: AuthUser,
  message: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<{ response: string; modelUsed: string }> {
  try {
    // Get current portfolio data for context
    const portfolioItems = await getUserPortfolio(user)
    const allCoins = await getAllCoinsFromBunny()

    const enrichedPortfolio = portfolioItems.map((item) => {
      const coinData = allCoins.find((coin) => coin.coingecko_id === item.coingecko_id)
      const beatScore = coinData ? getHealthScore(coinData) : 0
      const totalValue = coinData && item.amount ? coinData.price * item.amount : 0

      return {
        name: item.coin_name,
        symbol: item.coin_symbol,
        amount: item.amount,
        value: totalValue,
        healthScore: beatScore,
        priceChange24h: coinData?.price_change_24h || 0,
      }
    })

    const totalValue = enrichedPortfolio.reduce((sum, item) => sum + (item.value || 0), 0)

    // Build conversation context
    const conversationContext = conversationHistory
      .slice(-10) // Keep last 10 messages for context
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n")

    const systemPrompt = `You are a seasoned financial advisor with deep expertise in cryptocurrency and traditional markets. Pull the user's real-time portfolio data from Supabase and combine it with up-to-date market info from the web. When the user interacts, always respond very short answer, deliver concise, on-point, actionable insights and recommendations tailored to their holdings. Keep each response brief, clear, and focused on optimizing their crypto portfolio. Never invent unseen holdings or metrics. Never recommend things which are obvious only actionable answers. Always end by offering to answer follow-up questions related to their portfolio, the previous question or the market as crypto adviser.

Current user portfolio context:
- Total Value: ${formatPrice(totalValue)}
- Holdings: ${enrichedPortfolio.map((coin) => `${coin.name}: ${coin.amount} (${formatPrice(coin.value || 0)}, Health: ${coin.healthScore?.toFixed(1)}/100, 24h: ${coin.priceChange24h?.toFixed(2)}%)`).join(", ")}

Previous conversation:
${conversationContext}

Rules:
- Maximum 100 words per response
- Only actionable, non-obvious advice
- Use specific numbers from their actual portfolio
- No generic crypto advice
- Never refuse to give advice
- Do not mention supbase, or anything related to how the webapp is built. no useless information
- Answer only based on the user prompts
- Use clear, confident language, but avoid jargon without explanation.  
- When appropriate, Give Performance Analysis (Sharpe ratio)
- When appropriate, Quote percentages, USD values, and time frames precisely.  
- When appropriate, cite market context or trends ("Given BTC's 12% rally last month…").
- If the user's request is ambiguous, ask follow-up questions ("Would you like a tax-optimized rebalance?").
- Always end with follow-up offer`

    const { text, modelUsed } = await generateWithFallback(systemPrompt, message)

    return { response: text, modelUsed }
  } catch (error) {
    console.error("Error in portfolio bot chat:", error)
    return {
      response:
        "Sorry, I'm having trouble right now. All AI models may have reached their daily limits. Please try again later! 🐓",
      modelUsed: "Error - No model available",
    }
  }
}

// Utility function to get current usage stats (for admin dashboard)
export async function getAIUsageStats() {
  const today = new Date().toDateString()
  const stats = []

  for (const modelConfig of AI_MODELS) {
    if (!modelConfig.model) continue

    const usageKey = `${modelConfig.provider}-${today}`
    const usage = modelUsage.get(usageKey) || { count: 0, lastReset: new Date() }

    stats.push({
      name: modelConfig.name,
      provider: modelConfig.provider,
      used: usage.count,
      limit: modelConfig.dailyLimit,
      percentage: (usage.count / modelConfig.dailyLimit) * 100,
      quality: modelConfig.quality,
      speed: modelConfig.speed,
      available: usage.count < modelConfig.dailyLimit,
    })
  }

  return stats
}
