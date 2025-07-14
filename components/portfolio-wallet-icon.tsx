"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { ElegantTooltip } from "./elegant-tooltip"
import { addToPortfolio, removeFromPortfolio, isInPortfolio } from "../utils/portfolio"
import type { AuthUser } from "../utils/supabase-auth"

interface PortfolioWalletIconProps {
  user: AuthUser | null
  coinId: string
  coinName: string
  coinSymbol: string
  isDarkMode: boolean
  // Batch-loaded portfolio status for better performance
  inPortfolio?: boolean | undefined
}

export function PortfolioWalletIcon({ user, coinId, coinName, coinSymbol, isDarkMode, inPortfolio = false }: PortfolioWalletIconProps) {
  // Initialize with batch data immediately to avoid neutral state
  const [isInUserPortfolio, setIsInUserPortfolio] = useState(inPortfolio)
  const [loading, setLoading] = useState(false)
  const hasCheckedRef = useRef(false)

  // Update portfolio status when batch data changes
  useEffect(() => {
    if (inPortfolio !== undefined) {
      setIsInUserPortfolio(inPortfolio)
    }
  }, [inPortfolio])

  // Only check portfolio status if we don't have batch data and haven't checked yet
  useEffect(() => {
    if (user && !hasCheckedRef.current && inPortfolio === undefined) {
      // Only check if we don't have batch data
      hasCheckedRef.current = true
      setLoading(true)
      isInPortfolio(user, coinId)
        .then((result) => {
          setIsInUserPortfolio(result)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [user, coinId, inPortfolio])

  // Show loading state when batch data is not yet available
  if (inPortfolio === undefined) {
    return (
      <div className="flex-shrink-0 w-12 flex items-center justify-center ml-2">
        <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  if (!user) {
    return null // Don't show wallet icon if user is not logged in
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
      
      // Invalidate user data cache to reflect the change
      const keysToRemove: string[] = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && key.startsWith(`user_data_${user.id}_`)) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => sessionStorage.removeItem(key))
      
    } catch (error) {
      console.error("Error updating portfolio:", error)
    } finally {
      setLoading(false)
    }
  }

  const walletColor = isInUserPortfolio
    ? "#FFD700" // Gold color when in portfolio
    : isDarkMode
      ? "#64748b" // Slate color for dark mode
      : "#94a3b8" // Lighter slate for light mode

  const tooltipMessage = isInUserPortfolio ? "Remove from portfolio" : "Add to portfolio"

  return (
    <div className="flex-shrink-0 w-12 flex items-center justify-center ml-2">
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
            className={`w-6 h-6 transition-all duration-300 ${loading ? "animate-pulse" : ""}`}
          />
        </button>
      </ElegantTooltip>
    </div>
  )
}
