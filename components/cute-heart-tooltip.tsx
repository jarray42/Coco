"use client"

import type React from "react"
import { useState } from "react"

interface CuteHeartTooltipProps {
  children: React.ReactNode
  score: number
  isDarkMode: boolean
}

export function CuteHeartTooltip({ children, score, isDarkMode }: CuteHeartTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  const getHealthStatus = (score: number) => {
    if (score > 75) return { text: "HEALTHY!", emoji: "🐓", color: "#22c55e" }
    if (score > 50) return { text: "ACTIVE", emoji: "🥚", color: "#f59e0b" }
    if (score > 25) return { text: "WEAK", emoji: "🐣", color: "#3b82f6" }
    return { text: "UNHEALTHY", emoji: "💀", color: "#ef4444" }
  }

  const status = getHealthStatus(score)

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}

      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 z-[60] animate-in fade-in-0 zoom-in-95 duration-300">
          <div
            className={`px-3 py-2 rounded-2xl shadow-xl backdrop-blur-md border transition-all duration-300 ${
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
            <div className="text-center">
              {/* Cute emoji */}
              <div className="text-lg mb-1" style={{ animationDuration: "1s" }}>
                {status.emoji}
              </div>

              {/* Status text only */}
              <div className="text-xs font-bold" style={{ color: status.color }}>
                {status.text}
              </div>

              {/* Compact health bar */}
              <div className="w-16 mx-auto mt-2">
                <div
                  className={`w-full rounded-full h-2 shadow-inner relative overflow-hidden ${
                    isDarkMode ? "bg-slate-700/60" : "bg-slate-200/80"
                  }`}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out shadow-sm relative overflow-hidden"
                    style={{
                      width: `${score}%`,
                      background: `linear-gradient(90deg, 
              ${score <= 25 ? "#ef4444" : score <= 50 ? "#f59e0b" : score <= 75 ? "#3b82f6" : "#22c55e"} 0%, 
              ${score <= 25 ? "#f87171" : score <= 50 ? "#fbbf24" : score <= 75 ? "#60a5fa" : "#4ade80"} 100%)`,
                      boxShadow: `0 0 8px ${status.color}40`,
                    }}
                  />
                </div>
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

      <style jsx>{`
        @keyframes shine {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
      `}</style>
    </div>
  )
}
