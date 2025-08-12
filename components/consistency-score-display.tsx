"use client"

import Image from "next/image"
import { useState, useMemo } from "react"


interface ConsistencyScoreDisplayProps {
  score: number
  details?: any
  isDarkMode: boolean
  size?: "sm" | "md" | "lg"
}

export function ConsistencyScoreDisplay({ score, details, isDarkMode, size = "md" }: ConsistencyScoreDisplayProps) {
  const [isVisible, setIsVisible] = useState(false)

  // Memoize the silo icon to prevent unnecessary recalculations
  const siloIcon = useMemo(() => {
    if (score >= 86) return "/consistency-icons/s6.png" // Full silo with sparkles
    if (score >= 71) return "/consistency-icons/s5.png" // High grain level
    if (score >= 51) return "/consistency-icons/s4.png" // Good grain level
    if (score >= 31) return "/consistency-icons/s3.png" // Moderate grain level
    if (score >= 15) return "/consistency-icons/s2.png" // Low grain level
    return "/consistency-icons/s1.png" // Empty silo with spider web
  }, [score])

  const iconSize = useMemo(() => ({
    sm: { width: 32, height: 32, fontSize: "text-lg", scoreSize: "text-base" },
    md: { width: 40, height: 40, fontSize: "text-xl", scoreSize: "text-lg" },
    lg: { width: 48, height: 48, fontSize: "text-2xl", scoreSize: "text-xl" },
  }), [])

  // Calculate increased overlap position (17% instead of 13%) and upward offset
  const overlapOffset = useMemo(() => ({
    sm: Math.round(32 * 0.17), // 17% of 32px = ~5px (was 4px)
    md: Math.round(40 * 0.17), // 17% of 40px = ~7px (was 5px)
    lg: Math.round(48 * 0.17), // 17% of 48px = ~8px (was 6px)
  }), [])

  // Upward offset to move score slightly up
  const upwardOffset = useMemo(() => ({
    sm: 2, // 2px up
    md: 3, // 3px up
    lg: 4, // 4px up
  }), [])

  // Simplified description - only first part
  const siloDescription = useMemo(() => {
    if (score >= 86) return "Exceptional Consistency"
    if (score >= 71) return "High Consistency"
    if (score >= 51) return "Good Consistency"
    if (score >= 31) return "Moderate Consistency"
    if (score >= 15) return "Low Consistency"
    return "Poor Consistency"
  }, [score])

  // Get gradient colors based on score with more shine for higher scores
  const progressGradient = useMemo(() => {
    if (score >= 80) return "from-emerald-300 via-emerald-400 to-emerald-500"
    if (score >= 60) return "from-yellow-300 via-yellow-400 to-amber-500"
    if (score >= 40) return "from-orange-300 via-orange-400 to-red-400"
    return "from-red-300 via-red-400 to-red-500"
  }, [score])

  // Get shine intensity based on score
  const shineIntensity = useMemo(() => {
    if (score >= 80) return "via-white/50"
    if (score >= 60) return "via-white/40"
    if (score >= 40) return "via-white/30"
    return "via-white/20"
  }, [score])

  return (
    <div
      className="relative inline-block"
      onMouseEnter={(e) => {
        e.stopPropagation()
        setIsVisible(true)
      }}
      onMouseLeave={(e) => {
        e.stopPropagation()
        setIsVisible(false)
      }}
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
      }}
    >
      {/* Main Consistency Badge - Professional Overlapping Design */}
      <div className="relative transition-all duration-300 hover:scale-110 cursor-help">
        {/* Silo Icon */}
        <div className="relative">
          <Image
            src={siloIcon || "/placeholder.svg"}
            alt={`Consistency Level`}
            width={iconSize[size].width}
            height={iconSize[size].height}
            className="object-contain drop-shadow-lg"
            loading="lazy"
            priority={false}
          />

          {/* Professional Score Number - Increased Overlap and Moved Up */}
          <div
            className="absolute z-5"
            style={{
              right: `${iconSize[size].width - overlapOffset[size]}px`, // Increased overlap (17% instead of 13%)
              top: `calc(50% - ${upwardOffset[size]}px)`, // Moved slightly upward
              transform: "translateY(-50%)",
            }}
          >
            <div
              className={`
                ${iconSize[size].scoreSize} 
                font-black 
                ${isDarkMode ? "text-slate-100" : "text-slate-900"}
                tracking-tight
                leading-none
              `}
              style={{
                textShadow: isDarkMode
                  ? `
                    -2px -2px 0 rgba(0,0,0,0.8),
                    2px -2px 0 rgba(0,0,0,0.8),
                    -2px 2px 0 rgba(0,0,0,0.8),
                    2px 2px 0 rgba(0,0,0,0.8),
                    0 0 8px rgba(0,0,0,0.9),
                    0 0 16px rgba(255,255,255,0.1)
                  `
                  : `
                    -2px -2px 0 rgba(255,255,255,0.9),
                    2px -2px 0 rgba(255,255,255,0.9),
                    -2px 2px 0 rgba(255,255,255,0.9),
                    2px 2px 0 rgba(255,255,255,0.9),
                    0 0 8px rgba(255,255,255,0.8),
                    0 0 16px rgba(0,0,0,0.1)
                  `,
                fontFamily: "system-ui, -apple-system, sans-serif",
                fontWeight: "900",
              }}
            >
              {Math.round(score)}
            </div>
          </div>

          {/* Subtle Glow Effect */}
          <div className="absolute inset-0 rounded-full opacity-0 hover:opacity-20 transition-opacity duration-300 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 blur-md -z-10" />
        </div>
      </div>

      {/* Compact Professional Tooltip */}
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 z-[100] animate-in fade-in-0 zoom-in-95 duration-300">
          <div
            className={`px-4 py-4 rounded-2xl shadow-2xl backdrop-blur-md border transition-all duration-300 w-[180px] ${
              isDarkMode
                ? "bg-slate-800/95 text-slate-100 border-slate-700/50"
                : "bg-white/95 text-slate-900 border-slate-200/50"
            }`}
            style={{
              background: isDarkMode
                ? `linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)`
                : `linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)`,
            }}
          >
            {/* Meaningful Description */}
            <div className="text-center">
              <div className={`text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                {score >= 86 ? "Devs delivering consistently" :
                 score >= 71 ? "Team active and engaged" :
                 score >= 51 ? "Moderate team activity" :
                 score >= 31 ? "Intermittent team updates" :
                 score >= 15 ? "Minimal team activity" :
                 "Team inactive or silent"}
              </div>
            </div>

            {/* Tooltip arrow */}
            <div
              className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent ${
                isDarkMode ? "border-t-slate-800/95" : "border-t-white/95"
              }`}
            />
          </div>
        </div>
      )}
    </div>
  )
}