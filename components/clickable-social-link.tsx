"use client"

import type React from "react"
import { ExternalLink } from "lucide-react"
import { useState } from "react"

interface ClickableSocialLinkProps {
  url: string | null
  value: number | null
  icon: React.ReactNode
  label: string
  isDarkMode: boolean
  type: "github" | "twitter"
}

export function ClickableSocialLink({ url, value, icon, label, isDarkMode, type }: ClickableSocialLinkProps) {
  const [isHovered, setIsHovered] = useState(false)

  if (!value || value === 0 || isNaN(value)) {
    return (
      <div className="flex items-center gap-1 opacity-50 cursor-default">
        {icon}
        <span className="text-xs font-medium">-</span>
      </div>
    )
  }

  const formatNumber = (num: number) => {
    if (!num || isNaN(num) || num < 0) return "0"
    if (num >= 1e6) return (num / 1e6).toFixed(1) + "M"
    if (num >= 1e3) return (num / 1e3).toFixed(1) + "K"
    return Math.floor(num).toString()
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer")
    }
  }

  const baseClasses = `
    flex items-center gap-1 px-3 py-2 rounded-2xl transition-all duration-300 
    group relative shadow-sm
  `

  const colorClasses = isDarkMode
    ? `text-slate-300 ${url ? `hover:text-white hover:bg-blue-500/80 hover:scale-105` : ""}`
    : `text-slate-600 ${url ? `hover:text-white hover:bg-sky-500/80 hover:scale-105` : ""}`

  return (
    <button
      type="button"
      className={`${baseClasses} ${colorClasses} ${url ? "cursor-pointer" : "cursor-default"} ${
        isDarkMode ? "bg-slate-800/40" : "bg-slate-100/60"
      }`}
      onClick={url ? handleClick : undefined}
      onMouseEnter={() => setIsHovered(!!url)}
      onMouseLeave={() => setIsHovered(false)}
      title={url ? `Visit ${label} (${formatNumber(value)})` : `${label}: ${formatNumber(value)} (No URL)`}
      tabIndex={0}
    >
      <div className="flex items-center gap-1">
        {icon}
        <span className="text-xs font-semibold">{formatNumber(value)}</span>
        {url && (
          <ExternalLink
            className={`w-2 h-2 transition-all duration-200 ${
              isHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-1"
            }`}
          />
        )}
      </div>
    </button>
  )
}
