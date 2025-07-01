"use client"

import { useState, useEffect } from "react"
import { ModernDeFiBackground } from "./modern-defi-background"
import { SiteHeader } from "./site-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sun, Moon, ArrowLeft, Edit3, Save, X, TrendingUp, Trash2, Star, Users, ArrowUpDown } from "lucide-react"
import { getCurrentUser, type AuthUser } from "../utils/supabase-auth"
import { getUserPortfolio, updatePortfolioAmount, removeFromPortfolio, type PortfolioItem } from "../utils/portfolio"
import { getAllCoinsData } from "../actions/fetch-all-coins"
import { calculateBeatScore, formatPrice, formatNumber, type CryptoData } from "../utils/beat-calculator"
import { ElegantPixelatedHeart } from "./elegant-pixelated-heart"
import { UserMenu } from "./user-menu"
import { ElegantAIPortfolioAdvisor } from "./elegant-ai-portfolio-advisor"
import Link from "next/link"
import Image from "next/image"

interface PortfolioItemWithData extends PortfolioItem {
  coinData?: CryptoData
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

  useEffect(() => {
    loadUserAndPortfolio()
  }, [])

  const loadUserAndPortfolio = async () => {
    try {
      console.log("Loading user and portfolio...")
      const { user } = await getCurrentUser()
      setUser(user as AuthUser | null)

      if (user) {
        console.log("User found, loading portfolio...")
        const portfolioItems = await getUserPortfolio(user as AuthUser)
        console.log("Portfolio items:", portfolioItems)

        const allCoins = await getAllCoinsData()
        console.log("All coins loaded:", allCoins.length)

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
  const sortedPortfolio = [...portfolio].sort((a, b) => {
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

      <div className="relative z-10 max-w-7xl mx-auto p-3 sm:p-4 lg:p-6">
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

            <UserMenu user={user} isDarkMode={isDarkMode} onSignOut={handleSignOut} />
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                Total Value
              </div>
              <div className={`text-xl font-bold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                {totalPortfolioValue > 0 ? formatPrice(totalPortfolioValue) : "$0.00"}
              </div>
            </div>
            <div>
              <div className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                Total Coins
              </div>
              <div className={`text-xl font-bold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                {portfolio.length}
              </div>
            </div>
            <div>
              <div className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                Avg Health Score
              </div>
              <div className={`text-xl font-bold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                {portfolio.length > 0
                  ? Math.round(portfolio.reduce((sum, item) => sum + (item.beatScore || 0), 0) / portfolio.length)
                  : 0}
                /100
              </div>
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

              <div className="flex-shrink-0 w-24 flex items-center justify-center">
                <span>Social</span>
              </div>

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
                <span>Health Score</span>
                {getSortTriangle("healthScore")}
              </Button>

              <div className="flex-shrink-0 w-20 flex items-center justify-center">
                <span>Actions</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-max">
                {sortedPortfolio.map((item, index) => (
                  <div
                    key={item.coingecko_id}
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

                    {/* Social Info */}
                    <div className="flex-shrink-0 w-24 flex items-center gap-1">
                      <div className="flex flex-col gap-1">
                        {item.coinData?.github_stars && (
                          <div
                            className={`flex items-center gap-1 text-xs px-1 py-0.5 rounded-lg ${
                              isDarkMode ? "bg-slate-700/50 text-slate-300" : "bg-slate-100/80 text-slate-600"
                            }`}
                          >
                            <Star className="w-2.5 h-2.5" />
                            {formatNumber(item.coinData.github_stars)}
                          </div>
                        )}
                        {item.coinData?.twitter_followers && (
                          <div
                            className={`flex items-center gap-1 text-xs px-1 py-0.5 rounded-lg ${
                              isDarkMode ? "bg-slate-700/50 text-slate-300" : "bg-slate-100/80 text-slate-600"
                            }`}
                          >
                            <Users className="w-2.5 h-2.5" />
                            {formatNumber(item.coinData.twitter_followers)}
                          </div>
                        )}
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
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
