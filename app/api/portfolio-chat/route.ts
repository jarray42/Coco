import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/utils/supabase"
import { getHealthScore, formatPrice } from "@/utils/beat-calculator"
import { getUserPortfolio } from "@/utils/portfolio"
import { fetchCoins } from "@/actions/fetch-coins"
import { type AuthUser } from "@/utils/supabase-auth"
import { streamText } from "ai"
import { checkQuotaLimit, incrementTokenUsage } from "@/utils/quota-manager"

export const runtime = "edge"

function mapCoinDataToCryptoData(coin: any) {
  return {
    rank: coin.rank ?? 0,
    name: coin.name ?? "",
    symbol: coin.symbol ?? "",
    coingecko_url: "",
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
    scraped_at: coin.created_at ?? "",
    coingecko_id: coin.coingecko_id ?? "",
    price_change_24h: coin.price_change_24h ?? 0,
    volume_24h: coin.volume_24h ?? 0,
    last_updated: coin.last_updated ?? "",
    logo_url: coin.logo_url ?? "",
    logo_storage_path: coin.logo_storage_path ?? "",
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, input, chatHistory } = await req.json()
    if (!user || !user.id) {
      return new Response(JSON.stringify({ error: "Missing user" }), { status: 400 })
    }
    // Quota enforcement
    const { canProceed, quota, remainingTokens } = await checkQuotaLimit(user, 1)
    if (!canProceed || !quota) {
      return new Response(JSON.stringify({
        error: "Quota exceeded. Please upgrade your plan.",
        needUpgrade: true,
        quota: quota || {
          tokens_used: 0,
          token_balance: 0,
          billing_plan: "free",
        },
      }), { status: 403 })
    }
    // Fetch user's portfolio and current market data
    const portfolioItems = await getUserPortfolio(user)
    const { coins: allCoins } = await fetchCoins()
    const enrichedPortfolio = portfolioItems.map((item) => {
      const coinData = allCoins.find((coin) => coin.coingecko_id === item.coingecko_id)
      const beatScore = coinData ? getHealthScore(mapCoinDataToCryptoData(coinData)) : 0
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
    // Build the system prompt using the same logic as analyzePortfolioWithAI
    const systemPrompt = `You are a seasoned financial advisor with deep expertise in cryptocurrency and traditional markets. Pull the user's real-time portfolio data from Supabase and combine it with up-to-date market info from the web. When the user interacts, always respond very short answer, deliver concise, on-point, actionable insights and recommendations tailored to their holdings. Keep each response brief, clear, and focused on optimizing their crypto portfolio. Never invent unseen holdings or metrics. Never recommend things which are obvious only actionable answers. Always end by offering to answer follow-up questions related to their portfolio, the previous question or the market as crypto adviser.

Current user portfolio context:
- Total Value: ${formatPrice(totalValue)}
- Holdings: ${enrichedPortfolio.map((coin) => `${coin.name}: ${coin.amount} (${formatPrice(coin.value || 0)}, Health: ${coin.healthScore?.toFixed(1)}/100, 24h: ${coin.priceChange24h?.toFixed(2)}%)`).join(", ")}

Rules:
- Maximum 100 words per response
- Only actionable, non-obvious advice
- Use specific numbers from their actual portfolio
- No generic crypto advice
- Always end with follow-up offer`
    const safeHistory = (chatHistory || []).map((msg: any) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content,
    }))
    const messages = [
      { role: "system", content: systemPrompt },
      ...safeHistory,
      { role: "user", content: input },
    ]
    // Use your preferred model (Groq, OpenAI, etc.)
    const model = process.env.GROQ_API_KEY ? require("@ai-sdk/groq").groq("llama-3.1-8b-instant") : require("@ai-sdk/openai").openai("gpt-4o-mini")
    const response = await streamText({ model, messages }).toTextStreamResponse()
    // Increment usage after successful response
    await incrementTokenUsage(user, 1)
    return response
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Portfolio chat error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
} 