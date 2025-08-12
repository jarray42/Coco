"use client"

import { useState, useEffect } from "react"
import { ModernDeFiBackground } from "./modern-defi-background"
import { CoinDetailHeader } from "./coin-detail-header"
import { CoinHistoryChart } from "./coin-history-chart"
import { GitHubCombinedChart } from "./github-combined-chart"
import { SiteHeader } from "./site-header"
import { ElegantFooter } from "./elegant-footer"
import type { CryptoData } from "../utils/beat-calculator"
import type { CoinHistoryData } from "../actions/fetch-coin-history"

import { Button } from "@/components/ui/button"
import { Sun, Moon } from "lucide-react"
import { getCurrentUser, onAuthStateChange, type AuthUser } from "../utils/supabase-auth"
import { UserMenu } from "./user-menu"

interface CoinDetailPageProps {
  coin: CryptoData
  coinHistory: CoinHistoryData[]
  beatScore: number
  consistencyData?: any | null
}

export function CoinDetailPage({ coin, coinHistory, beatScore, consistencyData }: CoinDetailPageProps) {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(coinHistory.length === 0)
  const [historyPeriod, setHistoryPeriod] = useState<7 | 30>(7)
  const [currentCoinHistory, setCurrentCoinHistory] = useState<CoinHistoryData[]>(coinHistory)

  useEffect(() => {
    // Get initial user
    getCurrentUser().then(({ user }) => {
      setUser(user as AuthUser | null)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = onAuthStateChange((user) => {
      setUser(user)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Check if we have sufficient history data
  useEffect(() => {
    if (coinHistory.length > 0) {
      setIsLoadingHistory(false)
      setCurrentCoinHistory(coinHistory)
    } else {
      setIsLoadingHistory(true)
      setCurrentCoinHistory([])
    }
  }, [coinHistory])

  const handleSignOut = () => {
    setUser(null)
  }

  const handleHistoryPeriodChange = async (period: 7 | 30) => {
    if (period === historyPeriod) return
    
    setHistoryPeriod(period)
    setIsLoadingHistory(true)
    
    try {
      // Fetch new history data from Bunny CDN
      const response = await fetch(`/api/coin-history?coinId=${coin.coingecko_id}&days=${period}`)
      if (response.ok) {
        const data = await response.json()
        setCurrentCoinHistory(data.history || [])
      } else {
        console.error('Failed to fetch history data')
        setCurrentCoinHistory([])
      }
    } catch (error) {
      console.error('Error fetching history data:', error)
      setCurrentCoinHistory([])
    } finally {
      setIsLoadingHistory(false)
    }
  }

  return (
    <div className={`min-h-screen transition-all duration-1000 ${isDarkMode ? "dark" : ""}`}>
      <ModernDeFiBackground isDarkMode={isDarkMode} />

      <div className="relative z-10 max-w-6xl mx-auto p-3 sm:p-4 lg:p-6">
        {/* Top Header with Logo and Dark Mode Toggle */}
        <div className="flex items-center justify-between mb-4">
          <SiteHeader isMainPage={false} isDarkMode={isDarkMode} />
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

            {user && <UserMenu user={user} isDarkMode={isDarkMode} onSignOut={handleSignOut} />}
          </div>
        </div>

        <CoinDetailHeader coin={coin} beatScore={beatScore} consistencyData={consistencyData} isDarkMode={isDarkMode} />

        {/* History Period Toggle */}
        <div className="flex justify-end mb-4">
          <div className={`flex rounded-xl p-1 backdrop-blur-md shadow-lg border ${
            isDarkMode ? "bg-slate-800/60 border-slate-700/50" : "bg-white/80 border-slate-200/50"
          }`}>
            <button
              onClick={() => handleHistoryPeriodChange(7)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                historyPeriod === 7
                  ? isDarkMode
                    ? "bg-slate-700 text-slate-100 shadow-md"
                    : "bg-white text-slate-900 shadow-md"
                  : isDarkMode
                    ? "text-slate-300 hover:text-slate-100"
                    : "text-slate-600 hover:text-slate-900"
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => handleHistoryPeriodChange(30)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                historyPeriod === 30
                  ? isDarkMode
                    ? "bg-slate-700 text-slate-100 shadow-md"
                    : "bg-white text-slate-900 shadow-md"
                  : isDarkMode
                    ? "text-slate-300 hover:text-slate-100"
                    : "text-slate-600 hover:text-slate-900"
              }`}
            >
              30 Days
            </button>
          </div>
        </div>

        {/* Health Score & Market Cap Charts Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Health Score Chart */}
          {isLoadingHistory ? (
            <div className={`h-64 rounded-2xl border backdrop-blur-sm flex items-center justify-center ${
              isDarkMode ? "bg-slate-800/40 border-slate-700/50" : "bg-white/70 border-sky-200/50"
            }`}>
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>Loading price history...</p>
              </div>
            </div>
          ) : currentCoinHistory.length === 0 ? (
            <div className={`h-64 rounded-2xl border backdrop-blur-sm flex items-center justify-center ${
              isDarkMode ? "bg-slate-800/40 border-slate-700/50" : "bg-white/70 border-sky-200/50"
            }`}>
              <div className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>No historical data available</p>
                <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Historical data will appear here when available</p>
              </div>
            </div>
          ) : (
            <CoinHistoryChart
              historyData={currentCoinHistory}
              isDarkMode={isDarkMode}
              metric="health_score"
              title="Health Score History"
              color={isDarkMode ? "#22c55e" : "#16a34a"}
            />
          )}

          {/* Market Cap Chart */}
          {isLoadingHistory ? (
            <div className={`h-64 rounded-2xl border backdrop-blur-sm flex items-center justify-center ${
              isDarkMode ? "bg-slate-800/40 border-slate-700/50" : "bg-white/70 border-sky-200/50"
            }`}>
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>Loading market cap...</p>
              </div>
            </div>
          ) : currentCoinHistory.length === 0 ? (
            <div className={`h-64 rounded-2xl border backdrop-blur-sm flex items-center justify-center ${
              isDarkMode ? "bg-slate-800/40 border-slate-700/50" : "bg-white/70 border-sky-200/50"
            }`}>
              <div className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>No market cap data</p>
                <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Market cap data will appear here when available</p>
              </div>
            </div>
          ) : (
            <CoinHistoryChart
              historyData={currentCoinHistory}
              isDarkMode={isDarkMode}
              metric="market_cap"
              title="Market Capitalization"
              color={isDarkMode ? "#8b5cf6" : "#a855f7"}
            />
          )}
        </div>

        {/* Social Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {isLoadingHistory ? (
            <>
              <div className={`h-64 rounded-2xl border backdrop-blur-sm flex items-center justify-center ${
                isDarkMode ? "bg-slate-800/40 border-slate-700/50" : "bg-white/70 border-sky-200/50"
              }`}>
                <div className="text-center">
                  <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className={`text-xs ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>Loading...</p>
                </div>
              </div>
              <div className={`h-64 rounded-2xl border backdrop-blur-sm flex items-center justify-center ${
                isDarkMode ? "bg-slate-800/40 border-slate-700/50" : "bg-white/70 border-sky-200/50"
              }`}>
                <div className="text-center">
                  <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className={`text-xs ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>Loading...</p>
                </div>
              </div>
            </>
          ) : currentCoinHistory.length === 0 ? (
            <>
              <div className={`h-64 rounded-2xl border backdrop-blur-sm flex items-center justify-center ${
                isDarkMode ? "bg-slate-800/40 border-slate-700/50" : "bg-white/70 border-sky-200/50"
              }`}>
                <div className="text-center">
                  <div className="text-2xl mb-1">📊</div>
                  <p className={`text-xs ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>No data</p>
                </div>
              </div>
              <div className={`h-64 rounded-2xl border backdrop-blur-sm flex items-center justify-center ${
                isDarkMode ? "bg-slate-800/40 border-slate-700/50" : "bg-white/70 border-sky-200/50"
              }`}>
                <div className="text-center">
                  <div className="text-2xl mb-1">📊</div>
                  <p className={`text-xs ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>No data</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <CoinHistoryChart
                historyData={currentCoinHistory}
                isDarkMode={isDarkMode}
                metric="twitter_followers"
                title="Twitter Followers"
                color={isDarkMode ? "#3b82f6" : "#2563eb"}
              />
              <GitHubCombinedChart
                historyData={currentCoinHistory}
                isDarkMode={isDarkMode}
                title="GitHub Activity"
              />
            </>
          )}
        </div>

        {/* Market Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {isLoadingHistory ? (
            <>
              <div className={`h-64 rounded-2xl border backdrop-blur-sm flex items-center justify-center ${
                isDarkMode ? "bg-slate-800/40 border-slate-700/50" : "bg-white/70 border-sky-200/50"
              }`}>
                <div className="text-center">
                  <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className={`text-xs ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>Loading...</p>
                </div>
              </div>
              <div className={`h-64 rounded-2xl border backdrop-blur-sm flex items-center justify-center ${
                isDarkMode ? "bg-slate-800/40 border-slate-700/50" : "bg-white/70 border-sky-200/50"
              }`}>
                <div className="text-center">
                  <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className={`text-xs ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>Loading...</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <CoinHistoryChart
                historyData={currentCoinHistory}
                isDarkMode={isDarkMode}
                metric="volume_24h"
                title="24h Trading Volume"
                color={isDarkMode ? "#ec4899" : "#db2777"}
              />
              <CoinHistoryChart
                historyData={currentCoinHistory}
                isDarkMode={isDarkMode}
                metric="price"
                title="Price History"
                color={isDarkMode ? "#3b82f6" : "#0ea5e9"}
              />
            </>
          )}
        </div>

        {/* Additional Market Metrics */}
        {/* Removed the separate full-width market cap chart section as it is now beside health score */}


        {/* Elegant Footer */}
        <ElegantFooter isDarkMode={isDarkMode} />
      </div>
    </div>
  )
}