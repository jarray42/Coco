"use client"

import { useState } from "react"
import {
  analyzePortfolioWithQuota,
  chatWithPortfolioBotWithQuota,
  getDetailedPortfolioAnalysisWithQuota,
} from "../actions/ai-portfolio-advisor-with-quota"
import type { AuthUser } from "../utils/supabase-auth"
import { getUserQuota } from "../utils/quota-manager"

interface QuotaError {
  needUpgrade: true
  quota: {
    tokens_used: number
    token_balance: number
    billing_plan: string
  }
}

export function useAIWithQuota(user: AuthUser | null) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [quotaInfo, setQuotaInfo] = useState<any>(null)

  const handleQuotaError = (error: QuotaError) => {
    setQuotaInfo(error.quota)
    setShowUpgradeModal(true)
  }

  const analyzePortfolio = async () => {
    if (!user) throw new Error("User not authenticated")

    const result = await analyzePortfolioWithQuota(user)

    if ("needUpgrade" in result) {
      handleQuotaError(result)
      return null
    }

    return result
  }

  const getDetailedAnalysis = async () => {
    if (!user) throw new Error("User not authenticated")

    const result = await getDetailedPortfolioAnalysisWithQuota(user)

    if ("needUpgrade" in result) {
      handleQuotaError(result)
      return null
    }

    return result
  }

  const chatWithBot = async (message: string, history: any[]) => {
    if (!user) throw new Error("User not authenticated")

    const result = await chatWithPortfolioBotWithQuota(user, message, history)

    if ("needUpgrade" in result) {
      handleQuotaError(result)
      return null
    }

    // After a successful chat, fetch the latest quota
    const updatedQuota = await getUserQuota(user)
    setQuotaInfo(updatedQuota)

    return result
  }

  const closeUpgradeModal = () => {
    setShowUpgradeModal(false)
    setQuotaInfo(null)
  }

  const handleUpgradeSuccess = () => {
    setShowUpgradeModal(false)
    setQuotaInfo(null)
    // Optionally refresh quota info or retry last request
  }

  return {
    analyzePortfolio,
    getDetailedAnalysis,
    chatWithBot,
    showUpgradeModal,
    quotaInfo,
    closeUpgradeModal,
    handleUpgradeSuccess,
  }
}
