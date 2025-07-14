"use client"

import { useState, useEffect } from "react"
import { ModernDeFiBackground } from "./modern-defi-background"
import { CoinDetailHeader } from "./coin-detail-header"
import { CoinHistoryChart } from "./coin-history-chart"
import { SiteHeader } from "./site-header"
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
  const [isLoadingHistory, setIsLoadingHistory] = useState(coinHistory.length <= 1)

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
    if (coinHistory.length > 1) {
      setIsLoadingHistory(false)
    }
  }, [coinHistory])

  const handleSignOut = () => {
    setUser(null)
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

        {/* Health Score - Top Priority */}
        <div className="mb-6">
          {isLoadingHistory ? (
            <div className={`h-64 rounded-2xl border backdrop-blur-sm flex items-center justify-center ${
              isDarkMode ? "bg-slate-800/40 border-slate-700/50" : "bg-white/70 border-sky-200/50"
            }`}>
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>Loading price history...</p>
              </div>
            </div>
          ) : (
            <CoinHistoryChart
              historyData={coinHistory}
              isDarkMode={isDarkMode}
              metric="health_score"
              title="Health Score History"
              color={isDarkMode ? "#22c55e" : "#16a34a"}
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
          ) : (
            <>
              <CoinHistoryChart
                historyData={coinHistory}
                isDarkMode={isDarkMode}
                metric="twitter_followers"
                title="Twitter Followers"
                color={isDarkMode ? "#3b82f6" : "#2563eb"}
              />
              <CoinHistoryChart
                historyData={coinHistory}
                isDarkMode={isDarkMode}
                metric="github_stars"
                title="GitHub Stars"
                color={isDarkMode ? "#f59e0b" : "#d97706"}
              />
            </>
          )}
        </div>

        {/* Development Metrics */}
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
                historyData={coinHistory}
                isDarkMode={isDarkMode}
                metric="github_forks"
                title="GitHub Forks"
                color={isDarkMode ? "#10b981" : "#059669"}
              />
              <CoinHistoryChart
                historyData={coinHistory}
                isDarkMode={isDarkMode}
                metric="volume_24h"
                title="24h Trading Volume"
                color={isDarkMode ? "#ec4899" : "#db2777"}
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
                historyData={coinHistory}
                isDarkMode={isDarkMode}
                metric="price"
                title="Price History"
                color={isDarkMode ? "#3b82f6" : "#0ea5e9"}
              />
              <CoinHistoryChart
                historyData={coinHistory}
                isDarkMode={isDarkMode}
                metric="market_cap"
                title="Market Capitalization"
                color={isDarkMode ? "#8b5cf6" : "#a855f7"}
              />
            </>
          )}
        </div>

        <div
          className={`p-4 rounded-2xl backdrop-blur-md shadow-lg mt-6 border ${
            isDarkMode ? "bg-slate-800/50 border-slate-700/30" : "bg-white/80 border-slate-200/50"
          }`}
        >
          <h3 className={`text-base font-semibold mb-3 ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
            About {coin.name}
          </h3>
          <p className={`${isDarkMode ? "text-slate-300" : "text-slate-600"} leading-relaxed text-sm`}>
            {coin.name} ({coin.symbol}) is currently ranked #{coin.rank} by market cap. The coin has a health score of{" "}
            {Math.round(beatScore)}/100 based on its market activity, developer engagement, and community metrics.
          </p>
          <div className="mt-4">
            <h4 className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
              Key Metrics
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ul className={`space-y-1 ${isDarkMode ? "text-slate-300" : "text-slate-600"} text-sm`}>
                <li className="flex justify-between">
                  <span>GitHub Stars:</span>
                  <span className="font-semibold">
                    {coin.github_stars ? coin.github_stars.toLocaleString() : "N/A"}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>GitHub Forks:</span>
                  <span className="font-semibold">
                    {coin.github_forks ? coin.github_forks.toLocaleString() : "N/A"}
                  </span>
                </li>
              </ul>
              <ul className={`space-y-1 ${isDarkMode ? "text-slate-300" : "text-slate-600"} text-sm`}>
                <li className="flex justify-between">
                  <span>Twitter Followers:</span>
                  <span className="font-semibold">
                    {coin.twitter_followers ? coin.twitter_followers.toLocaleString() : "N/A"}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>24h Volume:</span>
                  <span className="font-semibold">${coin.volume_24h ? coin.volume_24h.toLocaleString() : "N/A"}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}