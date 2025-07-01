"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Zap, Crown, AlertTriangle } from "lucide-react"
import { getUserQuota } from "../utils/quota-manager"
import type { AuthUser } from "../utils/supabase-auth"
import type { UserQuota } from "../utils/quota-manager"

interface QuotaUsageDisplayProps {
  user: AuthUser
  isDarkMode: boolean
  refreshKey?: number // Add this to trigger refresh
}

export function QuotaUsageDisplay({ user, isDarkMode, refreshKey }: QuotaUsageDisplayProps) {
  const [quota, setQuota] = useState<UserQuota | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadQuota()
  }, [user, refreshKey]) // Add refreshKey to dependencies

  const loadQuota = async () => {
    try {
      const userQuota = await getUserQuota(user)
      setQuota(userQuota)
    } catch (error) {
      console.error("Error loading quota:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className={`animate-pulse h-16 rounded-xl ${isDarkMode ? "bg-slate-800/50" : "bg-white/60"}`} />
  }
  if (!quota) {
    return <div className={`p-4 rounded-xl text-red-500 bg-red-50 border border-red-200 font-semibold`}>Error loading quota. Please refresh or contact support.</div>
  }

  const isFree = quota.billing_plan === "free"
  const totalAvailable = quota.monthly_limit
  const usagePercentage = totalAvailable > 0 ? (quota.tokens_used / totalAvailable) * 100 : 0
  const remaining = Math.max(0, totalAvailable - quota.tokens_used)

  const getStatusColor = () => {
    if (usagePercentage >= 90) return "text-red-500"
    if (usagePercentage >= 70) return "text-yellow-500"
    return "text-green-500"
  }

  const getProgressColor = () => {
    if (usagePercentage >= 90) return "bg-red-500"
    if (usagePercentage >= 70) return "bg-yellow-500"
    return "bg-green-500"
  }

  return (
    <div
      className={`p-4 rounded-xl ${
        isDarkMode ? "bg-slate-800/50 border-slate-700/30" : "bg-white/80 border-slate-200/50"
      } backdrop-blur-md shadow-lg border`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isFree ? (
            <Zap className={`w-5 h-5 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
          ) : (
            <Crown className={`w-5 h-5 ${isDarkMode ? "text-yellow-400" : "text-yellow-600"}`} />
          )}
          <span className={`font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
            {isFree ? "Free Plan" : "Pro Plan"}
          </span>
        </div>

        <Badge
          variant={usagePercentage >= 90 ? "destructive" : usagePercentage >= 70 ? "default" : "secondary"}
          className="font-semibold"
        >
          {remaining} left
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
            AI Requests Used: {quota.tokens_used} / {totalAvailable}
          </span>
          <span className={`font-semibold ${getStatusColor()}`}>{usagePercentage.toFixed(0)}%</span>
        </div>

        <Progress
          value={usagePercentage}
          className={`h-2 ${isDarkMode ? "bg-slate-700" : "bg-slate-200"} ${getProgressColor()}`}
        />

        {usagePercentage >= 90 && (
          <div className="flex items-center gap-2 mt-2 text-sm text-red-500">
            <AlertTriangle className="w-4 h-4" />
            <span>Quota almost exhausted! Consider upgrading.</span>
          </div>
        )}
      </div>
    </div>
  )
}
