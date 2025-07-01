"use server"

import { checkQuotaLimit, incrementTokenUsage, getTokenEstimate } from "../utils/quota-manager"
import { analyzeMarket, type MarketAnalysisResult } from "./market-analysis"
import type { AuthUser } from "../utils/supabase-auth"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"
import { supabase } from "../utils/supabase"
import { calculateBeatScore } from "../utils/beat-calculator"

interface QuotaError {
  needUpgrade: true
  quota: {
    tokens_used: number
    token_balance: number
    billing_plan: string
  }
  message: string
}

export async function analyzeMarketWithQuota(user: AuthUser, detailed = false): Promise<MarketAnalysisResult | QuotaError> {
  try {
    console.log(`[Market Analysis] Starting analysis for user ${user.id}, detailed: ${detailed}`)

    const tokensNeeded = getTokenEstimate(detailed ? "detailed" : "basic")
    console.log(`[Market Analysis] Tokens needed: ${tokensNeeded}`)

    // Check if user has enough quota
    const quotaCheck = await checkQuotaLimit(user, tokensNeeded)

    if (!quotaCheck.canProceed || !quotaCheck.quota) {
      console.log("[Market Analysis] Quota limit exceeded")
      return {
        needUpgrade: true,
        quota: quotaCheck.quota
          ? {
              tokens_used: quotaCheck.quota.tokens_used,
              token_balance: quotaCheck.remainingTokens,
              billing_plan: quotaCheck.quota.billing_plan,
            }
          : {
              tokens_used: 0,
              token_balance: 0,
              billing_plan: "free",
            },
        message: "You've reached your monthly AI analysis limit. Upgrade to continue.",
      }
    }

    console.log("[Market Analysis] Quota check passed, performing analysis...")

    // Perform the analysis
    const result = await analyzeMarket(detailed)

    console.log("[Market Analysis] Analysis completed, incrementing usage...")

    // Increment usage after successful analysis
    const incrementSuccess = await incrementTokenUsage(user, tokensNeeded)
    if (!incrementSuccess) {
      console.warn("[Market Analysis] Failed to increment token usage")
    }

    console.log("[Market Analysis] Analysis completed successfully")
    return result
  } catch (error) {
    console.error("[Market Analysis] Error in analyzeMarketWithQuota:", error)
    throw error
  }
}

export async function chatWithMarketBotWithQuota(user: AuthUser, message: string) {
  try {
    console.log("[Market Chat] Starting chat for user:", user.id)

    const quotaCheck = await checkQuotaLimit(user, 1)

    if (!quotaCheck.canProceed || !quotaCheck.quota) {
      console.log("[Market Chat] Quota limit exceeded")
      return {
        needUpgrade: true,
        quota: quotaCheck.quota
          ? {
              tokens_used: quotaCheck.quota.tokens_used,
              token_balance: quotaCheck.remainingTokens,
              billing_plan: quotaCheck.quota.billing_plan,
            }
          : {
              tokens_used: 0,
              token_balance: 0,
              billing_plan: "free",
            },
        message: "You've reached your daily AI chat limit. Upgrade to continue.",
      } as QuotaError
    }

    console.log("[Market Chat] Quota check passed, fetching market data...")

    // Fetch real coins data from the database
    const { data: coins, error } = await supabase
      .from("coins")
      .select("*")
      .order("market_cap", { ascending: false })
      .limit(10)

    if (error) {
      console.error("[Market Chat] Database error:", error)
      throw new Error(`Database error: ${error.message}`)
    }

    const topCoins = coins
      .filter((coin) => coin.market_cap && coin.price)
      .map((coin) => ({
        name: coin.name,
        symbol: coin.symbol,
        price: coin.price,
        change24h: coin.price_change_24h,
        marketCap: coin.market_cap,
        volume: coin.volume_24h,
        beatScore: calculateBeatScore(coin),
        githubStars: coin.github_stars,
        twitterFollowers: coin.twitter_followers,
      }))

    console.log(`[Market Chat] Fetched ${topCoins.length} coins for analysis`)

    const systemPrompt = `You are CocoriAI, a cryptocurrency market analyst for the CocoriCoin platform. You have access to real-time data from the CocoriCoin database.

Current top coins in CocoriCoin database:
${topCoins.map((coin) => `${coin.name} (${coin.symbol}): $${coin.price?.toFixed(4)}, 24h: ${coin.change24h?.toFixed(2)}%, Beat Score: ${coin.beatScore?.toFixed(1)}/100, Market Cap: $${(coin.marketCap || 0).toLocaleString()}`).join("\n")}

Rules:
- Keep responses under 150 words
- Only discuss coins available in the CocoriCoin database
- Provide actionable insights, not generic advice
- Use the Beat Score (community engagement + development activity) in your analysis
- Always end by offering to answer follow-up questions
- Be conversational but professional`

    console.log("[Market Chat] Generating AI response...")

    const { text } = await generateText({
      model: groq("llama-3.1-8b-instant"),
      system: systemPrompt,
      prompt: message,
      maxTokens: 300,
      temperature: 0.7,
    })

    console.log("[Market Chat] AI response generated, incrementing usage...")

    const incrementSuccess = await incrementTokenUsage(user, 1)
    if (!incrementSuccess) {
      console.warn("[Market Chat] Failed to increment token usage for user:", user.id)
    }

    console.log("[Market Chat] Chat completed successfully")

    return {
      response: text,
      modelUsed: "Groq Llama 3.1 8B",
    }
  } catch (error) {
    console.error("[Market Chat] Error in chatWithMarketBotWithQuota:", error)
    return {
      response: "Sorry, I'm having trouble accessing the market data right now. Please try again in a moment! 🐓",
      modelUsed: "Error - No model available",
    }
  }
}
