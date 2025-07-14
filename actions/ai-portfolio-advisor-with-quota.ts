"use server"

import { checkQuotaLimit, incrementTokenUsage } from "../utils/quota-manager"
import { analyzePortfolioWithAI, chatWithPortfolioBot, getDetailedPortfolioAnalysis } from "./ai-portfolio-advisor"
import type { AuthUser } from "../utils/supabase-auth"
import { getUserPortfolio } from "../utils/portfolio"
import { fetchCoins } from "../utils/supabase"
import { getHealthScore } from "../utils/beat-calculator"
import { formatPrice } from "../utils/beat-calculator"

interface QuotaError {
  needUpgrade: true
  quota: {
    tokens_used: number
    token_balance: number
    billing_plan: string
  }
}

export async function analyzePortfolioWithQuota(user: AuthUser) {
  try {
    console.log("Checking quota for portfolio analysis...")

    // Check quota first
    const { canProceed, quota } = await checkQuotaLimit(user, 1)

    if (!canProceed || !quota) {
      console.log("Quota limit exceeded or quota not found")
      return {
        needUpgrade: true,
        quota: quota || {
          tokens_used: 0,
          token_balance: 0,
          billing_plan: "free",
        },
      } as QuotaError
    }

    console.log("Quota check passed, making AI request...")

    // Make the AI request
    const result = await analyzePortfolioWithAI(user)

    // Increment usage after successful request
    const incrementSuccess = await incrementTokenUsage(user, 1)
    if (!incrementSuccess) {
      console.warn("Failed to increment token usage for user:", user.id)
    } else {
      console.log("Successfully incremented token usage")
    }

    return result
  } catch (error) {
    console.error("Error in analyzePortfolioWithQuota:", error)
    throw error
  }
}

export async function chatWithPortfolioBotWithQuota(user: AuthUser, message: string, history: any[]) {
  try {
    // Quota enforcement
    const { canProceed, quota } = await checkQuotaLimit(user, 1)
    if (!canProceed || !quota) {
      return {
        needUpgrade: true,
        quota: quota || {
          tokens_used: 0,
          token_balance: 0,
          billing_plan: "free",
        },
      } as QuotaError
    }

    // Fetch user's portfolio and current market data
    const portfolioItems = await getUserPortfolio(user)
    const { coins: allCoins } = await fetchCoins()
    const enrichedPortfolio = portfolioItems.map((item) => {
      const coinData = allCoins.find((coin) => coin.coingecko_id === item.coingecko_id)
      const beatScore = coinData ? getHealthScore(coinData) : 0
      const totalValue = coinData && item.amount ? coinData.price * item.amount : 0
      // Use pre-calculated consistency score from coin data
      const consistencyScore = coinData?.consistency_score || 0
      return {
        name: item.coin_name,
        symbol: item.coin_symbol,
        amount: item.amount,
        value: totalValue,
        healthScore: beatScore,
        consistencyScore,
        priceChange24h: coinData?.price_change_24h || 0,
      }
    })
    const totalValue = enrichedPortfolio.reduce((sum, item) => sum + (item.value || 0), 0)
    // Build the system prompt
    const systemPrompt = `You are a seasoned financial advisor with deep expertise in cryptocurrency and traditional markets.\n\nCurrent user portfolio context:\n- Total Value: ${formatPrice(totalValue)}\n- Holdings: ${enrichedPortfolio.map((coin) => `${coin.name}: ${coin.amount} coins (${formatPrice(coin.value || 0)}), Health: ${coin.healthScore?.toFixed(1)}/100, Consistency: ${coin.consistencyScore?.toFixed(1)}/100, 24h: ${coin.priceChange24h?.toFixed(2)}%`).join(", ")}\n\nRules:\n- If the user greets you (e.g., says 'hello', 'hi', 'hey'), respond with a very short friendly greeting and offer to help with their portfolio or crypto questions but keep it short.\n- Only give portfolio or market advice if the user's message is a question or request about their portfolio or the market.\n- Maximum 100 words per response\n- Short answer are best\n- Give actionable, non-obvious advice, when asked for\n- Use specific numbers from their actual portfolio\n- No generic crypto advice\n- Do not mention supabase, or anything related to how the webapp is built. no useless information\n- Always end with follow-up offer\n- Use clear, confident language, but avoid jargon without explanation.  \n- When appropriate, Give Performance Analysis (Sharpe ratio)\n- When appropriate, Quote percentages, USD values, and time frames precisely.  \n- When appropriate, cite market context or trends ("Given BTC's 12% rally last month...").\n- If the user's request is ambiguous, ask follow-up questions ("Would you like a tax-optimized rebalance?").\n- Answer only based on the user prompts\n- **When appropriate, consider and reference the Consistency Score in your analysis and advice.**\n- If a coin has a low Consistency Score (below 30), flag it as a risk and explain briefly why.\n- Compare Consistency Scores between holdings and suggest actions to improve overall portfolio consistency.\n- Explain how Consistency Score impacts long-term reliability, risk, and potential returns.\n- If a coin has both low Health and low Consistency, prioritize it for review or rebalancing.`
    const safeHistory = (history || []).map((msg: any) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content,
    }))
    const messages = [
      { role: "system", content: systemPrompt },
      ...safeHistory,
      { role: "user", content: message },
    ]
    // Use your preferred model (Groq, OpenAI, etc.)
    const model = process.env.GROQ_API_KEY ? require("@ai-sdk/groq").groq("llama-3.1-8b-instant") : require("@ai-sdk/openai").openai("gpt-4o-mini")
    const { text } = await require("ai").generateText({ model, messages })
    // Increment usage after successful response
    await incrementTokenUsage(user, 1)
    return {
      response: text,
      modelUsed: process.env.GROQ_API_KEY ? "Groq Llama 3.1 8B" : "OpenAI GPT-4o Mini",
    }
  } catch (error) {
    console.error("Error in chatWithPortfolioBotWithQuota:", error)
    return {
      response: "Sorry, I'm having trouble right now. Please try again! 🐓",
      modelUsed: "Error - No model available",
    }
  }
}

export async function getDetailedPortfolioAnalysisWithQuota(user: AuthUser) {
  try {
    console.log("Checking quota for detailed portfolio analysis...")

    // Check quota first
    const { canProceed, quota } = await checkQuotaLimit(user, 1)

    if (!canProceed || !quota) {
      console.log("Quota limit exceeded or quota not found")
      return {
        needUpgrade: true,
        quota: quota || {
          tokens_used: 0,
          token_balance: 0,
          billing_plan: "free",
        },
      } as QuotaError
    }

    console.log("Quota check passed, making detailed AI request...")

    // Make the AI request
    const result = await getDetailedPortfolioAnalysis(user)

    // Increment usage after successful request
    const incrementSuccess = await incrementTokenUsage(user, 1)
    if (!incrementSuccess) {
      console.warn("Failed to increment token usage for user:", user.id)
    } else {
      console.log("Successfully incremented token usage")
    }

    return result
  } catch (error) {
    console.error("Error in getDetailedPortfolioAnalysisWithQuota:", error)
    throw error
  }
}
