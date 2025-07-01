"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { ElegantTooltip } from "./elegant-tooltip"
import { addToPortfolio, removeFromPortfolio, isInPortfolio } from "../utils/portfolio"
import type { AuthUser } from "../utils/supabase-auth"

interface PortfolioWalletIconProps {
  user: AuthUser | null
  coinId: string
  coinName: string
  coinSymbol: string
  isDarkMode: boolean
}

export function PortfolioWalletIcon({ user, coinId, coinName, coinSymbol, isDarkMode }: PortfolioWalletIconProps) {
  const [isInUserPortfolio, setIsInUserPortfolio] = useState(false)
  const [loading, setLoading] = useState(false)

  // Check if coin is in portfolio when component mounts or user changes
  useEffect(() => {
    if (user) {
      checkPortfolioStatus()
    } else {
      setIsInUserPortfolio(false)
    }
  }, [user, coinId])

  const checkPortfolioStatus = async () => {
    if (!user) return
    const inPortfolio = await isInPortfolio(user, coinId)
    setIsInUserPortfolio(inPortfolio)
  }

  const handleWalletClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      // Could show a login prompt here
      return
    }

    setLoading(true)

    try {
      if (isInUserPortfolio) {
        const result = await removeFromPortfolio(user, coinId)
        if (result.success) {
          setIsInUserPortfolio(false)
        }
      } else {
        const result = await addToPortfolio(user, coinId, coinName, coinSymbol)
        if (result.success) {
          setIsInUserPortfolio(true)
        }
      }
    } catch (error) {
      console.error("Error updating portfolio:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return null // Don't show wallet icon if user is not logged in
  }

  const walletColor = isInUserPortfolio
    ? "#FFD700" // Gold color when in portfolio
    : isDarkMode
      ? "#64748b" // Slate color for dark mode
      : "#94a3b8" // Lighter slate for light mode

  const tooltipMessage = isInUserPortfolio ? "Remove from portfolio" : "Add to portfolio"

  return (
    <ElegantTooltip
      content={
        <div className="text-center">
          <div className="text-sm font-semibold">{tooltipMessage}</div>
          {isInUserPortfolio && <div className="text-xs mt-1 opacity-80">✨ In Portfolio</div>}
        </div>
      }
      position="top"
      isDarkMode={isDarkMode}
    >
      <button
        onClick={handleWalletClick}
        disabled={loading}
        className={`p-2 rounded-xl transition-all duration-300 hover:scale-110 ${
          isDarkMode ? "hover:bg-slate-700/50" : "hover:bg-slate-100/80"
        } ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <img
          src={isInUserPortfolio ? "/full.ico" : "/empty.ico"}
          alt={isInUserPortfolio ? "In Portfolio" : "Add to Portfolio"}
          className={`w-5 h-5 transition-all duration-300 ${loading ? "animate-pulse" : ""}`}
        />
      </button>
    </ElegantTooltip>
  )
}
