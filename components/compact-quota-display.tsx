"use client"

import { useState, useEffect } from "react"
import { getUserQuota } from "../utils/quota-manager"
import type { AuthUser } from "../utils/supabase-auth"

interface CompactQuotaDisplayProps {
  user: AuthUser
  isDarkMode: boolean
  refreshKey: number
}

export function CompactQuotaDisplay({ user, isDarkMode, refreshKey }: CompactQuotaDisplayProps) {
  const [quota, setQuota] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchQuota = async () => {
      try {
        const quotaData = await getUserQuota(user)
        setQuota(quotaData)
      } catch (error) {
        console.error("Error fetching quota:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchQuota()
  }, [user, refreshKey])

  if (loading || !quota) {
    return (
      <div
        className={`px-3 py-1.5 rounded-lg text-xs ${
          isDarkMode ? "bg-slate-700/50 text-slate-400" : "bg-slate-100 text-slate-600"
        }`}
      >
        Loading...
      </div>
    )
  }

  const monthlyLimit = quota.monthly_limit
  const remaining = Math.max(0, monthlyLimit - (quota.tokens_used || 0))
  const percentage = ((quota.tokens_used || 0) / monthlyLimit) * 100

  const getStatusColor = () => {
    if (percentage >= 90) return isDarkMode ? "text-red-400" : "text-red-600"
    if (percentage >= 70) return isDarkMode ? "text-yellow-400" : "text-yellow-600"
    return isDarkMode ? "text-green-400" : "text-green-600"
  }

  return (
    <div
      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
        isDarkMode ? "bg-slate-700/50 border border-slate-600/30" : "bg-slate-100 border border-slate-200"
      }`}
    >
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${getStatusColor().replace("text-", "bg-")}`}></div>
        <span className={getStatusColor()}>
          {remaining}/{monthlyLimit} left
        </span>
        <span className={isDarkMode ? "text-slate-500" : "text-slate-400"}>({quota.billing_plan})</span>
      </div>
    </div>
  )
}
