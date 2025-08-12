import { NextRequest, NextResponse } from "next/server"
import { getAllCoinsFromBunny } from "@/actions/fetch-all-coins-from-bunny"
import { getHealthScore } from "@/utils/beat-calculator"
import { streamText } from "ai"
import { groq } from "@ai-sdk/groq"

export const runtime = "edge"

export async function POST(req: NextRequest) {
  try {
    const { user, input, chatHistory } = await req.json()
    if (!user || !user.id) {
      return new Response(JSON.stringify({ error: "Missing user" }), { status: 400 })
    }
    
    // Fetch coins from Bunny.net (same source as market analysis)
    const allCoins = await getAllCoinsFromBunny()
    const topCoins = allCoins
      .filter((coin) => coin.market_cap && coin.price)
      .slice(0, 20)
      .map((coin) => ({
        name: coin.name,
        symbol: coin.symbol,
        price: coin.price,
        change24h: coin.price_change_24h,
        marketCap: coin.market_cap,
        volume: coin.volume_24h,
        beatScore: getHealthScore(coin),
        githubStars: coin.github_stars,
        twitterFollowers: coin.twitter_followers,
      }))
    
    // Build conversation context
    const conversationContext = (chatHistory || [])
      .slice(-6)
      .map((msg: any) => `${msg.role}: ${msg.content}`)
      .join("\n")
      
    const systemPrompt = `You are CocoriAI, a cryptocurrency market analyst for the CocoriCoin platform. You have access to real-time data from the CocoriCoin database.

CRITICAL RULE: You must ONLY mention coins from the provided list below. NEVER reference any other cryptocurrencies, tokens, or projects that are not explicitly listed.

Current top coins in CocoriCoin database (${topCoins.length} coins from Bunny.net):
${topCoins.map((coin) => `${coin.name} (${coin.symbol}): $${coin.price?.toFixed(4)}, 24h: ${coin.change24h?.toFixed(2)}%, Beat Score: ${coin.beatScore?.toFixed(1)}/100, Market Cap: $${(coin.marketCap || 0).toLocaleString()}`).join("\n")}

Previous conversation:
${conversationContext}

STRICT RULES (do not break these):
- You MUST ONLY mention coins from the provided list above.
- If the user asks about a coin not in the list, say: 'Sorry, [coin] is not available in the CocoriCoin database.'
- Never invent or reference coins not in the list.
- Keep responses under 100 words.
- Provide actionable insights, not generic advice.
- Use the Beat Score (community engagement + development activity) and consistency score in your analysis.
- Always end by offering to answer follow-up questions.
- Incorporate key technical indicators if you think it is useful:
  • Moving Averages (e.g., 50/200 SMA crossovers for trend direction).  
  • RSI (highlight overbought/oversold levels at 70/30).  
  • MACD (note bullish/bearish crossovers and divergence).  
  • Bollinger Bands (spot squeezes and breakouts).
- Be conversational but professional.
- Remember: You have access to ${topCoins.length} coins from the Bunny.net database. Use ONLY these coins.`

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