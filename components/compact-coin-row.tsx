"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ClickableSocialLink } from "./clickable-social-link"
import { ElegantTooltip } from "./elegant-tooltip"
import { ElegantPixelatedHeart } from "./elegant-pixelated-heart"
import { CuteHeartTooltip } from "./cute-heart-tooltip"
import { ConsistencyScoreDisplay } from "./consistency-score-display"
import { PortfolioWalletIcon } from "./portfolio-wallet-icon"
import { formatPrice, formatNumber } from "../utils/beat-calculator"
import type { CryptoData } from "../utils/beat-calculator"

import type { AuthUser } from "../utils/supabase-auth"
import {
  Star,
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  X,
  Bell,
  Activity,
  Minus,
  Plus,
  Shield,
  Info,
} from "lucide-react"
import { ElasticSlider } from "./elastic-slider"

interface CompactCoinRowProps {
  data: CryptoData
  index: number
  isDarkMode: boolean
  beatScore: number
  consistencyScore?: number
  consistencyDetails?: any
  user?: AuthUser | null
  expandedAlert?: boolean
  onExpandAlert?: () => void
  expandedNotification?: boolean
  onExpandNotification?: () => void
  // Batch-loaded user data for better performance
  inPortfolio?: boolean | undefined
  hasAlerts?: boolean | undefined
  hasStaked?: boolean | undefined
  batchVerifiedAlerts?: string[] | undefined
}

export function CompactCoinRow({
  data,
  index,
  isDarkMode,
  beatScore,
  consistencyScore,
  consistencyDetails,
  user,
  expandedAlert,
  onExpandAlert,
  expandedNotification,
  onExpandNotification,
  inPortfolio = false,
  hasAlerts = false,
  hasStaked = false,
  batchVerifiedAlerts = [],
}: CompactCoinRowProps) {
  const priceChange = data.price_change_24h || 0

  const bgClass = isDarkMode
    ? index % 2 === 0
      ? "hover:bg-yellow-500/5 bg-slate-900/20"
      : "hover:bg-yellow-500/8 bg-slate-900/30"
    : index % 2 === 0
      ? "hover:bg-yellow-200/20 bg-white/50"
      : "hover:bg-yellow-100/30 bg-sky-50/30"

  const textClass = isDarkMode ? "text-slate-100" : "text-slate-900"
  const mutedTextClass = isDarkMode ? "text-slate-400" : "text-slate-600"

  // Alert form state
  const [alertType, setAlertType] = useState<string>("migration")
  const [proofLink, setProofLink] = useState("")
  const [poolStatus, setPoolStatus] = useState<{ totalEggs: number; poolFilled: boolean; alerts: any[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [alreadyAlerted, setAlreadyAlerted] = useState(false)
  const [verifiedAlerts, setVerifiedAlerts] = useState<string[]>([])

  // Notification setup state
  const [notificationLoading, setNotificationLoading] = useState(false)
  const [notificationError, setNotificationError] = useState<string | React.ReactNode | null>(null)
  const [notificationSuccess, setNotificationSuccess] = useState<string | null>(null)
  const [healthThreshold, setHealthThreshold] = useState(30)
  const [consistencyThreshold, setConsistencyThreshold] = useState(25)
  const [priceDropThreshold, setPriceDropThreshold] = useState(20)
  const [enableMigrationAlerts, setEnableMigrationAlerts] = useState(true)
  // Use batch-loaded data instead of individual API calls
  const [hasActiveAlerts, setHasActiveAlerts] = useState(hasAlerts || false)
  const [hasUserStaked, setHasUserStaked] = useState(hasStaked || false)
  // Navigation loading state - REMOVED since we're making navigation immediate

  // Add state for closed status by alert type
  const [closedStatusByType, setClosedStatusByType] = useState<
    Record<string, { closed: boolean; reason: string | null }>
  >({})

  // Add removeAlarmsLoading and removeAlarmsError state
  const [removeAlarmsLoading, setRemoveAlarmsLoading] = useState(false)
  const [removeAlarmsError, setRemoveAlarmsError] = useState<string | null>(null)

  // Pool size for testing
  const POOL_SIZE = 6

  // Update hasActiveAlerts when batch data changes
  useEffect(() => {
    if (hasAlerts !== undefined) {
      setHasActiveAlerts(hasAlerts)
    }
  }, [hasAlerts])

  // Update hasUserStaked when batch data changes
  useEffect(() => {
    if (hasStaked !== undefined) {
      setHasUserStaked(hasStaked)
    }
  }, [hasStaked])

  // Update verifiedAlerts when batch data changes
  useEffect(() => {
    if (batchVerifiedAlerts && batchVerifiedAlerts.length > 0) {
      setVerifiedAlerts(batchVerifiedAlerts)
    }
  }, [batchVerifiedAlerts])

  // Fetch pool status when expanded or alertType changes
  useEffect(() => {
    if (expandedAlert) {
      setLoading(true)
      setError(null)
      setSuccess(null)
      fetch(`/api/coin-alerts?coin_id=${data.coingecko_id}&alert_type=${alertType}&ts=${Date.now()}`,
        { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } }
      )
        .then((res) => res.json())
        .then((res) => {
          setPoolStatus(res)
          // Only update hasUserStaked if we don't already have batch data
          // This prevents overwriting the batch-loaded state unnecessarily
          if (hasStaked === undefined) {
            const userHasStaked = !!res.alerts.find((a: any) => a.user_id === user?.id)
            setHasUserStaked(userHasStaked)
          }
        })
        .catch(() => setError("Failed to load pool status"))
        .finally(() => setLoading(false))
    }
  }, [expandedAlert, alertType, data.coingecko_id, user?.id, hasStaked])

  // Load existing notification settings when expanded
  useEffect(() => {
    if (expandedNotification && user) {
      setNotificationLoading(true)
      setNotificationError(null)
      fetch(`/api/user-alerts?coin_id=${data.coingecko_id}`, {
        headers: { Authorization: `Bearer ${user.id}` },
      })
        .then((res) => res.json())
        .then((alerts) => {
          // Set existing thresholds if any
          alerts.forEach((alert: any) => {
            if (alert.alert_type === "health_score") setHealthThreshold(alert.threshold_value)
            if (alert.alert_type === "consistency_score") setConsistencyThreshold(alert.threshold_value)
            if (alert.alert_type === "price_drop") setPriceDropThreshold(alert.threshold_value)
            if (alert.alert_type === "migration") setEnableMigrationAlerts(alert.is_active)
          })
          setHasActiveAlerts(alerts.some((a: any) => a.is_active))
        })
        .catch(() => setNotificationError("Failed to load alert settings"))
        .finally(() => setNotificationLoading(false))
    }
  }, [expandedNotification, data.coingecko_id, user])

  // Reset form when closed
  useEffect(() => {
    if (!expandedAlert) {
      setAlertType("migration")
      setProofLink("")
      setError(null)
      setSuccess(null)
      setPoolStatus(null)
      // Don't reset hasUserStaked here as it should persist
    }
  }, [expandedAlert])

  // Reset notification form when closed
  useEffect(() => {
    if (!expandedNotification) {
      setNotificationError(null)
      setNotificationSuccess(null)
    }
  }, [expandedNotification])

  // Use batch-loaded verified alerts data instead of individual API calls

  // Function to refresh pool status (returns fresh data to avoid stale state reads)
  const refreshPoolStatus = async () => {
    try {
      const res = await fetch(`/api/coin-alerts?coin_id=${data.coingecko_id}&alert_type=${alertType}&ts=${Date.now()}`,
        { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } }
      )
      const result = await res.json()
      setPoolStatus(result)
      // Determine stake only from pending alerts so it matches totalEggs and progress
      const userHasPendingStake = !!(result.alerts || []).find((a: any) => a.user_id === user?.id && a.status === 'pending')
      setHasUserStaked(userHasPendingStake)
      return { result, userHasPendingStake }
    } catch (error) {
      console.error("Failed to refresh pool status:", error)
      return { result: null, userHasPendingStake: hasUserStaked }
    }
  }

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch("/api/coin-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user?.id,
          coin_id: data.coingecko_id,
          alert_type: alertType,
          proof_link: proofLink,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Failed to submit alert")
      
      // Handle both creation and update cases
      if (result.created) {
        setSuccess("Alert submitted! Thank you for contributing.")
      } else if (result.updated) {
        setSuccess("Alert updated successfully!")
      } else {
        setSuccess("Alert processed successfully!")
      }
      setHasUserStaked(true)

      // Refresh with brief retries to avoid read-after-write lag
      for (let attempt = 0; attempt < 4; attempt++) {
        const { result, userHasPendingStake } = await refreshPoolStatus()
        const eggs = result?.totalEggs ?? 0
        if (eggs > 0 || userHasPendingStake) break
        await new Promise((r) => setTimeout(r, 200))
      }

      // Invalidate user data cache to reflect the change
      if (user) {
        const keysToRemove: string[] = []
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i)
          if (key && key.startsWith(`user_data_${user.id}_`)) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach((key) => sessionStorage.removeItem(key))
      }
      setProofLink("")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Submit notification settings
  const handleNotificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setNotificationLoading(true)
    setNotificationError(null)
    setNotificationSuccess(null)

    try {
      const alerts = [
        { alert_type: "health_score", threshold_value: healthThreshold, is_active: true },
        { alert_type: "consistency_score", threshold_value: consistencyThreshold, is_active: true },
        { alert_type: "price_drop", threshold_value: priceDropThreshold, is_active: true },
        { alert_type: "migration", threshold_value: null, is_active: enableMigrationAlerts },
      ]

      for (const alert of alerts) {
        const res = await fetch("/api/user-alerts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user?.id}`,
          },
          body: JSON.stringify({
            coin_id: data.coingecko_id,
            ...alert,
          }),
        })
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || "Failed to save alert settings")
        }
      }

      setNotificationSuccess("Notification settings saved!")
      setHasActiveAlerts(true)

      // Invalidate user data cache to reflect the change
      if (user) {
        const keysToRemove: string[] = []
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i)
          if (key && key.startsWith(`user_data_${user.id}_`)) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach((key) => sessionStorage.removeItem(key))
      }
    } catch (err: any) {
      const errorMessage = err.message
      // Check if it's a limit error and add upgrade link
      if (errorMessage.includes("Maximum number of alerts") && errorMessage.includes("Free plan")) {
        setNotificationError(
          <span>
            Alert limit reached (20/20).
            <a
              href="/plans"
              className="text-purple-500 hover:text-purple-600 underline font-medium ml-1"
              onClick={(e) => {
                e.stopPropagation()
                window.location.href = "/plans"
              }}
            >
              Upgrade to Pro for 200 alerts
            </a>
          </span>,
        )
      } else {
        setNotificationError(errorMessage)
      }
    } finally {
      setNotificationLoading(false)
    }
  }

  // Check for closed status for all alert types when expanded
  useEffect(() => {
    if (expandedAlert) {
      const types = ["migration", "delisting", "rebrand"]
      types.forEach((type) => {
        fetch(`/api/coin-alerts?coin_id=${data.coingecko_id}&alert_type=${type}`)
          .then((res) => res.json())
          .then((res) => {
            const closedAlert = (res.alerts || []).find(
              (a: any) => (a.status === "verified" || a.status === "rejected") && a.archived === false,
            )
            setClosedStatusByType((prev) => ({
              ...prev,
              [type]: closedAlert
                ? {
                    closed: true,
                    reason:
                      closedAlert.status === "verified"
                        ? `The ${type.charAt(0).toUpperCase() + type.slice(1)} pool has been verified and is now closed.`
                        : `The ${type.charAt(0).toUpperCase() + type.slice(1)} pool was rejected and is now closed.`,
                  }
                : { closed: false, reason: null },
            }))
          })
          .catch(() => {
            setClosedStatusByType((prev) => ({ ...prev, [type]: { closed: false, reason: null } }))
          })
      })
    }
  }, [expandedAlert, data.coingecko_id])

  const isCurrentTypeClosed = closedStatusByType[alertType]?.closed
  const currentTypeClosedReason = closedStatusByType[alertType]?.reason

  // Add removeAlarms handler
  const handleRemoveAlarms = async () => {
    if (!user) return
    setRemoveAlarmsLoading(true)
    setRemoveAlarmsError(null)
    try {
      const res = await fetch(`/api/user-alerts?coin_id=${data.coingecko_id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${user.id}`,
        },
      })
      if (!res.ok) throw new Error("Failed to remove alerts")
      setHasActiveAlerts(false)
      setNotificationSuccess("All alerts removed!")
      setNotificationError(null)
    } catch (err: any) {
      setRemoveAlarmsError(err.message)
    } finally {
      setRemoveAlarmsLoading(false)
    }
  }

  return (
    <div className="relative">
      <Link
        href={`/coin/${data.coingecko_id}`}
        className={`flex items-center gap-3 px-6 py-3 transition-all duration-300 border-b min-w-max ${
          isDarkMode ? "border-slate-800/50" : "border-sky-100/50"
        } ${bgClass} hover:shadow-md cursor-pointer`}
        prefetch={true}
      >
        {/* Rank */}
        <div className="flex-shrink-0 w-12 flex items-center">
          <span
            className={`text-xs font-semibold ${mutedTextClass} px-2 py-1 rounded-xl transition-all duration-300 ${
              isDarkMode ? "bg-slate-800/60 hover:bg-slate-700/60" : "bg-slate-100/80 hover:bg-slate-200/80"
            }`}
          >
            {data.rank}
          </span>
        </div>

        {/* Coin Info with Logo - NOT clickable (handled by row click) */}
        <div className="flex-shrink-0 w-44 flex items-center gap-3">
          <div className="relative">
            {data.logo_url ? (
              <img
                src={data.logo_url || "/placeholder.svg"}
                alt={`${data.name} logo`}
                className="w-8 h-8 rounded-xl shadow-sm transition-all duration-300"
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).style.display = "none"
                  const next = e.currentTarget.nextElementSibling as HTMLElement | null
                  if (next) next.style.display = "flex"
                }}
              />
            ) : (
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs bg-gradient-to-br from-amber-500 to-orange-500 shadow-sm transition-all duration-300">
                {data.symbol.slice(0, 2)}
              </div>
            )}
            <div className="w-8 h-8 rounded-xl hidden items-center justify-center text-white font-bold text-xs bg-gradient-to-br from-amber-500 to-orange-500 shadow-sm">
              {data.symbol.slice(0, 2)}
            </div>
            {verifiedAlerts.length > 0 && (
              <div className="relative">
                <div className="absolute -top-1 -right-1 z-10">
                  <ElegantTooltip
                    content={
                      <div className="text-center">
                        <div className="text-sm font-semibold text-red-700">Verified Alerts</div>
                        <div className="text-xs mt-1">
                          {[...new Set(verifiedAlerts)].map((type) => (
                            <div key={type}>{type.charAt(0).toUpperCase() + type.slice(1)} alert verified</div>
                          ))}
                        </div>
                      </div>
                    }
                    position="top"
                    isDarkMode={isDarkMode}
                  >
                    <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse cursor-help" />
                  </ElegantTooltip>
                </div>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className={`font-semibold text-sm ${textClass} truncate`} title={data.name}>
              {data.name}
            </div>
            <div className={`text-xs ${mutedTextClass} uppercase font-medium tracking-wider truncate`}>
              {data.symbol}
            </div>
          </div>
        </div>

        {/* Price - NOT clickable (handled by row click) */}
        <div className="flex-shrink-0 w-28 flex items-center">
          <div className="w-full">
            <div className={`font-bold text-sm ${textClass} truncate`}>{formatPrice(data.price)}</div>
            <div
              className={`text-xs flex items-center gap-1 font-semibold px-2 py-0.5 rounded-xl transition-all duration-300 ${
                priceChange >= 0
                  ? isDarkMode
                    ? "text-emerald-300 bg-emerald-900/40"
                    : "text-emerald-700 bg-emerald-100/80"
                  : isDarkMode
                    ? "text-red-300 bg-red-900/40"
                    : "text-red-700 bg-red-100/80"
              }`}
            >
              <TrendingUp className={`w-2.5 h-2.5 ${priceChange < 0 ? "rotate-180" : ""}`} />
              <span className="truncate">{Math.abs(priceChange).toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {/* Market Cap - NOT clickable (handled by row click) */}
        <div className="flex-shrink-0 w-28 flex items-center">
          <div
            className={`text-sm font-semibold ${textClass} truncate w-full`}
            title={`$${formatNumber(data.market_cap)}`}
          >
            {formatNumber(data.market_cap)}
          </div>
        </div>

        {/* Volume - NOT clickable (handled by row click) */}
        <div className="flex-shrink-0 w-28 flex items-center">
          <div
            className={`text-sm font-semibold ${textClass} truncate w-full`}
            title={`$${formatNumber(data.volume_24h)}`}
          >
            {formatNumber(data.volume_24h)}
          </div>
        </div>

        {/* GitHub Stars - NOT clickable to coin page */}
        <div className="flex-shrink-0 w-24 flex items-center" onClick={(e) => e.stopPropagation()}>
          <ClickableSocialLink
            url={(data as any).github_url || null}
            value={data.github_stars ?? null}
            icon={<Star className="w-3 h-3" />}
            label="GitHub Stars"
            isDarkMode={isDarkMode}
            type="github"
          />
        </div>

        {/* Twitter Followers - NOT clickable to coin page */}
        <div className="flex-shrink-0 w-24 flex items-center" onClick={(e) => e.stopPropagation()}>
          <ClickableSocialLink
            url={(data as any).twitter_url || null}
            value={data.twitter_followers ?? null}
            icon={<Users className="w-3 h-3" />}
            label="Twitter Followers"
            isDarkMode={isDarkMode}
            type="twitter"
          />
        </div>

        {/* Health Score - NOT clickable to coin page */}
        <div className="flex-shrink-0 w-32 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <CuteHeartTooltip score={beatScore} isDarkMode={isDarkMode}>
            <ElegantPixelatedHeart score={beatScore} isDarkMode={isDarkMode} size="sm" />
          </CuteHeartTooltip>
        </div>

        {/* Consistency Score - COMPLETELY ISOLATED */}
        <div className="flex-shrink-0 w-32 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          {consistencyScore !== undefined ? (
            <ConsistencyScoreDisplay
              score={consistencyScore}
              details={consistencyDetails}
              isDarkMode={isDarkMode}
              size="sm"
            />
          ) : (
            <div className={`text-xs ${mutedTextClass} animate-pulse`}>Loading...</div>
          )}
        </div>

        {/* Portfolio Wallet Icon - NOT clickable to coin page */}
        {user && (
          <div className="flex-shrink-0 w-16 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <PortfolioWalletIcon
              user={user}
              coinId={data.coingecko_id}
              coinName={data.name}
              coinSymbol={data.symbol}
              isDarkMode={isDarkMode}
              inPortfolio={inPortfolio}
            />
          </div>
        )}

        {/* Bell Icon - Notifications */}
        {user && (
          <div
            className="flex-shrink-0 w-12 flex items-center justify-center ml-2"
            onClick={(e) => e.stopPropagation()}
          >
            {hasAlerts === undefined ? (
              // Show loading state when batch data is not yet available
              <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
            ) : (
              <ElegantTooltip
                content={
                  <div className="text-center">
                    <div className="text-sm font-semibold">Set smart alerts</div>
                  </div>
                }
                position="top"
                isDarkMode={isDarkMode}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    if (onExpandNotification) onExpandNotification()
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                  }}
                  onMouseUp={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                  }}
                  className={`rounded-full p-1 hover:bg-blue-100/60 active:scale-95 transition-all duration-150 ${expandedNotification ? "bg-blue-200/80" : ""}`}
                  aria-label="Open notification setup"
                  tabIndex={0}
                  onFocus={(e) => e.currentTarget.classList.add("ring-2", "ring-blue-400")}
                  onBlur={(e) => e.currentTarget.classList.remove("ring-2", "ring-blue-400")}
                >
                  <span className="sr-only">Open notification setup</span>
                  <img
                    src={hasActiveAlerts ? "/bell2.ico" : "/bell1.ico"}
                    alt={hasActiveAlerts ? "Active alerts" : "Set alerts"}
                    className="w-6 h-6 transition-all duration-300"
                  />
                </button>
              </ElegantTooltip>
            )}
          </div>
        )}

        {/* Whistle Icon - Actions */}
        {user && (
          <div
            className="flex-shrink-0 w-12 flex items-center justify-center ml-2"
            onClick={(e) => e.stopPropagation()}
          >
            <ElegantTooltip
              content={
                <div className="text-center">
                  <div className="text-sm font-semibold">Chicken Watch</div>
                  <div className="text-xs mt-1 opacity-80">Report & earn eggs!</div>
                </div>
              }
              position="top"
              isDarkMode={isDarkMode}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  if (onExpandAlert) onExpandAlert()
                }}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                }}
                onMouseUp={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                }}
                onTouchStart={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                }}
                className={`rounded-full p-1 hover:bg-yellow-100/60 active:scale-95 transition-all duration-150 ${expandedAlert ? "bg-yellow-200/80" : ""}`}
                aria-label="Open alert form"
                tabIndex={0}
                onFocus={(e) => e.currentTarget.classList.add("ring-2", "ring-yellow-400")}
                onBlur={(e) => e.currentTarget.classList.remove("ring-2", "ring-yellow-400")}
              >
                <span className="sr-only">Open alert form</span>
                <img
                  src={hasUserStaked ? "/Mega2.ico" : "/Mega1.ico"}
                  alt={hasUserStaked ? "Alerted" : "Report issue"}
                  className="w-6 h-6 transition-all duration-300"
                  style={{ transform: "scale(1.23)" }}
                />
              </button>
            </ElegantTooltip>
          </div>
        )}
      </Link>

      {/* Expanded Notification Setup Row */}
      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${expandedNotification ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"}`}
        aria-hidden={!Boolean(expandedNotification)}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
        }}
        onMouseDown={(e) => {
          e.stopPropagation()
          e.preventDefault()
        }}
        onMouseUp={(e) => {
          e.stopPropagation()
          e.preventDefault()
        }}
        onTouchStart={(e) => {
          e.stopPropagation()
          e.preventDefault()
        }}
        onTouchEnd={(e) => {
          e.stopPropagation()
          e.preventDefault()
        }}
      >
        {expandedNotification && (
          <div
            className="w-full px-6 pb-6 pt-4 bg-gradient-to-br from-blue-50/90 to-slate-50/90 border-b border-blue-200/50 shadow-lg backdrop-blur-sm animate-fade-in-down rounded-b-xl relative"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}
            onMouseDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}
            onMouseUp={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}
            onTouchStart={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}
            onTouchEnd={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (onExpandNotification) onExpandNotification()
              }}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-blue-200/80 transition-colors"
              title="Close notification setup"
              aria-label="Close notification setup"
            >
              <X className="w-4 h-4 text-blue-700" />
            </button>

            <form
              className="space-y-2 animate-fade-in"
              onSubmit={handleNotificationSubmit}
              onClick={(e) => {
                e.stopPropagation()
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Bell className="w-5 h-5 text-blue-500" />
                <h3 className="text-base font-bold text-blue-900">Smart Alerts for {data.symbol}</h3>
                {hasActiveAlerts && (
                  <div className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">Active</div>
                )}
              </div>

              {/* Single Row of Compact Cards */}
              <div className="flex flex-row gap-3 overflow-x-auto pb-1">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50/80 border border-blue-100 flex-1 min-w-0">
                  <Activity className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <ElasticSlider
                    value={healthThreshold}
                    onChange={setHealthThreshold}
                    min={10}
                    max={90}
                    step={5}
                    label="Health <"
                    leftIcon={<Minus className="w-4 h-4" />}
                    rightIcon={<Plus className="w-4 h-4" />}
                    disabled={notificationLoading}
                    isDarkMode={isDarkMode}
                    className="flex-1"
                  />
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50/80 border border-blue-100 flex-1 min-w-0">
                  <Shield className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <ElasticSlider
                    value={consistencyThreshold}
                    onChange={setConsistencyThreshold}
                    min={10}
                    max={90}
                    step={5}
                    label="Consistency <"
                    leftIcon={<Minus className="w-4 h-4" />}
                    rightIcon={<Plus className="w-4 h-4" />}
                    disabled={notificationLoading}
                    isDarkMode={isDarkMode}
                    className="flex-1"
                  />
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50/80 border border-blue-100 flex-1 min-w-0">
                  <TrendingDown className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  <ElasticSlider
                    value={priceDropThreshold}
                    onChange={setPriceDropThreshold}
                    min={5}
                    max={50}
                    step={5}
                    label="Price drop >"
                    unit="%"
                    leftIcon={<Minus className="w-4 h-4" />}
                    rightIcon={<Plus className="w-4 h-4" />}
                    disabled={notificationLoading}
                    isDarkMode={isDarkMode}
                    className="flex-1"
                  />
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50/80 border border-blue-100 flex-1 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                  <label className="flex items-center gap-2 flex-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enableMigrationAlerts}
                      onChange={(e) => setEnableMigrationAlerts(e.target.checked)}
                      className="w-4 h-4 accent-blue-500 rounded"
                      disabled={notificationLoading}
                    />
                    <span className="text-xs font-medium text-blue-900">Migration & Delisting</span>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-between pt-2 border-t border-blue-100 mt-2">
                <div className="flex items-center gap-2 text-xs text-blue-700">
                  <Info className="w-4 h-4" />
                  <span>Alerts check every 30 minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  {notificationError && <div className="text-red-600 text-xs font-medium">{notificationError}</div>}
                  {notificationSuccess && (
                    <div className="text-green-600 text-xs font-medium">{notificationSuccess}</div>
                  )}
                  {removeAlarmsError && <div className="text-red-600 text-xs font-medium">{removeAlarmsError}</div>}
                  {hasActiveAlerts && (
                    <button
                      type="button"
                      onClick={handleRemoveAlarms}
                      disabled={removeAlarmsLoading}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-semibold shadow mr-2"
                    >
                      {removeAlarmsLoading ? "Removing..." : "Remove Alarms"}
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={notificationLoading}
                    className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-semibold shadow"
                  >
                    {notificationLoading ? "Saving..." : "Save Alerts"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Expanded Alert Row */}
      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${expandedAlert ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"}`}
        aria-hidden={!Boolean(expandedAlert)}
      >
        {expandedAlert && (
          <div className="w-full px-6 pb-6 pt-4 bg-gradient-to-br from-yellow-50/95 via-amber-50/90 to-orange-50/95 dark:from-yellow-900/95 dark:via-amber-900/90 dark:to-orange-900/95 border-b border-yellow-200/60 dark:border-yellow-700/60 shadow-xl backdrop-blur-md animate-fade-in-down rounded-b-xl relative ring-1 ring-yellow-200/50 dark:ring-yellow-700/50">
            {/* Close button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (onExpandAlert) onExpandAlert()
              }}
              className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-slate-100/80 dark:hover:bg-slate-700/80 transition-all duration-200 hover:scale-110 group"
              title="Close alert form"
              aria-label="Close alert form"
            >
              <X className="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors" />
            </button>

            <form className="space-y-2 animate-fade-in" onSubmit={handleSubmit}>
              <div className="flex items-center gap-2 mb-1">
                <img
                  src="/Mega2.ico"
                  alt="Alert"
                  className="w-6 h-6 drop-shadow-sm"
                  style={{ transform: "scale(1.3)" }}
                />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  Community Alert Staking Pool for {data.symbol}
                </h3>
                {hasUserStaked && (
                  <div className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-medium rounded-full border border-emerald-200 dark:border-emerald-700">
                    Staked
                  </div>
                )}
                {verifiedAlerts.includes(alertType) && (
                  <div className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 text-xs font-medium rounded-full border border-violet-200 dark:border-violet-700">
                    Verified ✓
                  </div>
                )}
              </div>

              <div className="flex flex-row gap-3 overflow-x-auto pb-1 items-center">
                {/* Left Section: Alert Type Dropdown */}
                <div className="flex items-center gap-2 p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 min-w-[220px] max-w-[220px] shadow-sm hover:shadow-md transition-all duration-200 hover:bg-white/90 dark:hover:bg-slate-800/90">
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="flex items-center gap-2">
                      <select
                        className="rounded-lg border px-3 py-2 text-xs focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 bg-white/90 dark:bg-slate-700/90 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-600 w-full transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-500"
                        value={alertType}
                        onChange={(e) => setAlertType(e.target.value)}
                        disabled={loading}
                        aria-label="Alert type"
                      >
                        <option value="migration">Migration</option>
                        <option value="delisting">Delisting</option>
                        <option value="rebrand">Rebrand</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* If pool is closed, show closed message */}
                {isCurrentTypeClosed && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-700/60 min-w-0 shadow-sm">
                    <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">Pool Closed</span>
                    <span className="text-xs text-amber-700 dark:text-amber-400">
                      {currentTypeClosedReason || "This alert pool is no longer accepting new stakes."}
                      {currentTypeClosedReason &&
                        currentTypeClosedReason.toLowerCase().includes("verified") &&
                        " It will be open again after the event launch."}
                    </span>
                  </div>
                )}

                {/* If pool is not closed, show the rest of the staking UI */}
                {!isCurrentTypeClosed && (
                  <>
                    {/* Proof Link Input */}
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex-1 min-w-0 shadow-sm hover:shadow-md transition-all duration-200 hover:bg-white/90 dark:hover:bg-slate-800/90">
                      <div className="flex flex-col gap-2 flex-1">
                        <input
                          type="url"
                          className="rounded-lg border px-3 py-2 text-xs flex-1 focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 bg-white/90 dark:bg-slate-700/90 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-600 placeholder-slate-500 dark:placeholder-slate-400 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-500"
                          placeholder="Proof link (tweet, news, etc)"
                          value={proofLink}
                          onChange={(e) => setProofLink(e.target.value)}
                          required
                          disabled={loading || alreadyAlerted}
                          aria-label="Proof link"
                        />
                      </div>
                    </div>
                    {/* Pool Status Card */}
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex-1 min-w-0 shadow-sm hover:shadow-md transition-all duration-200 hover:bg-white/90 dark:hover:bg-slate-800/90">
                      <div className="flex flex-col gap-1 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <span role="img" aria-label="egg" className="text-sm">
                              🥚
                            </span>
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Pool Status</span>
                          </div>
                          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                            {poolStatus
                              ? poolStatus.poolFilled
                                ? "Filled!"
                                : `${poolStatus.totalEggs}/${POOL_SIZE}`
                              : loading
                                ? "Loading..."
                                : "0/6"}
                          </span>
                        </div>
                        {/* Pool Progress Bar */}
                        <div className="w-full bg-slate-200/60 dark:bg-slate-700/60 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-400 to-violet-500 h-2 rounded-full transition-all duration-500 shadow-sm"
                            style={{
                              width: poolStatus ? `${Math.min(100, (poolStatus.totalEggs / POOL_SIZE) * 100)}%` : "0%",
                            }}
                          ></div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                          <span>
                            {poolStatus
                              ? (() => {
                                  const pending = (poolStatus.alerts || []).filter((a: any) => a.status === 'pending')
                                  return `${pending.length} staker${pending.length !== 1 ? 's' : ''}`
                                })()
                              : "No stakers"}
                          </span>
                          {poolStatus && (poolStatus.alerts || []).some((a: any) => a.user_id === user?.id && a.status === 'pending') && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ You: 2🥚</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Right Section: Egg Info & Submit */}
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex-1 min-w-0 shadow-sm hover:shadow-md transition-all duration-200 hover:bg-white/90 dark:hover:bg-slate-800/90">
                      <div className="flex flex-col gap-2 flex-1">
                        {!hasUserStaked && (
                          <div className="flex items-center gap-1 text-xs text-slate-700 dark:text-slate-300">
                            <span role="img" aria-label="egg" className="text-sm">
                              🥚
                            </span>
                            <span className="font-medium">Stake 2 eggs</span>
                            <span className="text-blue-500 dark:text-blue-400">• 2x if verified!</span>
                          </div>
                        )}
                        {/* Only show staking button if current type is not closed */}
                        <button
                          type="submit"
                          disabled={
                            loading ||
                            ((poolStatus?.alerts || []).some((a: any) => a.user_id === user?.id && a.status === 'pending')) ||
                            poolStatus?.poolFilled
                          }
                          className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-xs font-semibold shadow-sm hover:shadow-md flex items-center justify-center gap-1"
                        >
                          {loading ? (
                            "Staking..."
                          ) : poolStatus?.poolFilled ? (
                            <>
                              <span>🔒</span>
                              <span>Pool Filled</span>
                            </>
                          ) : hasUserStaked ? (
                            <>
                              <span>✓</span>
                              <span>Staked</span>
                            </>
                          ) : (
                            <>
                              <span role="img" aria-label="egg">
                                🥚
                              </span>
                              <span>Stake Eggs</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Bottom Info Row: only show if pool is not closed */}
              {!isCurrentTypeClosed && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 dark:border-slate-700/60 mt-2">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <Info className="w-4 h-4" />
                    <span>Pools need 6 eggs to activate • Double rewards when an upcoming event is verified</span>
                    <a
                      href="/faqs"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold transition-colors text-xs shadow-sm border border-slate-200 dark:border-slate-600 underline underline-offset-2 decoration-blue-500 hover:decoration-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500"
                    >
                      More info
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    {error && <div className="text-red-600 text-xs font-medium">{error}</div>}
                    {success && <div className="text-green-600 text-xs font-medium">{success}</div>}
                  </div>
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
