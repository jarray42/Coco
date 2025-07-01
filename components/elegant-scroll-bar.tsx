"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"

interface ElegantScrollBarProps {
  targetRef: React.RefObject<HTMLElement>
  isDarkMode: boolean
}

export function ElegantScrollBar({ targetRef, isDarkMode }: ElegantScrollBarProps) {
  const [scrollLeft, setScrollLeft] = useState(0)
  const [scrollWidth, setScrollWidth] = useState(0)
  const [clientWidth, setClientWidth] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const scrollBarRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const target = targetRef.current
    if (!target) return

    const updateScrollInfo = () => {
      setScrollLeft(target.scrollLeft)
      setScrollWidth(target.scrollWidth)
      setClientWidth(target.clientWidth)
      setIsVisible(target.scrollWidth > target.clientWidth)
    }

    const handleScroll = () => {
      setScrollLeft(target.scrollLeft)
    }

    updateScrollInfo()
    target.addEventListener("scroll", handleScroll)

    // Update on resize
    const resizeObserver = new ResizeObserver(updateScrollInfo)
    resizeObserver.observe(target)

    return () => {
      target.removeEventListener("scroll", handleScroll)
      resizeObserver.disconnect()
    }
  }, [targetRef])

  const handleScrollBarClick = (e: React.MouseEvent) => {
    if (!targetRef.current || !scrollBarRef.current) return

    const rect = scrollBarRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const scrollRatio = clickX / rect.width
    const newScrollLeft = scrollRatio * (scrollWidth - clientWidth)

    targetRef.current.scrollLeft = newScrollLeft
  }

  const handleThumbMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)

    const startX = e.clientX
    const startScrollLeft = scrollLeft

    const handleMouseMove = (e: MouseEvent) => {
      if (!scrollBarRef.current || !targetRef.current) return

      const deltaX = e.clientX - startX
      const scrollBarWidth = scrollBarRef.current.offsetWidth
      const thumbWidth = (clientWidth / scrollWidth) * scrollBarWidth
      const maxThumbX = scrollBarWidth - thumbWidth
      const scrollRatio = deltaX / maxThumbX
      const newScrollLeft = startScrollLeft + scrollRatio * (scrollWidth - clientWidth)

      targetRef.current.scrollLeft = Math.max(0, Math.min(newScrollLeft, scrollWidth - clientWidth))
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  if (!isVisible) return null

  const thumbWidth = Math.max((clientWidth / scrollWidth) * 100, 10) // Minimum 10% width
  const thumbLeft = (scrollLeft / (scrollWidth - clientWidth)) * (100 - thumbWidth)

  return (
    <div className="relative mb-4">
      <div
        ref={scrollBarRef}
        onClick={handleScrollBarClick}
        className={`w-full h-2 rounded-full cursor-pointer transition-all duration-300 ${
          isDarkMode ? "bg-slate-800/60 hover:bg-slate-800/80" : "bg-white/60 hover:bg-white/80"
        } backdrop-blur-md shadow-lg border-0`}
      >
        <div
          ref={thumbRef}
          onMouseDown={handleThumbMouseDown}
          className={`h-full rounded-full cursor-grab transition-all duration-200 ${
            isDragging ? "cursor-grabbing" : ""
          } ${
            isDarkMode
              ? "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400"
              : "bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-400 hover:to-blue-400"
          } shadow-lg hover:shadow-xl transform hover:scale-y-125`}
          style={{
            width: `${thumbWidth}%`,
            left: `${thumbLeft}%`,
          }}
        />
      </div>
    </div>
  )
}
