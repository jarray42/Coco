"use client"

import { useState, useEffect } from "react"
import { Bell, AlertTriangle, Crown } from "lucide-react"
import { getUserQuota, type UserQuota } from "@/utils/quota-manager"
import type { AuthUser } from "@/utils/supabase-auth"
import { supabase } from "@/utils/supabase"

interface SmartAlertsUsageDisplayProps {
  user: AuthUser
  isDarkMode: boolean
  refreshKey?: number
}

export function SmartAlertsUsageDisplay({ user, isDarkMode, refreshKey }: SmartAlertsUsageDisplayProps) {
  const [quota, setQuota] = useState<UserQuota | null>(null)
  const [alertsCount, setAlertsCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [user, refreshKey])

  const loadData = async () => {
    try {
      // Load quota and current alerts count
      const [userQuota, alertsResponse] = await Promise.all([
        getUserQuota(user),
        supabase
          .from('user_alerts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
      ])

      setQuota(userQuota)
      setAlertsCount(alertsResponse.count || 0)
    } catch (error) {
      console.error("Error loading smart alerts data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={`animate-pulse h-20 rounded-xl ${isDarkMode ? "bg-slate-800/50" : "bg-white/60"}`} />
    )
  }

  if (!quota) {
    return (
      <div className={`p-4 rounded-xl text-red-500 bg-red-50 border border-red-200 font-semibold`}>
        Error loading alerts data. Please refresh or contact support.
      </div>
    )
  }

  const smartAlertsLimit = quota.smart_alerts_limit || 20
  const remaining = Math.max(0, smartAlertsLimit - alertsCount)
  const usagePercentage = smartAlertsLimit > 0 ? (alertsCount / smartAlertsLimit) * 100 : 0
  const isPro = quota.billing_plan === 'pro'

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
      className={`p-4 rounded-xl border transition-all duration-300 ${
        isDarkMode
          ? "bg-slate-800/60 border-slate-700/50 backdrop-blur-md"
          : "bg-white/70 border-white/40 backdrop-blur-md"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell className={`w-5 h-5 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`} />
          <h3 className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            Smart Alerts Usage
          </h3>
          {isPro && (
            <Crown className="w-4 h-4 text-yellow-500" />
          )}
        </div>
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {alertsCount}/{smartAlertsLimit}
        </span>
      </div>

      {/* Progress Bar */}
      <div className={`w-full h-2 rounded-full mb-3 ${isDarkMode ? "bg-slate-700" : "bg-gray-200"}`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ${getProgressColor()}`}
          style={{ width: `${Math.min(usagePercentage, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className={`${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>
          {remaining} alerts remaining
        </span>
        <span className={`font-medium ${isPro ? "text-purple-400" : "text-blue-400"}`}>
          {isPro ? "Pro Plan" : "Free Plan"}
        </span>
      </div>

      {/* Warning when approaching limit */}
      {usagePercentage >= 80 && !isPro && (
        <div className={`mt-3 p-3 rounded-lg flex items-start gap-2 ${
          isDarkMode ? "bg-yellow-900/50 border border-yellow-700/50" : "bg-yellow-50 border border-yellow-200"
        }`}>
          <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs">
            <p className={`font-medium ${isDarkMode ? "text-yellow-300" : "text-yellow-700"}`}>
              Approaching limit!
            </p>
            <p className={`${isDarkMode ? "text-yellow-400" : "text-yellow-600"}`}>
              Upgrade to Pro for 200 smart alerts instead of {smartAlertsLimit}.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
