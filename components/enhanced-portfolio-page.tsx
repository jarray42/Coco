"use client"

import { useState, useEffect } from "react"
import { ModernDeFiBackground } from "./modern-defi-background"
import { SiteHeader } from "./site-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sun, Moon, ArrowLeft, Edit3, Save, X, TrendingUp, Trash2, Star, Users, ArrowUpDown, Wallet, Info, Bell, Megaphone, Activity, Shield, TrendingDown, Minus, Plus, AlertTriangle } from "lucide-react"
import { getCurrentUser, type AuthUser } from "../utils/supabase-auth"
import { getUserPortfolio, updatePortfolioItem, removeFromPortfolio, type PortfolioItem } from "../utils/portfolio"
import { formatPrice, formatNumber, type CryptoData, getHealthScore } from "../utils/beat-calculator"
import { ElegantPixelatedHeart } from "./elegant-pixelated-heart"
import { UserMenu } from "./user-menu"
import { NotificationBell } from "./notification-bell"
import { AnimatedNotificationList } from "./animated-notification-list"
import { ElegantAIPortfolioAdvisor } from "./elegant-ai-portfolio-advisor"
import { ElegantFooter } from "./elegant-footer"
import Link from "next/link"
import Image from "next/image"
import { getUserQuota } from "../utils/quota-manager"
import { PortfolioWalletIcon } from "./portfolio-wallet-icon"
import { ConsistencyScoreDisplay } from "./consistency-score-display"
import { ElegantTooltip } from "./elegant-tooltip"
import { ElasticSlider } from "./elastic-slider"
import { useRef } from "react"
import { getCoinsByIdsFromBunny } from "../actions/fetch-coins-from-bunny"
import React from "react"

interface PortfolioItemWithData extends PortfolioItem {
  coinData?: CryptoData & { consistencyScore?: number; consistencyDetails?: any }
  beatScore?: number
  totalValue?: number
}

type PortfolioSortOption = "name" | "amount" | "price" | "totalValue" | "healthScore" | "marketCap" | "rank"

export function EnhancedPortfolioPage() {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [portfolio, setPortfolio] = useState<PortfolioItemWithData[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState("")
  const [sortBy, setSortBy] = useState<PortfolioSortOption>("totalValue")
  const [ascending, setAscending] = useState(false)
  const [eggs, setEggs] = useState<number | null>(null)
  // Add state for expanded notification and alert windows per coin
  const [expandedNotification, setExpandedNotification] = useState<string | null>(null)
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null)
  // Add per-coin state for notification and alert forms
  const [notificationStates, setNotificationStates] = useState<Record<string, any>>({})
  const [alertStates, setAlertStates] = useState<Record<string, any>>({})
  // Add state for closed status by alert type per coin
  const [closedStatusByType, setClosedStatusByType] = useState<Record<string, Record<string, { closed: boolean, reason: string | null }>>>({})

  // Add at the top of EnhancedPortfolioPage
  const [userDataBatch, setUserDataBatch] = useState<any>(null)
  const [userDataLoading, setUserDataLoading] = useState(false)
  const [userDataError, setUserDataError] = useState<string | null>(null)
  const [stakedEggs, setStakedEggs] = useState<number>(0)

  // Add poolStatus state for each coin's alert window
  const [poolStatusByCoin, setPoolStatusByCoin] = useState<Record<string, any>>({})

  useEffect(() => {
    // Auto-purge cache first, then load data
    const initializeData = async () => {
      await loadUserAndPortfolio()
    }
    
    initializeData()
    
    // Listen for alert deletion events from notification dashboard
    const handleNotificationDeleted = (event: CustomEvent) => {
      const { coinId, userId } = event.detail;
      if (userId === user?.id) {
        console.log(`📢 Portfolio page received notification deletion for coin: ${coinId}`);
        // Update userDataBatch to reflect alert removal
        setUserDataBatch((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            alerts: {
              ...prev.alerts,
              map: {
                ...prev.alerts?.map,
                [coinId]: false
              }
            }
          };
        });
      }
    };
    
    // Add the event listener
    window.addEventListener('notificationDeleted', handleNotificationDeleted as EventListener);
    
    // Cleanup the event listener
    return () => {
      window.removeEventListener('notificationDeleted', handleNotificationDeleted as EventListener);
    };
  }, [user?.id])

  useEffect(() => {
    if (user) {
      getUserQuota(user).then((quota) => {
        if (quota && typeof quota.eggs === "number") setEggs(quota.eggs)
      })
    }
  }, [user])

  // Add a refresh function for userDataBatch
  const refreshUserDataBatch = async () => {
    if (!user || !user.id) return;
    
    setUserDataLoading(true);
    setUserDataError(null);
    
    try {
      // Clear any cached user data from sessionStorage
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(`user_data_${user.id}`)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
      
      const response = await fetch("/api/user-data-batch", {
        headers: { 
          'Authorization': `Bearer ${user.id}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const data = await response.json();
      setUserDataBatch(data);
      // Calculate staked eggs (each stake costs 2 eggs)
      const stakedCount = data.staked?.count || 0;
      setStakedEggs(stakedCount * 2);
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      setUserDataError("Failed to refresh alert data");
    } finally {
      setUserDataLoading(false);
    }
  };

  // Fetch user-data-batch after user is loaded
  useEffect(() => {
    if (user && user.id) {
      setUserDataLoading(true)
      setUserDataError(null)
      fetch("/api/user-data-batch", {
        headers: { 'Authorization': `Bearer ${user.id}` }
      })
        .then(res => res.json())
        .then(data => {
          setUserDataBatch(data)
          // Calculate staked eggs (each stake costs 2 eggs)
          const stakedCount = data.staked?.count || 0
          setStakedEggs(stakedCount * 2)
        })
        .catch(() => setUserDataError("Failed to load user alert data"))
        .finally(() => setUserDataLoading(false))
    }
  }, [user])

  // Fetch closed status for all alert types when alert window is expanded for a coin
  useEffect(() => {
    if (expandedAlert) {
      const coinId = expandedAlert;
      const types = ['migration', 'delisting', 'rebrand'];
      types.forEach(type => {
      fetch(`/api/coin-alerts?coin_id=${coinId}&alert_type=${type}&ts=${Date.now()}`,
        { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } }
      )
          .then(res => res.json())
          .then(res => {
            const closedAlert = (res.alerts || []).find((a: any) => (a.status === 'verified' || a.status === 'rejected') && a.archived === false)
            setClosedStatusByType(prev => ({
              ...prev,
              [coinId]: {
                ...(prev[coinId] || {}),
                [type]: closedAlert
                  ? {
                      closed: true,
                      reason: closedAlert.status === 'verified'
                        ? `The ${type.charAt(0).toUpperCase() + type.slice(1)} pool has been verified and is now closed.`
                        : `The ${type.charAt(0).toUpperCase() + type.slice(1)} pool was rejected and is now closed.`
                    }
                  : { closed: false, reason: null }
              }
            }))
          })
          .catch(() => {
            setClosedStatusByType(prev => ({
              ...prev,
              [coinId]: {
                ...(prev[coinId] || {}),
                [type]: { closed: false, reason: null }
              }
            }))
          })
      })
    }
  }, [expandedAlert])

  // Fetch pool status for the selected alert type and coin when alert window is expanded or alert type changes
  useEffect(() => {
    if (expandedAlert) {
      const coinId = expandedAlert;
      const alertType = alertStates[coinId]?.alertType || 'migration';
      fetch(`/api/coin-alerts?coin_id=${coinId}&alert_type=${alertType}&ts=${Date.now()}`,
        { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } }
      )
        .then(res => res.json())
        .then(res => {
          setPoolStatusByCoin(prev => ({ ...prev, [coinId]: res }))
        })
        .catch(() => {
          setPoolStatusByCoin(prev => ({ ...prev, [coinId]: null }))
        })
    }
  }, [expandedAlert, alertStates])

  const loadUserAndPortfolio = async () => {
    try {
      console.log("Loading user and portfolio...")
      const { user } = await getCurrentUser()
      setUser(user as AuthUser | null)

      if (user) {
        console.log("User found, loading portfolio...")
        const portfolioItems = await getUserPortfolio(user as AuthUser)
        console.log("Portfolio items:", portfolioItems)

        const coingeckoIds = portfolioItems.map((item) => item.coingecko_id)
        const portfolioCoins = await getCoinsByIdsFromBunny(coingeckoIds)
        console.log("Portfolio coins loaded:", portfolioCoins.length)

        // Enrich portfolio items with coin data and pre-calculated scores
        const enrichedPortfolio = portfolioItems.map((item) => {
          const coinData = portfolioCoins.find((coin) => coin.coingecko_id === item.coingecko_id)
          const beatScore = coinData ? getHealthScore(coinData) : 0
          const consistencyScore = coinData ? (coinData.consistency_score || 50) : 0
          const totalValue = coinData && item.amount ? coinData.price * item.amount : 0
          // Use pre-calculated consistency score from coin data
          const coinDataWithConsistency = coinData
            ? { ...coinData, consistencyScore: consistencyScore, consistencyDetails: null }
            : undefined
          return {
            ...item,
            coinData: coinDataWithConsistency,
            beatScore,
            totalValue,
          }
        })

        console.log("Enriched portfolio:", enrichedPortfolio)
        setPortfolio(enrichedPortfolio)
      }
    } catch (error) {
      console.error("Error loading portfolio:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditAmount = (coinId: string, currentAmount: number) => {
    setEditingId(coinId)
    setEditAmount(currentAmount.toString())
  }

  const handleSaveAmount = async (coinId: string) => {
    if (!user) return

    const amount = Number.parseFloat(editAmount) || 0
    const result = await updatePortfolioItem(user, coinId, amount)

    if (result.success) {
      setPortfolio((prev) =>
        prev.map((item) =>
          item.coingecko_id === coinId
            ? {
                ...item,
                amount,
                totalValue: item.coinData ? item.coinData.price * amount : 0,
              }
            : item,
        ),
      )
      setEditingId(null)
      setEditAmount("")
    }
  }

  const handleRemoveFromPortfolio = async (coinId: string) => {
    if (!user) return

    const result = await removeFromPortfolio(user, coinId)
    if (result.success) {
      setPortfolio((prev) => prev.filter((item) => item.coingecko_id !== coinId))
    }
  }

  const handleSort = (column: PortfolioSortOption) => {
    if (sortBy === column) {
      setAscending(!ascending)
    } else {
      setSortBy(column)
      setAscending(false)
    }
  }

  const getSortTriangle = (column: PortfolioSortOption) => {
    if (sortBy !== column) {
      return (
        <ArrowUpDown
          className={`w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity duration-200 ml-1 ${
            isDarkMode ? "text-blue-400" : "text-sky-600"
          }`}
        />
      )
    }

    return (
      <div className="flex flex-col ml-1">
        {ascending ? (
          <div
            className={`w-0 h-0 border-l-[2px] border-r-[2px] border-b-[3px] border-l-transparent border-r-transparent ${
              isDarkMode ? "border-b-blue-400" : "border-b-sky-600"
            }`}
          />
        ) : (
          <div
            className={`w-0 h-0 border-l-[2px] border-r-[2px] border-t-[3px] border-l-transparent border-r-transparent ${
              isDarkMode ? "border-t-orange-400" : "border-t-orange-600"
            }`}
          />
        )}
      </div>
    )
  }

  const handleSignOut = () => {
    setUser(null)
  }

  // Sort portfolio
  const sortedPortfolio = [...portfolio].sort((a: PortfolioItemWithData, b: PortfolioItemWithData) => {
    let aValue: number | string, bValue: number | string

    switch (sortBy) {
      case "name":
        aValue = a.coin_name.toLowerCase()
        bValue = b.coin_name.toLowerCase()
        return ascending ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      case "amount":
        aValue = a.amount || 0
        bValue = b.amount || 0
        break
      case "price":
        aValue = a.coinData?.price || 0
        bValue = b.coinData?.price || 0
        break
      case "totalValue":
        aValue = a.totalValue || 0
        bValue = b.totalValue || 0
        break
      case "healthScore":
        aValue = a.beatScore || 0
        bValue = b.beatScore || 0
        break
      case "marketCap":
        aValue = a.coinData?.market_cap || 0
        bValue = b.coinData?.market_cap || 0
        break
      case "rank":
        aValue = a.coinData?.rank || 999999
        bValue = b.coinData?.rank || 999999
        break
      default:
        return 0
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return ascending ? aValue - bValue : bValue - aValue
    }

    return 0
  })

  const totalPortfolioValue = portfolio.reduce((sum, item) => sum + (item.totalValue || 0), 0)

  // Helper to initialize state for a coin if not present
  function ensureNotificationState(coinId: string) {
    if (!notificationStates[coinId]) {
      setNotificationStates((prev) => ({
        ...prev,
        [coinId]: {
          notificationLoading: false,
          notificationError: null,
          notificationSuccess: null,
          healthThreshold: 30,
          consistencyThreshold: 25,
          priceDropThreshold: 20,
          enableMigrationAlerts: true,
          hasActiveAlerts: false,
          removeAlarmsLoading: false,
          removeAlarmsError: null,
        },
      }))
    }
  }
  function ensureAlertState(coinId: string) {
    if (!alertStates[coinId]) {
      setAlertStates((prev) => ({
        ...prev,
        [coinId]: {
          alertType: "migration",
          proofLink: "",
          poolStatus: null,
          loading: false,
          error: null,
          success: null,
          hasUserStaked: false,
          verifiedAlerts: [],
        },
      }))
    }
  }

  if (loading) {
    return (
      <div className={`min-h-screen transition-all duration-1000 ${isDarkMode ? "dark" : ""}`}>
        <ModernDeFiBackground isDarkMode={isDarkMode} />
        <div className="relative z-10 max-w-6xl mx-auto p-3 sm:p-4 lg:p-6">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="text-3xl mb-3">🐔</div>
              <p className={`text-base font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                Loading your portfolio...
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className={`min-h-screen transition-all duration-1000 ${isDarkMode ? "dark" : ""}`}>
        <ModernDeFiBackground isDarkMode={isDarkMode} />
        <div className="relative z-10 max-w-6xl mx-auto p-3 sm:p-4 lg:p-6">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="text-3xl mb-3">🔒</div>
              <h1 className={`text-xl font-bold mb-3 ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                Please Sign In
              </h1>
              <p className={`text-base mb-4 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                You need to be signed in to view your portfolio.
              </p>
              <Link href="/">
                <Button
                  className={`px-4 py-2 rounded-xl font-semibold transition-all duration-300 ${
                    isDarkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-sky-600 hover:bg-sky-700 text-white"
                  }`}
                >
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen transition-all duration-1000 ${isDarkMode ? "dark" : ""}`}>
      <ModernDeFiBackground isDarkMode={isDarkMode} />

      <div className="relative z-10 max-w-[85rem] mx-auto p-3 sm:p-4 lg:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button
                variant="outline"
                className={`h-10 w-10 p-0 rounded-xl transition-all duration-300 backdrop-blur-md shadow-lg border-0 ${
                  isDarkMode
                    ? "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70 hover:text-slate-100 hover:scale-105"
                    : "bg-white/80 text-slate-700 hover:bg-white/90 hover:text-slate-900 hover:scale-105"
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <SiteHeader isMainPage={false} isDarkMode={isDarkMode} />
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsDarkMode(!isDarkMode)}
              variant="outline"
              className={`h-10 px-4 rounded-xl transition-all duration-300 backdrop-blur-md shadow-lg border-0 ${
                isDarkMode
                  ? "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70 hover:text-slate-100 hover:scale-105"
                  : "bg-white/80 text-slate-700 hover:bg-white/90 hover:text-slate-900 hover:scale-105"
              }`}
            >
              {isDarkMode ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
              {isDarkMode ? "Light" : "Dark"}
            </Button>

            <div className="flex items-center gap-3">
              <NotificationBell user={user} isDarkMode={isDarkMode} />
              <UserMenu user={user} isDarkMode={isDarkMode} onSignOut={handleSignOut} />
            </div>
          </div>
        </div>

        {/* Portfolio Header - Updated Typography */}
        <div
          className={`rounded-2xl p-6 mb-6 ${
            isDarkMode ? "bg-slate-800/50" : "bg-white/80"
          } backdrop-blur-md shadow-lg border ${isDarkMode ? "border-slate-700/30" : "border-slate-200/50"}`}
        >
          <div className="flex items-center gap-4 mb-4">
            <Image src="/portfolio-nest.png" alt="Portfolio Nest" width={82} height={82} className="drop-shadow-lg" />
            <h1
              className={`text-2xl font-bold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700 }}
            >
              My Portfolio
            </h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center mb-8">
            {/* Total Value */}
            <div>
              <div className={`text-sm font-medium ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Total Value</div>
              <div className={`text-2xl font-bold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>{formatPrice(totalPortfolioValue)}</div>
            </div>
            {/* Portfolio Health */}
            <div>
              <ElegantTooltip
                content={
                  <div className="text-center">
                    <div className="text-sm font-semibold">Portfolio Health</div>
                    <div className="text-xs mt-1">
                      Weighted by portfolio value
                    </div>
                    <div className="text-xs mt-1 opacity-80">
                      Formula: Σ(Health Score × Value) / Σ(Total Value)
                    </div>
                  </div>
                }
                position="top"
                isDarkMode={isDarkMode}
              >
                <div className="cursor-help">
                  <div className={`text-sm font-medium ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Portfolio Health</div>
                  <div className={`text-2xl font-bold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                    {portfolio.length > 0 ? 
                      (() => {
                        const totalValue = portfolio.reduce((sum, item) => sum + (item.totalValue || 0), 0)
                        if (totalValue === 0) return "0"
                        
                        const weightedSum = portfolio.reduce((sum, item) => {
                          const healthScore = item.beatScore || 0
                          const value = item.totalValue || 0
                          return sum + (healthScore * value)
                        }, 0)
                        
                        const weightedAverage = Math.round(weightedSum / totalValue)
                        return weightedAverage.toString()
                      })()
                      : "0"
                    }
                  </div>
                </div>
              </ElegantTooltip>
            </div>
            {/* Average Consistency */}
            <div>
              <ElegantTooltip
                content={
                  <div className="text-center">
                    <div className="text-sm font-semibold">Average Consistency</div>
                    <div className="text-xs mt-1">
                      Weighted by portfolio value
                    </div>
                    <div className="text-xs mt-1 opacity-80">
                      Formula: Σ(Consistency Score × Value) / Σ(Total Value)
                    </div>
                  </div>
                }
                position="top"
                isDarkMode={isDarkMode}
              >
                <div className="cursor-help">
                  <div className={`text-sm font-medium ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Average Consistency</div>
                  <div className={`text-2xl font-bold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                    {portfolio.length > 0 ? 
                      (() => {
                        const totalValue = portfolio.reduce((sum, item) => sum + (item.totalValue || 0), 0)
                        if (totalValue === 0) return "0"
                        
                        const weightedSum = portfolio.reduce((sum, item) => {
                          const consistencyScore = item.coinData?.consistencyScore || 50
                          const value = item.totalValue || 0
                          return sum + (consistencyScore * value)
                        }, 0)
                        
                        const weightedAverage = Math.round(weightedSum / totalValue)
                        return weightedAverage.toString()
                      })()
                      : "0"
                    }
                  </div>
                </div>
              </ElegantTooltip>
            </div>
            {/* Eggs Badge */}
            <div className="flex justify-end">
              {eggs !== null && (
                <div className={`px-3 py-2 rounded-xl shadow-lg border ${isDarkMode ? "bg-gradient-to-br from-yellow-400/20 to-orange-400/20 border-yellow-300/50" : "bg-gradient-to-br from-yellow-100/80 to-orange-100/80 border-yellow-300"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span role="img" aria-label="egg" className="text-lg">🥚</span>
                    <span className={`text-base font-bold ${isDarkMode ? "text-yellow-200" : "text-yellow-900"}`}>
                      {eggs} Eggs
                    </span>
                  </div>
                  {stakedEggs > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span role="img" aria-label="staked" className="text-sm">📍</span>
                      <span className={`text-xs font-medium ${isDarkMode ? "text-yellow-300/80" : "text-yellow-700"}`}>
                        {stakedEggs} Staked
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CocoriAI Portfolio Advisor - Positioned here */}
        <div className="mb-6">
          <ElegantAIPortfolioAdvisor user={user} isDarkMode={isDarkMode} />
        </div>

        {/* Portfolio Items */}
        {portfolio.length === 0 ? (
          <div
            className={`text-center py-12 rounded-2xl ${
              isDarkMode ? "bg-slate-800/50" : "bg-white/80"
            } backdrop-blur-md shadow-lg border ${isDarkMode ? "border-slate-700/30" : "border-slate-200/50"}`}
          >
            <div className="text-4xl mb-3">🐣</div>
            <h2 className={`text-lg font-bold mb-2 ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
              Your portfolio is empty
            </h2>
            <p className={`${isDarkMode ? "text-slate-400" : "text-slate-600"} mb-4 text-sm`}>
              Start building your portfolio by adding coins from the dashboard!
            </p>
            <Link href="/">
              <Button
                className={`px-4 py-2 rounded-xl font-semibold transition-all duration-300 ${
                  isDarkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-sky-600 hover:bg-sky-700 text-white"
                }`}
              >
                Browse Coins
              </Button>
            </Link>
          </div>
        ) : (
          <div
            className={`rounded-2xl overflow-hidden ${
              isDarkMode ? "bg-slate-800/50" : "bg-white/80"
            } backdrop-blur-md shadow-lg border ${isDarkMode ? "border-slate-700/30" : "border-slate-200/50"}`}
          >
            {/* Enhanced Sortable Table Header */}
            <div
              className={`flex items-center gap-3 px-4 py-3 ${
                isDarkMode ? "bg-slate-900/70 border-b border-slate-700/50" : "bg-white/70 border-b border-sky-200/50"
              } font-semibold text-xs uppercase tracking-wider ${isDarkMode ? "text-slate-300" : "text-slate-600"} min-w-max overflow-x-auto`}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort("rank")}
                className={`flex-shrink-0 w-16 justify-start p-2 h-auto hover:bg-transparent transition-all duration-300 flex items-center group rounded-xl ${
                  isDarkMode ? "hover:text-blue-300 hover:bg-slate-800/40" : "hover:text-sky-700 hover:bg-sky-50/60"
                }`}
              >
                <span>Rank</span>
                {getSortTriangle("rank")}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort("name")}
                className={`flex-shrink-0 w-44 justify-start p-2 h-auto hover:bg-transparent transition-all duration-300 flex items-center group rounded-xl ${
                  isDarkMode ? "hover:text-blue-300 hover:bg-slate-800/40" : "hover:text-sky-700 hover:bg-sky-50/60"
                }`}
              >
                <span>Coin</span>
                {getSortTriangle("name")}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort("amount")}
                className={`flex-shrink-0 w-24 justify-start p-2 h-auto hover:bg-transparent transition-all duration-300 flex items-center group rounded-xl ${
                  isDarkMode ? "hover:text-blue-300 hover:bg-slate-800/40" : "hover:text-sky-700 hover:bg-sky-50/60"
                }`}
              >
                <span>Amount</span>
                {getSortTriangle("amount")}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort("price")}
                className={`flex-shrink-0 w-28 justify-start p-2 h-auto hover:bg-transparent transition-all duration-300 flex items-center group rounded-xl ${
                  isDarkMode ? "hover:text-blue-300 hover:bg-slate-800/40" : "hover:text-sky-700 hover:bg-sky-50/60"
                }`}
              >
                <span>Price</span>
                {getSortTriangle("price")}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort("marketCap")}
                className={`flex-shrink-0 w-28 justify-start p-2 h-auto hover:bg-transparent transition-all duration-300 flex items-center group rounded-xl ${
                  isDarkMode ? "hover:text-blue-300 hover:bg-slate-800/40" : "hover:text-sky-700 hover:bg-sky-50/60"
                }`}
              >
                <span>Market Cap</span>
                {getSortTriangle("marketCap")}
              </Button>



              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort("totalValue")}
                className={`flex-shrink-0 w-32 justify-start p-2 h-auto hover:bg-transparent transition-all duration-300 flex items-center group rounded-xl ${
                  isDarkMode ? "hover:text-blue-300 hover:bg-slate-800/40" : "hover:text-sky-700 hover:bg-sky-50/60"
                }`}
              >
                <span>Total Value</span>
                {getSortTriangle("totalValue")}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort("healthScore")}
                className={`flex-shrink-0 w-32 justify-start p-2 h-auto hover:bg-transparent transition-all duration-300 flex items-center group rounded-xl ${
                  isDarkMode ? "hover:text-blue-300 hover:bg-slate-800/40" : "hover:text-sky-700 hover:bg-sky-50/60"
                }`}
              >
                <span>Health</span>
                {getSortTriangle("healthScore")}
              </Button>

              <div className="flex-shrink-0 w-32 flex items-center justify-center">
                <span>Consistency</span>
              </div>

              <div className="flex-shrink-0 w-20 flex items-center justify-center">
                <span>Actions</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-max">
                {sortedPortfolio.map((item, index) => {
                  // Ensure state exists for this coin
                  ensureNotificationState(item.coingecko_id)
                  ensureAlertState(item.coingecko_id)
                  const notifState = notificationStates[item.coingecko_id] || {}
                  const alertState = alertStates[item.coingecko_id] || {}

                  // Compute real state from userDataBatch
                  const hasAlerts = userDataBatch?.alerts?.map?.[item.coingecko_id] || false
                  const hasStaked = userDataBatch?.staked?.map?.[item.coingecko_id] || false
                  const batchVerifiedAlerts = userDataBatch?.verifiedAlerts?.map?.[item.coingecko_id] || []

                  // Remove alarms handler
                  const handleRemoveAlarms = async (coinId: string) => {
                    if (!user) return;
                    
                    setNotificationStates((prev) => ({
                      ...prev,
                      [coinId]: { ...notifState, removeAlarmsLoading: true, removeAlarmsError: null },
                    }));
                    
                    try {
                      const res = await fetch(`/api/user-alerts?coin_id=${coinId}`, {
                        method: 'DELETE',
                        headers: {
                          'Authorization': `Bearer ${user.id}`
                        }
                      });
                      
                      if (!res.ok) throw new Error('Failed to remove alerts');
                      
                      // Immediately update userDataBatch state for instant UI feedback
                      setUserDataBatch((prev: any) => {
                        if (!prev) return prev;
                        return {
                          ...prev,
                          alerts: {
                            ...prev.alerts,
                            map: {
                              ...prev.alerts?.map,
                              [coinId]: false
                            }
                          }
                        };
                      });
                      
                      setNotificationStates((prev) => ({
                        ...prev,
                        [coinId]: { 
                          ...notifState, 
                          removeAlarmsLoading: false, 
                          removeAlarmsError: null,
                          notificationSuccess: 'All alerts removed!',
                          hasActiveAlerts: false
                        },
                      }));
                      
                      // Refresh userDataBatch to ensure consistency
                      await refreshUserDataBatch();
                      
                    } catch (err: any) {
                      setNotificationStates((prev) => ({
                        ...prev,
                        [coinId]: { 
                          ...notifState, 
                          removeAlarmsLoading: false, 
                          removeAlarmsError: err.message 
                        },
                      }));
                    }
                  };

                  // Notification form handler
                  const handleNotificationSubmit = async (e: React.FormEvent) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setNotificationStates((prev) => ({
                      ...prev,
                      [item.coingecko_id]: { ...notifState, notificationLoading: true, notificationError: null, notificationSuccess: null },
                    }))
                    try {
                      const alerts = [
                        { alert_type: 'health_score', threshold_value: notifState.healthThreshold, is_active: true },
                        { alert_type: 'consistency_score', threshold_value: notifState.consistencyThreshold, is_active: true },
                        { alert_type: 'price_drop', threshold_value: notifState.priceDropThreshold, is_active: true },
                        { alert_type: 'migration', threshold_value: null, is_active: notifState.enableMigrationAlerts },
                      ]
                      for (const alert of alerts) {
                        const res = await fetch('/api/user-alerts', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.id}` },
                          body: JSON.stringify({ coin_id: item.coingecko_id, ...alert })
                        })
                        if (!res.ok) {
                          const errorData = await res.json()
                          throw new Error(errorData.error || 'Failed to save alert settings')
                        }
                      }
                      
                      // Immediately update userDataBatch state for instant UI feedback
                      setUserDataBatch((prev: any) => {
                        if (!prev) return prev;
                        return {
                          ...prev,
                          alerts: {
                            ...prev.alerts,
                            map: {
                              ...prev.alerts?.map,
                              [item.coingecko_id]: true
                            }
                          }
                        };
                      });
                      
                      // Refresh userDataBatch to update alert status from server
                      await refreshUserDataBatch();
                      
                      setNotificationStates((prev) => ({
                        ...prev,
                        [item.coingecko_id]: { ...notifState, notificationLoading: false, notificationSuccess: "Notification settings saved!", hasActiveAlerts: true },
                      }))
                    } catch (err: any) {
                      const errorMessage = err.message
                      let notificationError = errorMessage
                      
                      // Check if it's a limit error and add upgrade link
                      if (errorMessage.includes('Maximum number of alerts') && errorMessage.includes('Free plan')) {
                        notificationError = (
                          <span>
                            Alert limit reached (20/20). 
                            <a 
                              href="/plans" 
                              className="text-purple-500 hover:text-purple-600 underline font-medium ml-1"
                              onClick={(e) => {
                                e.stopPropagation()
                                window.location.href = '/plans'
                              }}
                            >
                              Upgrade to Pro for 200 alerts
                            </a>
                          </span>
                        )
                      }
                      
                      setNotificationStates((prev) => ({
                        ...prev,
                        [item.coingecko_id]: { ...notifState, notificationLoading: false, notificationError },
                      }))
                    }
                  }

                  // Alert staking form handler
                  const handleAlertSubmit = async (e: React.FormEvent) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setAlertStates((prev) => ({
                      ...prev,
                      [item.coingecko_id]: { ...alertState, loading: true, error: null, success: null },
                    }))
                    try {
                      const res = await fetch("/api/coin-alerts", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          user_id: user?.id,
                          coin_id: item.coingecko_id,
                          alert_type: alertState.alertType,
                          proof_link: alertState.proofLink,
                        }),
                      })
                      const result = await res.json()
                      if (!res.ok) throw new Error(result.error || "Failed to submit alert")
                      
                      // Handle both creation and update cases
                      let successMessage = "Alert processed successfully!"
                      if (result.created) {
                        successMessage = "Alert submitted! Thank you for contributing."
                      } else if (result.updated) {
                        successMessage = "Alert updated successfully!"
                      }
                      
                      setAlertStates((prev) => ({
                        ...prev,
                        [item.coingecko_id]: { ...alertState, loading: false, success: successMessage, hasUserStaked: true },
                      }))

                      // Refresh pool status after successful submission
                      try {
                        const poolRes = await fetch(`/api/coin-alerts?coin_id=${item.coingecko_id}&alert_type=${alertState.alertType}&ts=${Date.now()}`,
                          { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } }
                        )
                        const poolData = await poolRes.json()
                        setPoolStatusByCoin(prev => ({ ...prev, [item.coingecko_id]: poolData }))
                      } catch (poolError) {
                        console.error("Failed to refresh pool status:", poolError)
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
                    } catch (err: any) {
                      setAlertStates((prev) => ({
                        ...prev,
                        [item.coingecko_id]: { ...alertState, loading: false, error: err.message },
                      }))
                    }
                  }

                  return (
                    <React.Fragment key={item.coingecko_id}>
                  <div
                    className={`flex items-center gap-3 px-4 py-4 border-b transition-all duration-300 hover:bg-opacity-80 min-w-max ${
                      isDarkMode
                        ? index % 2 === 0
                          ? "bg-slate-900/20 border-slate-700/50"
                          : "bg-slate-900/30 border-slate-700/50"
                        : index % 2 === 0
                          ? "bg-white/50 border-slate-200/50"
                          : "bg-sky-50/30 border-slate-200/50"
                    } ${index === sortedPortfolio.length - 1 ? "border-b-0" : ""}`}
                  >
                    {/* Rank */}
                    <div className="flex-shrink-0 w-16 flex items-center">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-xl ${
                          isDarkMode ? "bg-slate-800/60 text-slate-300" : "bg-slate-100/80 text-slate-600"
                        }`}
                      >
                        {item.coinData?.rank || "N/A"}
                      </span>
                    </div>

                    {/* Coin Info */}
                    <div className="flex-shrink-0 w-44 flex items-center gap-3">
                      {item.coinData?.logo_url ? (
                        <img
                          src={item.coinData.logo_url || "/placeholder.svg"}
                          alt={`${item.coin_name} logo`}
                          className="w-8 h-8 rounded-xl shadow-md"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs bg-gradient-to-br from-amber-500 to-orange-500 shadow-md">
                          {item.coin_symbol.slice(0, 2)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div
                          className={`font-semibold text-sm ${isDarkMode ? "text-slate-100" : "text-slate-900"} truncate`}
                          title={item.coin_name}
                        >
                          {item.coin_name}
                        </div>
                        <div
                          className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-600"} uppercase font-medium tracking-wider truncate`}
                        >
                          {item.coin_symbol}
                        </div>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="flex-shrink-0 w-24 flex items-center">
                      {editingId === item.coingecko_id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.00000001"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className={`w-20 h-6 rounded-lg text-xs ${
                              isDarkMode
                                ? "bg-slate-700/50 border-slate-600/50 text-slate-100"
                                : "bg-white/80 border-slate-200/50 text-slate-900"
                            }`}
                          />
                          <Button
                            onClick={() => handleSaveAmount(item.coingecko_id)}
                            size="sm"
                            className="h-6 w-6 p-0 rounded-lg bg-green-600 hover:bg-green-700"
                          >
                            <Save className="w-3 h-3" />
                          </Button>
                          <Button
                            onClick={() => setEditingId(null)}
                            size="sm"
                            variant="outline"
                            className="h-6 w-6 p-0 rounded-lg"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span
                            className={`font-semibold text-xs ${isDarkMode ? "text-slate-200" : "text-slate-800"} truncate`}
                          >
                            {item.amount || 0}
                          </span>
                          <Button
                            onClick={() => handleEditAmount(item.coingecko_id, item.amount)}
                            size="sm"
                            variant="ghost"
                            className="h-5 w-5 p-0 rounded-lg"
                          >
                            <Edit3 className="w-2.5 h-2.5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Price */}
                    <div className="flex-shrink-0 w-28 flex items-center">
                      <div className="w-full">
                        <div
                          className={`font-semibold text-xs ${isDarkMode ? "text-slate-200" : "text-slate-800"} truncate`}
                        >
                          {formatPrice(item.coinData?.price || 0)}
                        </div>
                        {item.coinData?.price_change_24h && (
                          <div
                            className={`text-xs flex items-center gap-1 font-semibold px-2 py-0.5 rounded-xl transition-all duration-300 ${
                              item.coinData.price_change_24h >= 0
                                ? isDarkMode
                                  ? "text-emerald-300 bg-emerald-900/40"
                                  : "text-emerald-700 bg-emerald-100/80"
                                : isDarkMode
                                  ? "text-red-300 bg-red-900/40"
                                  : "text-red-700 bg-red-100/80"
                            }`}
                          >
                            <TrendingUp
                              className={`w-2.5 h-2.5 ${item.coinData.price_change_24h < 0 ? "rotate-180" : ""}`}
                            />
                            <span className="truncate">{Math.abs(item.coinData.price_change_24h).toFixed(2)}%</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Market Cap */}
                    <div className="flex-shrink-0 w-28 flex items-center">
                      <div
                        className={`text-xs font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"} truncate w-full`}
                        title={`$${formatNumber(item.coinData?.market_cap || 0)}`}
                      >
                        {formatNumber(item.coinData?.market_cap || 0)}
                      </div>
                    </div>



                    {/* Total Value */}
                    <div className="flex-shrink-0 w-32 flex items-center">
                      <div className={`font-bold text-sm ${isDarkMode ? "text-slate-100" : "text-slate-900"} truncate`}>
                        {item.totalValue && item.totalValue > 0 ? formatPrice(item.totalValue) : "$0.00"}
                      </div>
                    </div>

                    {/* Health Score */}
                    <div className="flex-shrink-0 w-32 flex items-center justify-center">
                      <ElegantPixelatedHeart score={item.beatScore || 0} isDarkMode={isDarkMode} size="sm" />
                    </div>

                    {/* Consistency Score */}
                    <div className="flex-shrink-0 w-32 flex items-center justify-center">
                      {typeof item.coinData?.consistencyScore === "number" && (
                        <ConsistencyScoreDisplay score={item.coinData.consistencyScore} details={item.coinData.consistencyDetails} isDarkMode={isDarkMode} size="sm" />
                      )}
                    </div>

                        {/* Alarm Bell Icon (Notification Setup) */}
                        {user && (
                          <div className="flex-shrink-0 w-12 flex items-center justify-center ml-2" onClick={e => e.stopPropagation()}>
                            <ElegantTooltip
                              content={<div className="text-center"><div className="text-sm font-semibold">Set smart alerts</div></div>}
                              position="top"
                              isDarkMode={isDarkMode}
                            >
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  setExpandedNotification(expandedNotification === item.coingecko_id ? null : item.coingecko_id);
                                  setExpandedAlert(null);
                                }}
                                className={`rounded-full p-1 hover:bg-blue-100/60 active:scale-95 transition-all duration-150 ${expandedNotification === item.coingecko_id ? "bg-blue-200/80" : ""}`}
                                aria-label="Open notification setup"
                                tabIndex={0}
                              >
                                <span className="sr-only">Open notification setup</span>
                                <img
                                  src={hasAlerts ? "/Bell2.ico" : "/Bell1.ico"}
                                  alt={hasAlerts ? "Active alerts" : "Set alerts"}
                                  className="w-6 h-6 transition-all duration-300"
                                />
                              </button>
                            </ElegantTooltip>
                          </div>
                        )}

                        {/* Megaphone Icon (Alert Staking) */}
                        {user && (
                          <div className="flex-shrink-0 w-12 flex items-center justify-center ml-2" onClick={e => e.stopPropagation()}>
                            <ElegantTooltip
                              content={<div className="text-center"><div className="text-sm font-semibold">Chicken Watch</div><div className="text-xs mt-1 opacity-80">Report & earn eggs!</div></div>}
                              position="top"
                              isDarkMode={isDarkMode}
                            >
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  setExpandedAlert(expandedAlert === item.coingecko_id ? null : item.coingecko_id);
                                  setExpandedNotification(null);
                                }}
                                className={`rounded-full p-1 hover:bg-yellow-100/60 active:scale-95 transition-all duration-150 ${expandedAlert === item.coingecko_id ? "bg-yellow-200/80" : ""}`}
                                aria-label="Open alert form"
                                tabIndex={0}
                              >
                                <span className="sr-only">Open alert form</span>
                                <img
                                  src={hasStaked ? "/Mega2.ico" : "/Mega1.ico"}
                                  alt={hasStaked ? "Alerted" : "Report issue"}
                                  className="w-6 h-6 transition-all duration-300"
                                  style={{ transform: 'scale(1.23)' }}
                                />
                              </button>
                            </ElegantTooltip>
                          </div>
                        )}

                    {/* Actions */}
                    <div className="flex-shrink-0 w-20 flex justify-end">
                      <Button
                        onClick={() => handleRemoveFromPortfolio(item.coingecko_id)}
                        size="sm"
                        variant="outline"
                        className={`rounded-xl p-2 transition-all duration-300 hover:scale-105 ${
                          isDarkMode
                            ? "text-red-300 border-red-700/50 hover:bg-red-900/20 hover:border-red-600/70"
                            : "text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                        }`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                      {/* Expanded Notification Setup Row */}
                      {expandedNotification === item.coingecko_id && (
                        <div className="w-full px-6 pb-6 pt-4 bg-gradient-to-br from-blue-50/90 to-slate-50/90 border-b border-blue-200/50 shadow-lg backdrop-blur-sm animate-fade-in-down rounded-b-xl relative">
                          {/* Close button */}
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setExpandedNotification(null);
                            }}
                            className="absolute top-2 right-2 p-1 rounded-full hover:bg-blue-200/80 transition-colors"
                            title="Close notification setup"
                            aria-label="Close notification setup"
                          >
                            <X className="w-4 h-4 text-blue-700" />
                          </button>
                          {/* Notification setup form (copied from CompactCoinRow) */}
                          <form 
                            className="space-y-2 animate-fade-in" 
                            onSubmit={handleNotificationSubmit}
                            onClick={e => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Bell className="w-5 h-5 text-blue-500" />
                              <h3 className="text-base font-bold text-blue-900">
                                Smart Alerts for {item.coin_symbol}
                              </h3>
                              {hasAlerts && (
                                <div className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                  Active
                                </div>
                              )}
            </div>
                            <div className="flex flex-row gap-3 overflow-x-auto pb-1">
                              <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50/80 border border-blue-100 flex-1 min-w-0">
                                <Activity className="w-4 h-4 text-red-500 flex-shrink-0" />
                                <ElasticSlider
                                  value={notifState.healthThreshold}
                                  onChange={v => setNotificationStates(prev => ({ ...prev, [item.coingecko_id]: { ...notifState, healthThreshold: v } }))}
                                  min={10}
                                  max={90}
                                  step={5}
                                  label="Health <"
                                  leftIcon={<Minus className="w-4 h-4" />}
                                  rightIcon={<Plus className="w-4 h-4" />}
                                  disabled={notifState.notificationLoading}
                                  isDarkMode={isDarkMode}
                                  className="flex-1"
                                />
          </div>
                              <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50/80 border border-blue-100 flex-1 min-w-0">
                                <Shield className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                <ElasticSlider
                                  value={notifState.consistencyThreshold}
                                  onChange={v => setNotificationStates(prev => ({ ...prev, [item.coingecko_id]: { ...notifState, consistencyThreshold: v } }))}
                                  min={10}
                                  max={90}
                                  step={5}
                                  label="Consistency <"
                                  leftIcon={<Minus className="w-4 h-4" />}
                                  rightIcon={<Plus className="w-4 h-4" />}
                                  disabled={notifState.notificationLoading}
                                  isDarkMode={isDarkMode}
                                  className="flex-1"
                                />
                              </div>
                              <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50/80 border border-blue-100 flex-1 min-w-0">
                                <TrendingDown className="w-4 h-4 text-orange-500 flex-shrink-0" />
                                <ElasticSlider
                                  value={notifState.priceDropThreshold}
                                  onChange={v => setNotificationStates(prev => ({ ...prev, [item.coingecko_id]: { ...notifState, priceDropThreshold: v } }))}
                                  min={5}
                                  max={50}
                                  step={5}
                                  label="Price drop >"
                                  unit="%"
                                  leftIcon={<Minus className="w-4 h-4" />}
                                  rightIcon={<Plus className="w-4 h-4" />}
                                  disabled={notifState.notificationLoading}
                                  isDarkMode={isDarkMode}
                                  className="flex-1"
                                />
                              </div>
                              <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50/80 border border-blue-100 flex-1 min-w-0">
                                <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                                <label className="flex items-center gap-2 flex-1 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={notifState.enableMigrationAlerts}
                                    onChange={e => setNotificationStates(prev => ({ ...prev, [item.coingecko_id]: { ...notifState, enableMigrationAlerts: e.target.checked } }))}
                                    className="w-4 h-4 accent-blue-500 rounded"
                                    disabled={notifState.notificationLoading}
                                  />
                                  <span className="text-xs font-medium text-blue-900">Migration & Delisting</span>
                                </label>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-blue-100 mt-2">
                              <div className="flex items-center gap-2 text-xs text-blue-700">
                                <Info className="w-4 h-4" />
                                <span>Alerts check every 30 minutes</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {notifState.notificationError && (
                                  <div className="text-red-600 text-xs font-medium">{notifState.notificationError}</div>
                                )}
                                {notifState.notificationSuccess && (
                                  <div className="text-green-600 text-xs font-medium">{notifState.notificationSuccess}</div>
                                )}
                                {notifState.removeAlarmsError && (
                                  <div className="text-red-600 text-xs font-medium">{notifState.removeAlarmsError}</div>
                                )}
                                {hasAlerts && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveAlarms(item.coingecko_id)}
                                    disabled={notifState.removeAlarmsLoading}
                                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-semibold shadow mr-2"
                                  >
                                    {notifState.removeAlarmsLoading ? 'Removing...' : 'Remove Alerts'}
                                  </button>
                                )}
                                <button
                                  type="submit"
                                  disabled={notifState.notificationLoading}
                                  className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-semibold shadow"
                                >
                                  {notifState.notificationLoading ? "Saving..." : "Save Alerts"}
                                </button>
                              </div>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* Expanded Alert Staking Row */}
                      {expandedAlert === item.coingecko_id && (
                        <div className="w-full px-6 pb-6 pt-4 bg-gradient-to-br from-yellow-50/95 via-amber-50/90 to-orange-50/95 dark:from-yellow-900/95 dark:via-amber-900/90 dark:to-orange-900/95 border-b border-yellow-200/60 dark:border-yellow-700/60 shadow-xl backdrop-blur-md animate-fade-in-down rounded-b-xl relative ring-1 ring-yellow-200/50 dark:ring-yellow-700/50">
                          {/* Close button */}
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setExpandedAlert(null);
                            }}
                            className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-slate-100/80 dark:hover:bg-slate-700/80 transition-all duration-200 hover:scale-110 group"
                            title="Close alert form"
                            aria-label="Close alert form"
                          >
                            <X className="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors" />
                          </button>
                          {/* Alert staking form (robust closed pool logic) */}
                          <form 
                            className="space-y-2 animate-fade-in" 
                            onSubmit={handleAlertSubmit}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <img
                                src="/Mega2.ico"
                                alt="Alert"
                                className="w-6 h-6 drop-shadow-sm"
                                style={{ transform: "scale(1.3)" }}
                              />
                              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                                Community Alert Staking Pool for {item.coin_symbol || item.coingecko_id.toUpperCase()}
                              </h3>
                              {alertState.hasUserStaked && (
                                <div className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-medium rounded-full border border-emerald-200 dark:border-emerald-700">
                                  Staked
                                </div>
                              )}
                              {alertState.verifiedAlerts && alertState.verifiedAlerts.includes(alertState.alertType) && (
                                <div className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 text-xs font-medium rounded-full border border-violet-200 dark:border-violet-700">
                                  Verified ✓
                                </div>
                              )}
                            </div>
                            {/* Alert type dropdown always visible */}
                            <div className="flex flex-row gap-3 overflow-x-auto pb-1 items-center">
                              <div className="flex items-center gap-2 p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 min-w-[220px] max-w-[220px] shadow-sm hover:shadow-md transition-all duration-200 hover:bg-white/90 dark:hover:bg-slate-800/90">
                                <div className="flex flex-col gap-2 flex-1">
                                  <div className="flex items-center gap-2">
                                    <select
                                      className="rounded-lg border px-3 py-2 text-xs focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 bg-white/90 dark:bg-slate-700/90 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-600 w-full transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-500"
                                      value={alertState.alertType}
                                      onChange={e => setAlertStates(prev => ({ ...prev, [item.coingecko_id]: { ...alertState, alertType: e.target.value } }))}
                                      disabled={alertState.loading}
                                      aria-label="Alert type"
                                    >
                                      <option value="migration">Migration</option>
                                      <option value="delisting">Delisting</option>
                                      <option value="rebrand">Rebrand</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                              {/* If pool is closed, show closed message inline next to dropdown */}
                              {closedStatusByType[item.coingecko_id]?.[alertState.alertType]?.closed && (
                                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-700/60 min-w-0 shadow-sm">
                                  <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">Pool Closed</span>
                                  <span className="text-xs text-amber-700 dark:text-amber-400">
                                    {closedStatusByType[item.coingecko_id]?.[alertState.alertType]?.reason || 'This alert pool is no longer accepting new stakes.'}
                                    {closedStatusByType[item.coingecko_id]?.[alertState.alertType]?.reason && closedStatusByType[item.coingecko_id]?.[alertState.alertType]?.reason?.toLowerCase().includes('verified') && ' It will be open again after the event launch.'}
                                  </span>
                                </div>
                              )}
                              {/* If pool is not closed, show the rest of the staking UI */}
                              {!closedStatusByType[item.coingecko_id]?.[alertState.alertType]?.closed && <>
                                {/* Proof Link Input */}
                                <div className="flex items-center gap-2 p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex-1 min-w-0 shadow-sm hover:shadow-md transition-all duration-200 hover:bg-white/90 dark:hover:bg-slate-800/90">
                                  <div className="flex flex-col gap-2 flex-1">
                                    <input
                                      type="url"
                                      className="rounded-lg border px-3 py-2 text-xs flex-1 focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 bg-white/90 dark:bg-slate-700/90 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-600 placeholder-slate-500 dark:placeholder-slate-400 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-500"
                                      placeholder="Proof link (tweet, news, etc)"
                                      value={alertState.proofLink}
                                      onChange={e => setAlertStates(prev => ({ ...prev, [item.coingecko_id]: { ...alertState, proofLink: e.target.value } }))}
                                      required
                                      disabled={alertState.loading || alertState.alreadyAlerted}
                                      aria-label="Proof link"
                                    />
                                  </div>
                                </div>
                                {/* Pool Status Card */}
                                <div className="flex items-center gap-2 p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex-1 min-w-0 shadow-sm hover:shadow-md transition-all duration-200 hover:bg-white/90 dark:hover:bg-slate-800/90">
                                  <div className="flex flex-col gap-1 flex-1">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1">
                                        <span role="img" aria-label="egg" className="text-sm">🥚</span>
                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Pool Status</span>
                                      </div>
                                      <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                        {poolStatusByCoin[item.coingecko_id] ? (
                                          poolStatusByCoin[item.coingecko_id].poolFilled ? "Filled!" : `${poolStatusByCoin[item.coingecko_id].totalEggs}/6`
                                        ) : (
                                          alertState.loading ? "Loading..." : "0/6"
                                        )}
                                      </span>
                                    </div>
                                    {/* Pool Progress Bar */}
                                    <div className="w-full bg-slate-200/60 dark:bg-slate-700/60 rounded-full h-2">
                                      <div
                                        className="bg-gradient-to-r from-blue-400 to-violet-500 h-2 rounded-full transition-all duration-500 shadow-sm"
                                        style={{
                                          width: poolStatusByCoin[item.coingecko_id]
                                            ? `${Math.min(100, (poolStatusByCoin[item.coingecko_id].totalEggs / 6) * 100)}%`
                                            : '0%',
                                        }}
                                      ></div>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                                      <span>
                                        {(() => {
                                          const ps = poolStatusByCoin[item.coingecko_id]
                                          if (ps) {
                                            const pending = Array.isArray(ps.pendingAlerts) ? ps.pendingAlerts : (ps.alerts || []).filter((a: any) => a.status === 'pending')
                                            const count = pending.length
                                            return `${count} staker${count !== 1 ? 's' : ''}`
                                          }
                                          return "No stakers"
                                        })()}
                                      </span>
                                      {(() => {
                                        const ps = poolStatusByCoin[item.coingecko_id]
                                        const hasPending = ps ? (ps.alerts || []).some((a: any) => a.user_id === user?.id && a.status === 'pending') : false
                                        return hasPending ? (
                                          <span className="text-green-600 font-medium">✓ You: 2🥚</span>
                                        ) : null
                                      })()}
                                    </div>
                                  </div>
                                </div>
                                {/* Egg Info & Submit */}
                                <div className="flex items-center gap-2 p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex-1 min-w-0 shadow-sm hover:shadow-md transition-all duration-200 hover:bg-white/90 dark:hover:bg-slate-800/90">
                                  <div className="flex flex-col gap-2 flex-1">
                                    {!((poolStatusByCoin[item.coingecko_id]?.alerts || []).some((a: any) => a.user_id === user?.id && a.status === 'pending')) && (
                                      <div className="flex items-center gap-1 text-xs text-slate-700 dark:text-slate-300">
                                        <span role="img" aria-label="egg" className="text-sm">🥚</span>
                                        <span className="font-medium">Stake 2 eggs</span>
                                        <span className="text-blue-500 dark:text-blue-400">• 2x if verified!</span>
                                      </div>
                                    )}
                                    <button
                                      type="submit"
                                      disabled={
                                        alertState.loading ||
                                        ((poolStatusByCoin[item.coingecko_id]?.alerts || []).some((a: any) => a.user_id === user?.id && a.status === 'pending')) ||
                                        poolStatusByCoin[item.coingecko_id]?.poolFilled
                                      }
                                      className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-xs font-semibold shadow-sm hover:shadow-md flex items-center justify-center gap-1"
                                    >
                                      {alertState.loading ? (
                                        "Staking..."
                                      ) : poolStatusByCoin[item.coingecko_id]?.poolFilled ? (
                                        <>
                                          <span>🔒</span>
                                          <span>Pool Filled</span>
                                        </>
                                      ) : alertState.hasUserStaked ? (
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
                              </>}
                            </div>
                            {/* Bottom Info Row: only show if pool is not closed */}
                            {!closedStatusByType[item.coingecko_id]?.[alertState.alertType]?.closed && (
                              <div className="flex items-center justify-between pt-2 border-t border-yellow-100 mt-2">
                                <div className="flex items-center gap-2 text-xs text-yellow-700">
                                  <Info className="w-4 h-4" />
                                  <span>Pools need 6 eggs to activate • Double rewards when an upcoming event is verified</span>
                                  <a
                                    href="/faqs"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-2 px-2 py-0.5 rounded-full bg-yellow-100 hover:bg-yellow-200 text-yellow-900 font-semibold transition-colors text-xs shadow-sm border border-yellow-200 underline underline-offset-2 decoration-yellow-500 hover:decoration-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                  >
                                    More info
                                  </a>
                                </div>
                                <div className="flex items-center gap-2">
                                  {alertState.error && (
                                    <div className="text-red-600 text-xs font-medium">{alertState.error}</div>
                                  )}
                                  {alertState.success && (
                                    <div className="text-green-600 text-xs font-medium">{alertState.success}</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </form>
                        </div>
                      )}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Elegant Footer */}
        <ElegantFooter isDarkMode={isDarkMode} />
      </div>

      {/* Animated Notification List */}
      {user && <AnimatedNotificationList user={user} isDarkMode={isDarkMode} />}
    </div>
  )
}
