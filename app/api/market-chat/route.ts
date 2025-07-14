import { NextRequest, NextResponse } from "next/server"
import { fetchCoins, type CoinData } from "@/utils/supabase"
import { getHealthScore } from "@/utils/beat-calculator"
import { streamText } from "ai"
import { groq } from "@ai-sdk/groq"

export const runtime = "edge"

// Helper to map CoinData to CryptoData (for beat score)
function mapCoinDataToCryptoData(coin: CoinData) {
  return {
    rank: coin.rank ?? 0,
    name: coin.name ?? "",
    symbol: coin.symbol ?? "",
    coingecko_url: "", // Not available
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
    // Fetch top coins from Supabase
    const { coins, error } = await fetchCoins()
    if (error) {
      return new Response(JSON.stringify({ error }), { status: 500 })
    }
    const topCoins = coins
      .filter((coin) => coin.market_cap && coin.price)
      .slice(0, 20)
      .map((coin: CoinData) => ({
        name: coin.name,
        symbol: coin.symbol,
        price: coin.price,
        change24h: coin.price_change_24h,
        marketCap: coin.market_cap,
        volume: coin.volume_24h,
        beatScore: getHealthScore(mapCoinDataToCryptoData(coin)),
        githubStars: coin.github_stars,
        twitterFollowers: coin.twitter_followers,
      }))
    // Build conversation context
    const conversationContext = (chatHistory || [])
      .slice(-6)
      .map((msg: any) => `${msg.role}: ${msg.content}`)
      .join("\n")
    const systemPrompt = `You are CocoriAI, a cryptocurrency market analyst for the CocoriCoin platform. You have access to real-time data from the CocoriCoin database.\n\nCurrent top coins in CocoriCoin database:\n${topCoins.map((coin) => `${coin.name} (${coin.symbol}): $${coin.price?.toFixed(4)}, 24h: ${coin.change24h?.toFixed(2)}%, Beat Score: ${coin.beatScore?.toFixed(1)}/100, Market Cap: $${(coin.marketCap || 0).toLocaleString()}`).join("\n")}\n\nPrevious conversation:\n${conversationContext}\n\nSTRICT RULES (do not break these):\n- You MUST ONLY mention coins from the provided list above.\n- If the user asks about a coin not in the list, say: 'Sorry, [coin] is not available in the CocoriCoin database.'\n- Never invent or reference coins not in the list.\n- Keep responses under 100 words.\n- Provide actionable insights, not generic advice.\n- Use the Beat Score (community engagement + development activity) and consistency score in your analysis.\n- Always end by offering to answer follow-up questions.\n- Incorporate key technical indicators if you think it is useful:\n  • Moving Averages (e.g., 50/200 SMA crossovers for trend direction).  \n  • RSI (highlight overbought/oversold levels at 70/30).  \n  • MACD (note bullish/bearish crossovers and divergence).  \n  • Bollinger Bands (spot squeezes and breakouts).\n- Be conversational but professional.`

    // Debug log for coin list and prompt
    console.log("[Market Chat] Top coins for prompt:", topCoins.map(c => c.name + " (" + c.symbol + ")").join(", "))
    console.log("[Market Chat] System prompt:", systemPrompt)
    // Stream the AI response
    const stream = await streamText({
      model: groq("llama-3.1-8b-instant"),
      system: systemPrompt,
      prompt: input,
      maxTokens: 300,
      temperature: 0.7,
    })
    return new Response(stream.toDataStream(), { headers: { "Content-Type": "text/plain; charset=utf-8" } })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), { status: 500 })
  }
} 