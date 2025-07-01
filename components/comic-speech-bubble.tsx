"use client"

import type React from "react"

import { useState } from "react"

interface ComicSpeechBubbleProps {
  children: React.ReactNode
  trigger: React.ReactNode
  position?: "top" | "bottom" | "left" | "right"
  variant?: "pow" | "alive" | "dead" | "info"
}

export function ComicSpeechBubble({ children, trigger, position = "top", variant = "info" }: ComicSpeechBubbleProps) {
  const [isVisible, setIsVisible] = useState(false)

  const variantStyles = {
    pow: "bg-yellow-400 border-yellow-600 text-black font-black",
    alive: "bg-green-400 border-green-600 text-black font-bold",
    dead: "bg-red-400 border-red-600 text-white font-bold",
    info: "bg-blue-400 border-blue-600 text-white font-semibold",
  }

  const bubblePositions = {
    top: "bottom-full left-1/2 transform -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 transform -translate-x-1/2 mt-2",
    left: "right-full top-1/2 transform -translate-y-1/2 mr-2",
    right: "left-full top-1/2 transform -translate-y-1/2 ml-2",
  }

  const tailPositions = {
    top: "top-full left-1/2 transform -translate-x-1/2 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent",
    bottom:
      "bottom-full left-1/2 transform -translate-x-1/2 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent",
    left: "left-full top-1/2 transform -translate-y-1/2 border-t-8 border-b-8 border-l-8 border-t-transparent border-b-transparent",
    right:
      "right-full top-1/2 transform -translate-y-1/2 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent",
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {trigger}

      {isVisible && (
        <div className={`absolute ${bubblePositions[position]} z-50 animate-in fade-in-0 zoom-in-95 duration-200`}>
          <div
            className={`
            px-4 py-2 rounded-xl border-4 shadow-lg max-w-xs text-sm
            ${variantStyles[variant]}
            transform rotate-1 hover:rotate-0 transition-transform duration-200
          `}
            style={{
              fontFamily: "'Comic Neue', 'Comic Sans MS', cursive",
              textShadow: variant === "pow" ? "1px 1px 0px rgba(0,0,0,0.3)" : "none",
            }}
          >
            {children}

            {/* Speech bubble tail */}
            <div
              className={`absolute w-0 h-0 ${tailPositions[position]}`}
              style={{
                borderTopColor:
                  variant === "pow"
                    ? "#FBBF24"
                    : variant === "alive"
                      ? "#4ADE80"
                      : variant === "dead"
                        ? "#F87171"
                        : "#60A5FA",
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
