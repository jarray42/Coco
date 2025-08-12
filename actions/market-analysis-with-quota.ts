"use server"

import { checkQuotaLimit, incrementTokenUsage, getTokenEstimate } from "../utils/quota-manager"
import { analyzeMarket, type MarketAnalysisResult } from "./market-analysis"
import type { AuthUser } from "../utils/supabase-auth"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"
import { supabase } from "../utils/supabase"
import { getHealthScore } from "../utils/beat-calculator"

import { getAllCoinsFromBunny } from "./fetch-all-coins-from-bunny"

interface QuotaError {
  needUpgrade: true
  quota: {
    tokens_used: number
    token_balance: number
    billing_plan: string
  }
  message: string
}

export async function analyzeMarketWithQuota(user: AuthUser, detailed = false, model: string = 'auto'): Promise<MarketAnalysisResult | QuotaError> {
  try {
    console.log(`[Market Analysis] Starting analysis for user ${user.id}, detailed: ${detailed}`)

    const tokensNeeded = getTokenEstimate(detailed ? "detailed" : "basic")
    console.log(`[Market Analysis] Tokens needed: ${tokensNeeded}`)

    // Check if user has enough quota
    const quotaCheck = await checkQuotaLimit(user, tokensNeeded)
    console.log(`[Market Analysis] Quota check result:`, {
      canProceed: quotaCheck.canProceed,
      remainingTokens: quotaCheck.remainingTokens,
      quota: quotaCheck.quota ? {
        tokens_used: quotaCheck.quota.tokens_used,
        monthly_limit: quotaCheck.quota.monthly_limit,
        billing_plan: quotaCheck.quota.billing_plan
      } : null
    })

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
    const result = await analyzeMarket(detailed, model)

    console.log("[Market Analysis] Analysis completed, incrementing usage...")

    // Increment usage after successful analysis
    const incrementSuccess = await incrementTokenUsage(user, tokensNeeded)
    if (!incrementSuccess) {
      console.warn("[Market Analysis] Failed to increment token usage")
    }

    console.log("[Market Analysis] Analysis completed successfully")
    return result
  } catch (error) {
    console.error("[analyzeMarketWithQuota ERROR]", error)
    return {
      needUpgrade: true,
      quota: {
        tokens_used: 0,
        token_balance: 0,
        billing_plan: "free",
      },
      message: "Sorry, I'm having trouble accessing the market data right now. Please try again in a moment! 🐓",
    }
  }
}

export async function chatWithMarketBotWithQuota(user: AuthUser, message: string, model: string = 'auto') {
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

    // Fetch real coins data from Bunny.net (includes pre-calculated scores)
    const allCoins = await getAllCoinsFromBunny()
    const coins = allCoins.slice(0, 10) // Get top 10 coins

    const topCoins = coins
      .filter((coin) => coin.market_cap && coin.price)
      .map((coin) => ({
        name: coin.name,
        symbol: coin.symbol,
        price: coin.price,
        change24h: coin.price_change_24h,
        marketCap: coin.market_cap,
        volume: coin.volume_24h,
        beatScore: getHealthScore(coin), // Uses pre-calculated health_score from Bunny
        githubStars: coin.github_stars,
        twitterFollowers: coin.twitter_followers,
      }))

    console.log(`[Market Chat] Fetched ${topCoins.length} coins for analysis`)

    const systemPrompt = `You are CocoriAI, a cryptocurrency market analyst for the CocoriCoin platform. You have access to real-time data from the CocoriCoin database.

CRITICAL RULE: You must ONLY mention coins from the provided list below. NEVER reference any other cryptocurrencies, tokens, or projects that are not explicitly listed.

Current top coins in CocoriCoin database (${topCoins.length} coins from Bunny.net):
${topCoins.map((coin) => `${coin.name} (${coin.symbol}): $${coin.price?.toFixed(4)}, 24h: ${coin.change24h?.toFixed(2)}%, Beat Score: ${coin.beatScore?.toFixed(1)}/100, Market Cap: $${(coin.marketCap || 0).toLocaleString()}`).join("\n")}

STRICT RULES:
- Keep responses under 100 words
- Only discuss coins available in the CocoriCoin database (listed above)
- If the user asks about a coin not in the list, say: "Sorry, [coin] is not available in the CocoriCoin database."
- Never invent or reference coins not in the list
- If the user greets you (e.g., says 'hello', 'hi', 'hey'), respond with a very short friendly greeting and offer to help with crypto questions but keep it short
- Provide actionable insights, not generic advice
- Use the Health Score (community engagement + development activity) and consistency score in your analysis
- Always end by offering to answer follow-up questions
- Incorporate key technical indicators if you think it is useful:
  • Moving Averages (e.g., 50/200 SMA crossovers for trend direction).  
  • RSI (highlight overbought/oversold levels at 70/30).  
  • MACD (note bullish/bearish crossovers and divergence).  
  • Bollinger Bands (spot squeezes and breakouts).
- Be conversational but professional
- Remember: You have access to ${topCoins.length} coins from the Bunny.net database. Use ONLY these coins.`

    console.log("[Market Chat] Generating AI response...")

    // Model selection logic
    let aiModel
    let text
    if (model.startsWith('openrouter-')) {
      // OpenRouter models
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
            { role: 'user', content: message },
          ],
        }),
      })
      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(`OpenRouter API error: ${response.status} ${errorBody}`)
      }
      const data = await response.json()
      text = data.choices?.[0]?.message?.content || 'No response from OpenRouter model.'
    } else {
      // Existing logic for Groq, OpenAI, Anthropic
      if (model === 'auto' || !model) {
        aiModel = groq("llama-3.1-8b-instant")
      } else if (model === 'llama-3.1-8b-instant') {
        aiModel = groq("llama-3.1-8b-instant")
      } else if (model === 'mixtral-8x7b-32768') {
        aiModel = groq("mixtral-8x7b-32768")
      } else if (model === 'gpt-4o-mini') {
        const { openai } = await import("@ai-sdk/openai")
        aiModel = openai("gpt-4o-mini")
      } else if (model === 'claude-3-haiku-20240307') {
        const { anthropic } = await import("@ai-sdk/anthropic")
        aiModel = anthropic("claude-3-haiku-20240307")
      } else {
        aiModel = groq("llama-3.1-8b-instant")
      }
      const result = await generateText({
        model: aiModel,
        system: systemPrompt,
        prompt: message,
        maxTokens: 300,
        temperature: 0.7,
      })
      text = result.text
    }

    console.log("[Market Chat] AI response generated, incrementing usage...")

    const incrementSuccess = await incrementTokenUsage(user, 1)
    if (!incrementSuccess) {
      console.warn("[Market Chat] Failed to increment token usage for user:", user.id)
    }

    console.log("[Market Chat] Chat completed successfully")

    return {
      response: text,
      modelUsed: model,
    }
  } catch (error) {
    console.error("[chatWithMarketBotWithQuota ERROR]", error)
    return {
      response: "Sorry, I'm having trouble accessing the market data right now. Please try again in a moment! 🐓",
      modelUsed: "Error - No model available",
    }
  }
}
