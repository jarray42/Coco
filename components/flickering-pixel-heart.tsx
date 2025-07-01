"use client"

interface FlickeringPixelHeartProps {
  size?: "sm" | "md" | "lg"
  isDarkMode?: boolean
}

export function FlickeringPixelHeart({ size = "md", isDarkMode = false }: FlickeringPixelHeartProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  }

  const heartColor = isDarkMode ? "#4A5568" : "#A0AEC0" // Muted gray for skeleton

  return (
    <div className={`${sizeClasses[size]} relative animate-pulse`} style={{ animationDuration: "0.7s" }}>
      <svg viewBox="0 0 20 20" className="w-full h-full opacity-70">
        {/* Simplified Pixelated heart pattern for skeleton */}
        <rect x="4" y="2" width="2" height="2" fill={heartColor} />
        <rect x="6" y="2" width="2" height="2" fill={heartColor} />
        <rect x="12" y="2" width="2" height="2" fill={heartColor} />
        <rect x="14" y="2" width="2" height="2" fill={heartColor} />

        <rect x="2" y="4" width="2" height="2" fill={heartColor} />
        <rect x="4" y="4" width="12" height="2" fill={heartColor} />
        <rect x="16" y="4" width="2" height="2" fill={heartColor} />

        <rect x="2" y="6" width="16" height="2" fill={heartColor} />

        <rect x="4" y="8" width="12" height="2" fill={heartColor} />
        <rect x="6" y="10" width="8" height="2" fill={heartColor} />
        <rect x="8" y="12" width="4" height="2" fill={heartColor} />
        <rect x="9" y="14" width="2" height="2" fill={heartColor} />
      </svg>
      <div
        className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        INIT...
      </div>
    </div>
  )
}
