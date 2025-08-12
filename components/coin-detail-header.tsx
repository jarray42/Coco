"use client"

import { ArrowLeft, Github, Twitter } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ElegantPixelatedHeart } from "./elegant-pixelated-heart"
import { ConsistencyScoreDisplay } from "./consistency-score-display"
import { formatNumber, formatPrice, safeNumber, safePercentage } from "../utils/beat-calculator"
import type { CryptoData } from "../utils/beat-calculator"


interface CoinDetailHeaderProps {
  coin: CryptoData
  beatScore: number
  consistencyData?: any | null
  isDarkMode: boolean
}

function CoinGeckoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
      <circle cx="9" cy="10" r="2" fill="currentColor" />
      <path
        d="M14 12c-1.5 0-2.5.5-3.5 1.5s-1 2-.5 2.5 1.5.5 2.5-.5S15 13.5 15 12"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function CoinDetailHeader({ coin, beatScore, consistencyData, isDarkMode }: CoinDetailHeaderProps) {
  // Safely handle price change with proper NaN checking
  const priceChange = safeNumber(coin.price_change_24h, 0)
  const safeBeatScore = safeNumber(beatScore, 0)
  const safeConsistencyScore = consistencyData ? safeNumber(consistencyData.consistency_score, 0) : 0

  const coingeckoLink = (coin.coingecko_url && coin.coingecko_url.trim() !== "")
    ? coin.coingecko_url
    : (coin.coingecko_id ? `https://www.coingecko.com/en/coins/${coin.coingecko_id}` : "")

  const linkButtonClass = `inline-flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 text-sm ${
    isDarkMode
      ? "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70 hover:text-slate-100"
      : "bg-white/80 text-slate-700 hover:bg-white/90 hover:text-slate-900"
  }`

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-4">
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
        <h1 className={`text-xl md:text-2xl font-bold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
          {coin.name} ({coin.symbol})
        </h1>
      </div>

      <div
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 rounded-2xl p-3 ${
          isDarkMode ? "bg-slate-800/50" : "bg-white/80"
        } backdrop-blur-md shadow-lg`}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            {coin.logo_url ? (
              <img
                src={coin.logo_url || "/placeholder.svg"}
                alt={`${coin.name} logo`}
                className="w-10 h-10 rounded-xl shadow-md"
                onError={(e) => {
                  e.currentTarget.style.display = "none"
                  const nextSibling = e.currentTarget.nextElementSibling
                  if (nextSibling instanceof HTMLElement) {
                    nextSibling.style.display = "flex"
                  }
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br from-amber-500 to-orange-500 shadow-md">
                {coin.symbol.slice(0, 2)}
              </div>
            )}
            <div className="w-10 h-10 rounded-xl hidden items-center justify-center text-white font-bold text-sm bg-gradient-to-br from-amber-500 to-orange-500 shadow-md">
              {coin.symbol.slice(0, 2)}
            </div>
          </div>
          <div>
            <div className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Rank</div>
            <div className={`text-base font-bold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
              #{safeNumber(coin.rank, 999999)}
            </div>
          </div>
        </div>

        <div>
          <div className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Price</div>
          <div className={`text-base font-bold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
            {formatPrice(coin.price)}
          </div>
          <div
            className={`text-xs inline-flex items-center gap-1 font-semibold px-2 py-1 rounded-xl ${
              priceChange >= 0
                ? isDarkMode
                  ? "text-emerald-300 bg-emerald-900/40"
                  : "text-emerald-700 bg-emerald-100/80"
                : isDarkMode
                  ? "text-red-300 bg-red-900/40"
                  : "text-red-700 bg-red-100/80"
            }`}
          >
            {Math.abs(priceChange).toFixed(2)}%
          </div>
        </div>

        <div>
          <div className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Market Cap</div>
          <div className={`text-base font-bold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
            ${formatNumber(coin.market_cap)}
          </div>
          <div className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
            Vol: ${formatNumber(coin.volume_24h)}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          {/* Health Score - Left Side */}
          <div className="flex flex-col items-center gap-1">
            <div className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Health</div>
            <ElegantPixelatedHeart score={safeBeatScore} size="md" isDarkMode={isDarkMode} />
          </div>

          {/* Consistency Score - Right Side */}
          {consistencyData && (
            <div className="flex flex-col items-center gap-1">
              <div className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                Consistency
              </div>
              <ConsistencyScoreDisplay
                score={safeConsistencyScore}
                details={consistencyData}
                size="md"
                isDarkMode={isDarkMode}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mt-4">
        {coin.twitter_url && (
          <a href={coin.twitter_url} target="_blank" rel="noopener noreferrer" className={linkButtonClass}>
            <Twitter className="w-4 h-4" />
            Twitter
            {coin.twitter_followers && <span className="ml-1">({formatNumber(coin.twitter_followers)})</span>}
          </a>
        )}



        {coin.github_url && coin.github_url.trim() !== "" && (
          <a href={coin.github_url} target="_blank" rel="noopener noreferrer" className={linkButtonClass}>
            <Github className="w-4 h-4" />
            GitHub
            {coin.github_stars && <span className="ml-1">({formatNumber(coin.github_stars)})</span>}
          </a>
        )}

        {coingeckoLink && (
          <a href={coingeckoLink} target="_blank" rel="noopener noreferrer" className={linkButtonClass}>
            <Image src="/CoinGecko_logo.png" alt="CoinGecko" width={24} height={24} className="w-6 h-6 -my-1" />
            CoinGecko
          </a>
        )}
      </div>
    </div>
  )
}
