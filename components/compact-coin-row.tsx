"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { OptimizedCoinLink } from "./optimized-coin-link"
import { ClickableSocialLink } from "./clickable-social-link"
import { ElegantTooltip } from "./elegant-tooltip"
import { ElegantPixelatedHeart } from "./elegant-pixelated-heart"
import { CuteHeartTooltip } from "./cute-heart-tooltip"
import { ConsistencyScoreDisplay } from "./consistency-score-display"
import { PortfolioWalletIcon } from "./portfolio-wallet-icon"
import { formatPrice, formatNumber } from "../utils/beat-calculator"
import type { CryptoData } from "../utils/beat-calculator"

import type { AuthUser } from "../utils/supabase-auth"
import { Star, Users, TrendingUp, TrendingDown, AlertTriangle, Megaphone, X, Bell, Activity, Minus, Plus, Shield, Info } from "lucide-react"
import { ElasticSlider } from "./elastic-slider"
import { prefetchCoinDetails } from "../actions/fetch-coin-details"

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
  const [notificationError, setNotificationError] = useState<string | null>(null)
  const [notificationSuccess, setNotificationSuccess] = useState<string | null>(null)
  const [healthThreshold, setHealthThreshold] = useState(30)
  const [consistencyThreshold, setConsistencyThreshold] = useState(25)
  const [priceDropThreshold, setPriceDropThreshold] = useState(20)
  const [enableMigrationAlerts, setEnableMigrationAlerts] = useState(true)
  // Use batch-loaded data instead of individual API calls
  const [hasActiveAlerts, setHasActiveAlerts] = useState(hasAlerts || false)
  const [hasUserStaked, setHasUserStaked] = useState(hasStaked || false)
  // Navigation loading state - REMOVED since we're making navigation immediate

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
      fetch(`/api/coin-alerts?coin_id=${data.coingecko_id}&alert_type=${alertType}`)
        .then((res) => res.json())
        .then((res) => {
          setPoolStatus(res)
          // Update hasUserStaked based on pool status
          const userHasStaked = !!res.alerts.find((a: any) => a.user_id === user?.id)
          if (userHasStaked !== hasUserStaked) {
            setHasUserStaked(userHasStaked)
          }
        })
        .catch(() => setError("Failed to load pool status"))
        .finally(() => setLoading(false))
    }
  }, [expandedAlert, alertType, data.coingecko_id, user?.id])

  // Load existing notification settings when expanded
  useEffect(() => {
    if (expandedNotification && user) {
      setNotificationLoading(true)
      setNotificationError(null)
      fetch(`/api/user-alerts?coin_id=${data.coingecko_id}`, {
        headers: { 'Authorization': `Bearer ${user.id}` }
      })
        .then(res => res.json())
        .then(alerts => {
          // Set existing thresholds if any
          alerts.forEach((alert: any) => {
            if (alert.alert_type === 'health_score') setHealthThreshold(alert.threshold_value)
            if (alert.alert_type === 'consistency_score') setConsistencyThreshold(alert.threshold_value)
            if (alert.alert_type === 'price_drop') setPriceDropThreshold(alert.threshold_value)
            if (alert.alert_type === 'migration') setEnableMigrationAlerts(alert.is_active)
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
      setSuccess("Alert submitted! Thank you for contributing.")
      setHasUserStaked(true)
      // Invalidate user data cache to reflect the change
      if (user) {
        const keysToRemove: string[] = []
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i)
          if (key && key.startsWith(`user_data_${user.id}_`)) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => sessionStorage.removeItem(key))
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
        { alert_type: 'health_score', threshold_value: healthThreshold, is_active: true },
        { alert_type: 'consistency_score', threshold_value: consistencyThreshold, is_active: true },
        { alert_type: 'price_drop', threshold_value: priceDropThreshold, is_active: true },
        { alert_type: 'migration', threshold_value: null, is_active: enableMigrationAlerts },
      ]

      for (const alert of alerts) {
        const res = await fetch('/api/user-alerts', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user?.id}`
          },
          body: JSON.stringify({
            coin_id: data.coingecko_id,
            ...alert
          })
        })
        if (!res.ok) throw new Error('Failed to save alert settings')
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
        keysToRemove.forEach(key => sessionStorage.removeItem(key))
      }
    } catch (err: any) {
      setNotificationError(err.message)
    } finally {
      setNotificationLoading(false)
    }
  }

  return (
    <div className="relative">
      <Link
        href={`/coin/${data.coingecko_id}`}
        className={`flex items-center gap-3 px-6 py-3 transition-all duration-300 border-b min-w-max ${
          isDarkMode ? "border-slate-800/50" : "border-sky-100/50"
        } ${bgClass} hover:scale-[1.005] hover:shadow-md cursor-pointer`}
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
                className="w-8 h-8 rounded-xl shadow-sm transition-all duration-300 hover:scale-110"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none"
                  const next = e.currentTarget.nextElementSibling as HTMLElement | null
                  if (next) next.style.display = "flex"
                }}
              />
            ) : (
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs bg-gradient-to-br from-amber-500 to-orange-500 shadow-sm transition-all duration-300 hover:scale-110">
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
                          {[...new Set(verifiedAlerts)].map(type => (
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
            <div className={`text-xs ${mutedTextClass} uppercase font-medium tracking-wider truncate`}>{data.symbol}</div>
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
        <div 
          className="flex-shrink-0 w-24 flex items-center"
          onClick={(e) => e.stopPropagation()}
        >
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
        <div 
          className="flex-shrink-0 w-24 flex items-center"
          onClick={(e) => e.stopPropagation()}
        >
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
        <div 
          className="flex-shrink-0 w-32 flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <CuteHeartTooltip score={beatScore} isDarkMode={isDarkMode}>
            <ElegantPixelatedHeart score={beatScore} isDarkMode={isDarkMode} size="sm" />
          </CuteHeartTooltip>
        </div>

        {/* Consistency Score - COMPLETELY ISOLATED */}
        <div 
          className="flex-shrink-0 w-32 flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
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
          <div 
            className="flex-shrink-0 w-16 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
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
                  onFocus={e => e.currentTarget.classList.add('ring-2','ring-blue-400')}
                  onBlur={e => e.currentTarget.classList.remove('ring-2','ring-blue-400')}
                >
                  <span className="sr-only">Open notification setup</span>
                  <img
                    src={hasActiveAlerts ? "/Bell2.ico" : "/Bell1.ico"}
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
                onFocus={e => e.currentTarget.classList.add('ring-2','ring-yellow-400')}
                onBlur={e => e.currentTarget.classList.remove('ring-2','ring-yellow-400')}
              >
                <span className="sr-only">Open alert form</span>
                <img
                  src={hasUserStaked ? "/Mega2.ico" : "/Mega1.ico"}
                  alt={hasUserStaked ? "Alerted" : "Report issue"}
                  className="w-6 h-6 transition-all duration-300"
                  style={{ transform: 'scale(1.23)' }}
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
                <h3 className="text-base font-bold text-blue-900">
                  Smart Alerts for {data.symbol}
                </h3>
                {hasActiveAlerts && (
                  <div className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    Active
                  </div>
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
                  {notificationError && (
                    <div className="text-red-600 text-xs font-medium">{notificationError}</div>
                  )}
                  {notificationSuccess && (
                    <div className="text-green-600 text-xs font-medium">{notificationSuccess}</div>
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
          <div 
            className="w-full px-6 pb-6 pt-4 bg-gradient-to-br from-yellow-50/90 to-orange-50/90 border-b border-yellow-200/50 shadow-lg backdrop-blur-sm animate-fade-in-down rounded-b-xl relative"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (onExpandAlert) onExpandAlert()
              }}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-yellow-200/80 transition-colors"
              title="Close alert form"
              aria-label="Close alert form"
            >
              <X className="w-4 h-4 text-yellow-700" />
            </button>

            <form 
              className="space-y-2 animate-fade-in" 
              onSubmit={handleSubmit}
            >
              <div className="flex items-center gap-2 mb-1">
                <Megaphone className="w-5 h-5 text-yellow-500" />
                <h3 className="text-base font-bold text-yellow-900">
                  Community Alert Staking Pool for {data.symbol}
                </h3>
                {hasUserStaked && (
                  <div className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    Staked
                  </div>
                )}
                {verifiedAlerts.includes(alertType) && (
                  <div className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                    Verified ✓
                  </div>
                )}
              </div>

              {/* Single Row Layout - Three Sections */}
              <div className="flex flex-row gap-3 overflow-x-auto pb-1">
                
                {/* Left Section: Alert Type & Proof Link */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50/80 border border-yellow-100 flex-1 min-w-0">
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                      <select
                        className="rounded border px-2 py-1 text-xs focus:ring-2 focus:ring-yellow-400 bg-white/80 text-yellow-900 border-yellow-200 flex-1"
                        value={alertType}
                        onChange={(e) => setAlertType(e.target.value)}
                        disabled={loading}
                        aria-label="Alert type"
                      >
                        <option value="migration">Migration</option>
                        <option value="delisting">Delisting</option>
                        <option value="rebrand">Rebrand</option>
                        <option value="regulatory">Regulatory</option>
                      </select>
                    </div>
                    <input
                      type="url"
                      className="rounded border px-2 py-1 text-xs flex-1 focus:ring-2 focus:ring-yellow-400 bg-white/80 text-yellow-900 border-yellow-200 placeholder-yellow-600"
                      placeholder="Proof link (tweet, news, etc)"
                      value={proofLink}
                      onChange={(e) => setProofLink(e.target.value)}
                      required
                      disabled={loading || alreadyAlerted}
                      aria-label="Proof link"
                    />
                  </div>
                </div>

                {/* Middle Section: Pool Status Card */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50/80 border border-yellow-100 flex-1 min-w-0">
                  <div className="flex flex-col gap-1 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span role="img" aria-label="egg" className="text-sm">🥚</span>
                        <span className="text-xs font-medium text-yellow-900">Pool Status</span>
                      </div>
                      <span className="text-xs text-yellow-700">
                        {poolStatus ? (
                          poolStatus.poolFilled ? "Filled!" : `${poolStatus.totalEggs}/${POOL_SIZE}`
                        ) : (
                          loading ? "Loading..." : "0/6"
                        )}
                      </span>
                    </div>
                    
                    {/* Pool Progress Bar */}
                    <div className="w-full bg-yellow-200/60 rounded-full h-1.5">
                      <div 
                        className="bg-gradient-to-r from-yellow-400 to-orange-400 h-1.5 rounded-full transition-all duration-300"
                        style={{ 
                          width: poolStatus 
                            ? `${Math.min(100, (poolStatus.totalEggs / POOL_SIZE) * 100)}%` 
                            : '0%' 
                        }}
                      ></div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-yellow-700">
                      <span>
                        {poolStatus ? `${poolStatus.alerts.length} staker${poolStatus.alerts.length !== 1 ? 's' : ''}` : "No stakers"}
                      </span>
                      {hasUserStaked && (
                        <span className="text-green-600 font-medium">✓ You: 2🥚</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Section: Egg Info & Submit */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50/80 border border-yellow-100 flex-1 min-w-0">
                  <div className="flex flex-col gap-2 flex-1">
                    {!hasUserStaked && (
                      <div className="flex items-center gap-1 text-xs text-yellow-800">
                        <span role="img" aria-label="egg" className="text-sm">🥚</span>
                        <span className="font-medium">Stake 2 eggs</span>
                        <span className="text-yellow-600">• 2x if verified!</span>
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={loading || hasUserStaked}
                      className="w-full px-3 py-1.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-semibold shadow flex items-center justify-center gap-1"
                    >
                      {loading ? (
                        "Staking..."
                      ) : hasUserStaked ? (
                        <>
                          <span>✓</span>
                          <span>Staked</span>
                        </>
                      ) : (
                        <>
                          <span role="img" aria-label="egg">🥚</span>
                          <span>Stake Eggs</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Info Row */}
              <div className="flex items-center justify-between pt-2 border-t border-yellow-100 mt-2">
                <div className="flex items-center gap-2 text-xs text-yellow-700">
                  <Info className="w-4 h-4" />
                  <span>Pools need {POOL_SIZE} eggs to activate • Double rewards when verified</span>
                </div>
                <div className="flex items-center gap-2">
                  {error && (
                    <div className="text-red-600 text-xs font-medium">{error}</div>
                  )}
                  {success && (
                    <div className="text-green-600 text-xs font-medium">{success}</div>
                  )}
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}