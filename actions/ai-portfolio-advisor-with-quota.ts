"use server"

import { checkQuotaLimit, incrementTokenUsage } from "../utils/quota-manager"
import { analyzePortfolioWithAI, chatWithPortfolioBot, getDetailedPortfolioAnalysis } from "./ai-portfolio-advisor"
import type { AuthUser } from "../utils/supabase-auth"

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
    console.log("Checking quota for portfolio chat...")

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

    console.log("Quota check passed, making AI chat request...")

    // Make the AI request
    const result = await chatWithPortfolioBot(user, message, history)

    // Increment usage after successful request
    const incrementSuccess = await incrementTokenUsage(user, 1)
    if (!incrementSuccess) {
      console.warn("Failed to increment token usage for user:", user.id)
    } else {
      console.log("Successfully incremented token usage")
    }

    return result
  } catch (error) {
    console.error("Error in chatWithPortfolioBotWithQuota:", error)
    throw error
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
