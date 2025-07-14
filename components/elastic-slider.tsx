"use client"

import React, { useEffect, useRef, useState } from "react"
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
} from "framer-motion"

const MAX_OVERFLOW = 16
const THUMB_SIZE = 20
const TRACK_HEIGHT = 10

interface ElasticSliderProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  label?: string
  unit?: string
  disabled?: boolean
  isDarkMode?: boolean
}

export const ElasticSlider: React.FC<ElasticSliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  className = "",
  leftIcon,
  rightIcon,
  label,
  unit = "",
  disabled = false,
  isDarkMode = false
}) => {
  const [internalValue, setInternalValue] = useState<number>(value)
  const sliderRef = useRef<HTMLDivElement>(null)
  const [region, setRegion] = useState<"left" | "middle" | "right">("middle")
  const clientX = useMotionValue(0)
  const overflow = useMotionValue(0)
  const scale = useMotionValue(1)

  useEffect(() => {
    setInternalValue(value)
  }, [value])

  useMotionValueEvent(clientX, "change", (latest: number) => {
    if (sliderRef.current) {
      const { left, right } = sliderRef.current.getBoundingClientRect()
      let newValue: number
      if (latest < left) {
        setRegion("left")
        newValue = left - latest
      } else if (latest > right) {
        setRegion("right")
        newValue = latest - right
      } else {
        setRegion("middle")
        newValue = 0
      }
      overflow.jump(decay(newValue, MAX_OVERFLOW))
    }
  })

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    if (e.buttons > 0 && sliderRef.current) {
      const { left, width } = sliderRef.current.getBoundingClientRect()
      let newValue = min + ((e.clientX - left) / width) * (max - min)
      if (step > 0) {
        newValue = Math.round(newValue / step) * step
      }
      newValue = Math.min(Math.max(newValue, min), max)
      setInternalValue(newValue)
      onChange(newValue)
      clientX.jump(e.clientX)
    }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    handlePointerMove(e)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerUp = () => {
    animate(overflow, 0, { type: "spring", bounce: 0.4 })
  }

  const getRangePercentage = (): number => {
    const totalRange = max - min
    if (totalRange === 0) return 0
    return ((internalValue - min) / totalRange) * 100
  }

  return (
    <div className={`flex items-center gap-2 w-full ${className}`} style={{ minWidth: 0 }}>
      {label && (
        <span className={`text-xs font-medium whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`} style={{ minWidth: 60 }}>
          {label}
        </span>
      )}
      {leftIcon && (
        <motion.div
          animate={{
            scale: region === "left" && !disabled ? [1, 1.1, 1] : 1,
            transition: { duration: 0.15 },
          }}
          style={{
            x: useTransform(() =>
              region === "left" && !disabled ? -overflow.get() / scale.get() : 0
            ),
          }}
          className={`flex-shrink-0 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}
        >
          {leftIcon}
        </motion.div>
      )}
      <div
        ref={sliderRef}
        className={`relative flex items-center flex-1 select-none`}
        style={{ minWidth: 0, height: TRACK_HEIGHT }}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        {/* Track (background) */}
        <motion.div
          style={{
            scaleX: useTransform(() => {
              if (sliderRef.current && !disabled) {
                const { width } = sliderRef.current.getBoundingClientRect()
                return 1 + overflow.get() / width
              }
              return 1
            }),
            scaleY: useTransform(overflow, [0, MAX_OVERFLOW], [1, 0.97]),
            transformOrigin: 'center',
            height: TRACK_HEIGHT,
            borderRadius: TRACK_HEIGHT / 2,
            background: isDarkMode
              ? 'rgba(51,65,85,0.8)'
              : 'rgba(226,232,240,0.9)',
            width: '100%',
            position: 'absolute',
            left: 0,
            top: '50%',
            translateY: '-50%',
            zIndex: 1,
            transition: 'background 0.2s',
          }}
        />
        {/* Fill (up to thumb center) */}
        <motion.div
          style={{
            width: `calc(${getRangePercentage()}% + ${THUMB_SIZE / 2}px)`,
            height: TRACK_HEIGHT,
            borderRadius: TRACK_HEIGHT / 2,
            background: isDarkMode
              ? 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)'
              : 'linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)',
            position: 'absolute',
            left: 0,
            top: '50%',
            translateY: '-50%',
            zIndex: 2,
            transition: 'background 0.2s',
          }}
        />
        {/* Thumb */}
        <motion.div
          className={`absolute z-30 rounded-full shadow-md border-2 ${isDarkMode ? 'bg-white border-blue-400' : 'bg-white border-blue-500'} transition-colors`}
          style={{
            left: `calc(${getRangePercentage()}% - ${THUMB_SIZE / 2}px)` ,
            top: '50%',
            translateY: '-50%',
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)',
            borderWidth: 2,
            borderColor: isDarkMode ? '#60a5fa' : '#2563eb',
            scale: useTransform(scale, [1, 1.06], [1, 1.04]),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />
      </div>
      {rightIcon && (
        <motion.div
          animate={{
            scale: region === "right" && !disabled ? [1, 1.1, 1] : 1,
            transition: { duration: 0.15 },
          }}
          style={{
            x: useTransform(() =>
              region === "right" && !disabled ? overflow.get() / scale.get() : 0
            ),
          }}
          className={`flex-shrink-0 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}
        >
          {rightIcon}
        </motion.div>
      )}
      <span className={`text-xs font-semibold ml-1 tabular-nums ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`} style={{ minWidth: 28, textAlign: 'right' }}>
        {Math.round(internalValue)}{unit}
      </span>
    </div>
  )
}

function decay(value: number, max: number): number {
  if (max === 0) {
    return 0
  }
  const entry = value / max
  const sigmoid = 2 * (1 / (1 + Math.exp(-entry)) - 0.5)
  return sigmoid * max
} 