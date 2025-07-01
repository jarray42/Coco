"use client"

import type React from "react"
import { useState } from "react"

interface ElegantTooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  position?: "top" | "bottom" | "left" | "right"
  isDarkMode: boolean
}

export function ElegantTooltip({ children, content, position = "top", isDarkMode }: ElegantTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  const positionClasses = {
    top: "bottom-full left-1/2 transform -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 transform -translate-x-1/2 mt-2",
    left: "right-full top-1/2 transform -translate-y-1/2 mr-2",
    right: "left-full top-1/2 transform -translate-y-1/2 ml-2",
  }

  const arrowClasses = {
    top: `absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent ${
      isDarkMode ? "border-t-slate-800/95" : "border-t-white/95"
    }`,
    bottom: `absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent ${
      isDarkMode ? "border-b-slate-800/95" : "border-b-white/95"
    }`,
    left: `absolute left-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent ${
      isDarkMode ? "border-l-slate-800/95" : "border-l-white/95"
    }`,
    right: `absolute right-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent ${
      isDarkMode ? "border-r-slate-800/95" : "border-r-white/95"
    }`,
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}

      {isVisible && (
        <div className={`absolute ${positionClasses[position]} z-50 animate-in fade-in-0 zoom-in-95 duration-200`}>
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl backdrop-blur-md border transition-all duration-300 ${
              isDarkMode
                ? "bg-slate-800/95 text-slate-100 border-slate-700/50"
                : "bg-white/95 text-slate-900 border-slate-200/50"
            }`}
          >
            {content}
            <div className={arrowClasses[position]} />
          </div>
        </div>
      )}
    </div>
  )
}
