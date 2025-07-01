"use client"

import { useEffect, useState } from "react"

interface ElegantPixelatedHeartProps {
  score: number
  size?: "sm" | "md" | "lg"
  isDarkMode?: boolean
}

export function ElegantPixelatedHeart({ score, size = "md", isDarkMode = false }: ElegantPixelatedHeartProps) {
  const [isBeating, setIsBeating] = useState(false)

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  }

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-lg",
  }

  // Enhanced heart colors with more sophisticated gradients
  const getHeartColor = (score: number) => {
    const normalizedScore = Math.max(0, Math.min(100, score)) / 100

    if (normalizedScore < 0.25) return isDarkMode ? "#4A5568" : "#718096" // Gray (dead)
    if (normalizedScore < 0.5) return isDarkMode ? "#3182CE" : "#4299E1" // Blue (weak)
    if (normalizedScore < 0.75) return isDarkMode ? "#38A169" : "#48BB78" // Green (moderate)
    return isDarkMode ? "#E53E3E" : "#F56565" // Red (alive)
  }

  const getBeatInterval = (score: number) => {
    const normalizedScore = Math.max(0, Math.min(100, score))
    return Math.max(200, 1500 - (normalizedScore / 100) * 1200)
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setIsBeating(true)
      setTimeout(() => setIsBeating(false), 150)
    }, getBeatInterval(score))

    return () => clearInterval(interval)
  }, [score])

  const heartColor = getHeartColor(score)

  return (
    <div
      className={`${sizeClasses[size]} relative transition-all duration-200 ${isBeating ? "scale-125" : "scale-100"}`}
      style={{
        filter: `drop-shadow(0 0 8px ${heartColor}80)`,
      }}
    >
      {/* Pixelated heart SVG with enhanced design */}
      <svg
        viewBox="0 0 20 20"
        className="w-full h-full"
        style={{
          filter: `drop-shadow(0 0 6px ${heartColor}60)`,
        }}
      >
        {/* Enhanced pixelated heart pattern with more detail */}
        <rect x="4" y="2" width="2" height="2" fill={heartColor} />
        <rect x="6" y="2" width="2" height="2" fill={heartColor} />
        <rect x="12" y="2" width="2" height="2" fill={heartColor} />
        <rect x="14" y="2" width="2" height="2" fill={heartColor} />

        <rect x="2" y="4" width="2" height="2" fill={heartColor} />
        <rect x="4" y="4" width="2" height="2" fill={heartColor} />
        <rect x="6" y="4" width="2" height="2" fill={heartColor} />
        <rect x="8" y="4" width="2" height="2" fill={heartColor} />
        <rect x="10" y="4" width="2" height="2" fill={heartColor} />
        <rect x="12" y="4" width="2" height="2" fill={heartColor} />
        <rect x="14" y="4" width="2" height="2" fill={heartColor} />
        <rect x="16" y="4" width="2" height="2" fill={heartColor} />

        <rect x="2" y="6" width="2" height="2" fill={heartColor} />
        <rect x="4" y="6" width="2" height="2" fill={heartColor} />
        <rect x="6" y="6" width="2" height="2" fill={heartColor} />
        <rect x="8" y="6" width="2" height="2" fill={heartColor} />
        <rect x="10" y="6" width="2" height="2" fill={heartColor} />
        <rect x="12" y="6" width="2" height="2" fill={heartColor} />
        <rect x="14" y="6" width="2" height="2" fill={heartColor} />
        <rect x="16" y="6" width="2" height="2" fill={heartColor} />

        <rect x="4" y="8" width="2" height="2" fill={heartColor} />
        <rect x="6" y="8" width="2" height="2" fill={heartColor} />
        <rect x="8" y="8" width="2" height="2" fill={heartColor} />
        <rect x="10" y="8" width="2" height="2" fill={heartColor} />
        <rect x="12" y="8" width="2" height="2" fill={heartColor} />
        <rect x="14" y="8" width="2" height="2" fill={heartColor} />

        <rect x="6" y="10" width="2" height="2" fill={heartColor} />
        <rect x="8" y="10" width="2" height="2" fill={heartColor} />
        <rect x="10" y="10" width="2" height="2" fill={heartColor} />
        <rect x="12" y="10" width="2" height="2" fill={heartColor} />

        <rect x="8" y="12" width="2" height="2" fill={heartColor} />
        <rect x="10" y="12" width="2" height="2" fill={heartColor} />

        <rect x="9" y="14" width="2" height="2" fill={heartColor} />

        {/* Subtle highlight for 3D effect */}
        <rect x="6" y="6" width="1" height="1" fill="rgba(255,255,255,0.3)" />
        <rect x="12" y="6" width="1" height="1" fill="rgba(255,255,255,0.3)" />
      </svg>

      {/* Score text overlay - positioned in the center of the heart */}
      <div
        className={`absolute inset-0 flex items-center justify-center ${textSizes[size]} font-bold text-white`}
        style={{
          textShadow: `0 0 4px rgba(0,0,0,0.8), 0 0 8px ${heartColor}80`,
          marginTop: size === "lg" ? "2px" : size === "md" ? "1px" : "0px", // Slight adjustment for visual centering
        }}
      >
        {Math.round(score)}
      </div>

      {/* Pulsing glow effect */}
      {isBeating && (
        <div
          className="absolute inset-0 rounded-full animate-ping"
          style={{
            background: `radial-gradient(circle, ${heartColor}40 0%, transparent 70%)`,
          }}
        />
      )}
    </div>
  )
}
