"use client"

import { memo } from "react"
import { Users, TrendingUp, Star } from "lucide-react"
import type { CryptoData } from "../utils/beat-calculator"
import { formatNumber, formatPrice } from "../utils/beat-calculator"
import { ElegantPixelatedHeart } from "./elegant-pixelated-heart"
import { ClickableSocialLink } from "./clickable-social-link"
import Link from "next/link"
import { PortfolioWalletIcon } from "./portfolio-wallet-icon"
import type { AuthUser } from "../utils/supabase-auth"
import { CuteHeartTooltip } from "./cute-heart-tooltip"
import { ConsistencyScoreDisplay } from "./consistency-score-display"
import type { ConsistencyResult } from "../utils/consistency-calculator"
import Image from "next/image"

interface OptimizedCoinRowProps {
  data: CryptoData
  index: number
  isDarkMode: boolean
  beatScore: number
  consistencyScore?: number
  consistencyDetails?: ConsistencyResult
  user?: AuthUser | null
}

export const OptimizedCoinRow = memo(function OptimizedCoinRow({
  data,
  index,
  isDarkMode,
  beatScore,
  consistencyScore,
  consistencyDetails,
  user,
}: OptimizedCoinRowProps) {
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

  return (
    <div
      className={`flex items-center gap-3 px-6 py-3 transition-all duration-300 border-b min-w-max ${
        isDarkMode ? "border-slate-800/50" : "border-sky-100/50"
      } ${bgClass} hover:scale-[1.005] hover:shadow-md`}
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

      {/* Coin Info with Logo - Clickable */}
      <Link
        href={`/coin/${data.coingecko_id}`}
        className="flex-shrink-0 w-44 flex items-center gap-3 hover:opacity-80 transition-opacity"
        prefetch={false}
      >
        <div className="relative">
          {data.logo_url ? (
            <Image
              src={data.logo_url || "/placeholder.svg"}
              alt={`${data.name} logo`}
              width={32}
              height={32}
              className="w-8 h-8 rounded-xl shadow-sm transition-all duration-300 hover:scale-110"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = "none"
                e.currentTarget.nextElementSibling!.style.display = "flex"
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
        </div>
        <div className="min-w-0 flex-1">
          <div className={`font-semibold text-sm ${textClass} truncate`} title={data.name}>
            {data.name}
          </div>
          <div className={`text-xs ${mutedTextClass} uppercase font-medium tracking-wider truncate`}>{data.symbol}</div>
        </div>
      </Link>

      {/* Price - Clickable */}
      <Link
        href={`/coin/${data.coingecko_id}`}
        className="flex-shrink-0 w-28 flex items-center hover:opacity-80 transition-opacity"
        prefetch={false}
      >
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
      </Link>

      {/* Market Cap - Clickable */}
      <Link
        href={`/coin/${data.coingecko_id}`}
        className="flex-shrink-0 w-28 flex items-center hover:opacity-80 transition-opacity"
        prefetch={false}
      >
        <div
          className={`text-sm font-semibold ${textClass} truncate w-full`}
          title={`$${formatNumber(data.market_cap)}`}
        >
          {formatNumber(data.market_cap)}
        </div>
      </Link>

      {/* Volume - Clickable */}
      <Link
        href={`/coin/${data.coingecko_id}`}
        className="flex-shrink-0 w-28 flex items-center hover:opacity-80 transition-opacity"
        prefetch={false}
      >
        <div
          className={`text-sm font-semibold ${textClass} truncate w-full`}
          title={`$${formatNumber(data.volume_24h)}`}
        >
          {formatNumber(data.volume_24h)}
        </div>
      </Link>

      {/* GitHub Stars - NOT clickable to coin page */}
      <div className="flex-shrink-0 w-24 flex items-center">
        <ClickableSocialLink
          url={data.github_url}
          value={data.github_stars}
          icon={<Star className="w-3 h-3" />}
          label="GitHub Stars"
          isDarkMode={isDarkMode}
          type="github"
        />
      </div>

      {/* Twitter Followers - NOT clickable to coin page */}
      <div className="flex-shrink-0 w-24 flex items-center">
        <ClickableSocialLink
          url={data.twitter_url}
          value={data.twitter_followers}
          icon={<Users className="w-3 h-3" />}
          label="Twitter Followers"
          isDarkMode={isDarkMode}
          type="twitter"
        />
      </div>

      {/* Health Score - NOT clickable to coin page */}
      <div className="flex-shrink-0 w-32 flex items-center justify-center">
        <CuteHeartTooltip score={beatScore} isDarkMode={isDarkMode}>
          <ElegantPixelatedHeart score={beatScore} isDarkMode={isDarkMode} size="sm" />
        </CuteHeartTooltip>
      </div>

      {/* Consistency Score - COMPLETELY ISOLATED */}
      <div className="flex-shrink-0 w-32 flex items-center justify-center">
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
        <div className="flex-shrink-0 w-16 flex items-center justify-center">
          <PortfolioWalletIcon
            user={user}
            coinId={data.coingecko_id}
            coinName={data.name}
            coinSymbol={data.symbol}
            isDarkMode={isDarkMode}
          />
        </div>
      )}
    </div>
  )
})
