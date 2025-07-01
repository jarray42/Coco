"use client"

import { useState, useEffect } from "react"
import { ModernDeFiBackground } from "./modern-defi-background"
import { SiteHeader } from "./site-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sun, Moon, ArrowLeft, Edit3, Save, X, TrendingUp, Wallet } from "lucide-react"
import { getCurrentUser, type AuthUser } from "../utils/supabase-auth"
import { getUserPortfolio, updatePortfolioAmount, removeFromPortfolio, type PortfolioItem } from "../utils/portfolio"
import { fetchCoins } from "../utils/supabase"
import { calculateBeatScore, formatPrice, type CryptoData } from "../utils/beat-calculator"
import { ElegantPixelatedHeart } from "./elegant-pixelated-heart"
import Link from "next/link"

interface PortfolioItemWithData extends PortfolioItem {
  coinData?: CryptoData
  beatScore?: number
  totalValue?: number
}

export function PortfolioPage() {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [portfolio, setPortfolio] = useState<PortfolioItemWithData[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState("")

  useEffect(() => {
    loadUserAndPortfolio()
  }, [])

  const loadUserAndPortfolio = async () => {
    try {
      const { user } = await getCurrentUser()
      setUser(user as AuthUser | null)

      if (user) {
        const portfolioItems = await getUserPortfolio(user as AuthUser)
        const allCoins = await fetchCoins()

        // Enrich portfolio items with coin data
        const enrichedPortfolio = portfolioItems.map((item) => {
          const coinData = allCoins.find((coin) => coin.coingecko_id === item.coingecko_id)
          const beatScore = coinData ? calculateBeatScore(coinData) : 0
          const totalValue = coinData && item.amount ? coinData.price * item.amount : 0

          return {
            ...item,
            coinData,
            beatScore,
            totalValue,
          }
        })

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
    const result = await updatePortfolioAmount(user, coinId, amount)

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

  const totalPortfolioValue = portfolio.reduce((sum, item) => sum + (item.totalValue || 0), 0)

  if (loading) {
    return (
      <div className={`min-h-screen transition-all duration-1000 ${isDarkMode ? "dark" : ""}`}>
        <ModernDeFiBackground isDarkMode={isDarkMode} />
        <div className="relative z-10 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="text-4xl mb-4">🐔</div>
              <p className={`text-lg font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
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
        <div className="relative z-10 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="text-4xl mb-4">🔒</div>
              <h1 className={`text-2xl font-bold mb-4 ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                Please Sign In
              </h1>
              <p className={`text-lg mb-6 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                You need to be signed in to view your portfolio.
              </p>
              <Link href="/">
                <Button
                  className={`px-6 py-3 rounded-2xl font-semibold transition-all duration-300 ${
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

      <div className="relative z-10 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button
                variant="outline"
                className={`h-12 w-12 p-0 rounded-2xl transition-all duration-300 backdrop-blur-md shadow-lg border-0 ${
                  isDarkMode
                    ? "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70 hover:text-slate-100 hover:scale-105"
                    : "bg-white/80 text-slate-700 hover:bg-white/90 hover:text-slate-900 hover:scale-105"
                }`}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <SiteHeader isMainPage={false} isDarkMode={isDarkMode} />
          </div>

          <Button
            onClick={() => setIsDarkMode(!isDarkMode)}
            variant="outline"
            className={`h-12 px-6 rounded-2xl transition-all duration-300 backdrop-blur-md shadow-lg border-0 ${
              isDarkMode
                ? "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70 hover:text-slate-100 hover:scale-105"
                : "bg-white/80 text-slate-700 hover:bg-white/90 hover:text-slate-900 hover:scale-105"
            }`}
          >
            {isDarkMode ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
            {isDarkMode ? "Light" : "Dark"}
          </Button>
        </div>

        {/* Portfolio Header */}
        <div
          className={`rounded-3xl p-8 mb-8 ${
            isDarkMode ? "bg-slate-800/50" : "bg-white/80"
          } backdrop-blur-md shadow-lg border ${isDarkMode ? "border-slate-700/30" : "border-slate-200/50"}`}
        >
          <div className="flex items-center gap-4 mb-6">
            <Wallet className={`w-8 h-8 ${isDarkMode ? "text-yellow-400" : "text-yellow-600"}`} />
            <h1 className={`text-3xl font-bold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>My Portfolio</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className={`text-sm font-medium ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                Total Value
              </div>
              <div className={`text-2xl font-bold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                {formatPrice(totalPortfolioValue)}
              </div>
            </div>
            <div>
              <div className={`text-sm font-medium ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                Total Coins
              </div>
              <div className={`text-2xl font-bold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                {portfolio.length}
              </div>
            </div>
            <div>
              <div className={`text-sm font-medium ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                Avg Health Score
              </div>
              <div className={`text-2xl font-bold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                {portfolio.length > 0
                  ? Math.round(portfolio.reduce((sum, item) => sum + (item.beatScore || 0), 0) / portfolio.length)
                  : 0}
                /100
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio Items */}
        {portfolio.length === 0 ? (
          <div
            className={`text-center py-16 rounded-3xl ${
              isDarkMode ? "bg-slate-800/50" : "bg-white/80"
            } backdrop-blur-md shadow-lg border ${isDarkMode ? "border-slate-700/30" : "border-slate-200/50"}`}
          >
            <div className="text-6xl mb-4">🐣</div>
            <h2 className={`text-xl font-bold mb-2 ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
              Your portfolio is empty
            </h2>
            <p className={`${isDarkMode ? "text-slate-400" : "text-slate-600"} mb-6`}>
              Start building your portfolio by adding coins from the dashboard!
            </p>
            <Link href="/">
              <Button
                className={`px-6 py-3 rounded-2xl font-semibold transition-all duration-300 ${
                  isDarkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-sky-600 hover:bg-sky-700 text-white"
                }`}
              >
                Browse Coins
              </Button>
            </Link>
          </div>
        ) : (
          <div
            className={`rounded-3xl overflow-hidden ${
              isDarkMode ? "bg-slate-800/50" : "bg-white/80"
            } backdrop-blur-md shadow-lg border ${isDarkMode ? "border-slate-700/30" : "border-slate-200/50"}`}
          >
            {portfolio.map((item, index) => (
              <div
                key={item.coingecko_id}
                className={`p-6 border-b transition-all duration-300 hover:bg-opacity-80 ${
                  isDarkMode
                    ? index % 2 === 0
                      ? "bg-slate-900/20 border-slate-700/50"
                      : "bg-slate-900/30 border-slate-700/50"
                    : index % 2 === 0
                      ? "bg-white/50 border-slate-200/50"
                      : "bg-sky-50/30 border-slate-200/50"
                } ${index === portfolio.length - 1 ? "border-b-0" : ""}`}
              >
                <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 items-center">
                  {/* Coin Info */}
                  <div className="lg:col-span-2 flex items-center gap-4">
                    {item.coinData?.logo_url ? (
                      <img
                        src={item.coinData.logo_url || "/placeholder.svg"}
                        alt={`${item.coin_name} logo`}
                        className="w-12 h-12 rounded-2xl shadow-md"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br from-amber-500 to-orange-500 shadow-md">
                        {item.coin_symbol.slice(0, 2)}
                      </div>
                    )}
                    <div>
                      <div className={`font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                        {item.coin_name}
                      </div>
                      <div className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                        {item.coin_symbol.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="flex items-center gap-2">
                    {editingId === item.coingecko_id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.00000001"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className={`w-32 h-10 rounded-xl ${
                            isDarkMode
                              ? "bg-slate-700/50 border-slate-600/50 text-slate-100"
                              : "bg-white/80 border-slate-200/50 text-slate-900"
                          }`}
                        />
                        <Button
                          onClick={() => handleSaveAmount(item.coingecko_id)}
                          size="sm"
                          className="h-10 w-10 p-0 rounded-xl bg-green-600 hover:bg-green-700"
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => setEditingId(null)}
                          size="sm"
                          variant="outline"
                          className="h-10 w-10 p-0 rounded-xl"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                          {item.amount || 0}
                        </span>
                        <Button
                          onClick={() => handleEditAmount(item.coingecko_id, item.amount)}
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 rounded-xl"
                        >
                          <Edit3 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Price */}
                  <div>
                    <div className={`font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                      {formatPrice(item.coinData?.price || 0)}
                    </div>
                    {item.coinData?.price_change_24h && (
                      <div
                        className={`text-xs flex items-center gap-1 ${
                          item.coinData.price_change_24h >= 0
                            ? isDarkMode
                              ? "text-emerald-300"
                              : "text-emerald-700"
                            : isDarkMode
                              ? "text-red-300"
                              : "text-red-700"
                        }`}
                      >
                        <TrendingUp className={`w-3 h-3 ${item.coinData.price_change_24h < 0 ? "rotate-180" : ""}`} />
                        {Math.abs(item.coinData.price_change_24h).toFixed(2)}%
                      </div>
                    )}
                  </div>

                  {/* Total Value */}
                  <div>
                    <div className={`font-bold text-lg ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                      {formatPrice(item.totalValue || 0)}
                    </div>
                  </div>

                  {/* Health Score */}
                  <div className="flex items-center gap-3">
                    <ElegantPixelatedHeart score={item.beatScore || 0} isDarkMode={isDarkMode} size="sm" />
                    <span className={`font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                      {Math.round(item.beatScore || 0)}/100
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleRemoveFromPortfolio(item.coingecko_id)}
                      size="sm"
                      variant="outline"
                      className={`rounded-xl ${
                        isDarkMode
                          ? "text-red-300 border-red-700/50 hover:bg-red-900/20"
                          : "text-red-600 border-red-200 hover:bg-red-50"
                      }`}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
