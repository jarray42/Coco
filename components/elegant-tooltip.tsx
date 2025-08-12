"use client"

import React, { useState } from "react"
import { createPortal } from "react-dom"

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

  // Get the bounding rect of the trigger for portal positioning
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null)
  const triggerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (isVisible && triggerRef.current) {
      setTriggerRect(triggerRef.current.getBoundingClientRect())
    }
  }, [isVisible])

  // Calculate portal style
  const getPortalStyle = () => {
    if (!triggerRect) return { display: 'none' }
    let style: React.CSSProperties = { position: 'fixed', zIndex: 99999 }
    switch (position) {
      case 'top':
        style.left = triggerRect.left + triggerRect.width / 2
        style.top = triggerRect.top
        style.transform = 'translate(-50%, -100%)'
        break
      case 'bottom':
        style.left = triggerRect.left + triggerRect.width / 2
        style.top = triggerRect.bottom
        style.transform = 'translate(-50%, 0)'
        break
      case 'left':
        style.left = triggerRect.left
        style.top = triggerRect.top + triggerRect.height / 2
        style.transform = 'translate(-100%, -50%)'
        break
      case 'right':
        style.left = triggerRect.right
        style.top = triggerRect.top + triggerRect.height / 2
        style.transform = 'translate(0, -50%)'
        break
      default:
        break
    }
    return style
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      ref={triggerRef}
    >
      {children}
      {isVisible && typeof window !== 'undefined' && createPortal(
        <div style={getPortalStyle()}>
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
        </div>,
        document.body
      )}
    </div>
  )
}
