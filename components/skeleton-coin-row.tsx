"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { FlickeringPixelHeart } from "./flickering-pixel-heart"
import type { AuthUser } from "../utils/supabase-auth"

interface SkeletonCoinRowProps {
  isDarkMode: boolean
  user?: AuthUser | null
}

export function SkeletonCoinRow({ isDarkMode, user }: SkeletonCoinRowProps) {
  const bgClass = isDarkMode ? "bg-gray-800/30" : "bg-gray-100/50"
  const skeletonBaseClass = isDarkMode ? "bg-gray-700" : "bg-gray-300"

  return (
    <div
      className={`flex items-center gap-3 px-6 py-3 border-b min-w-max ${bgClass}`}
      style={{
        borderColor: isDarkMode ? "rgba(107, 114, 128, 0.1)" : "rgba(229, 231, 235, 0.5)",
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
      }}
    >
      {/* Rank */}
      <div className="flex-shrink-0 w-12 flex items-center">
        <Skeleton className={`h-4 w-6 rounded ${skeletonBaseClass}`} />
      </div>

      {/* Coin Info with Logo */}
      <div className="flex-shrink-0 w-44 flex items-center gap-3">
        <Skeleton className={`w-8 h-8 rounded-full ${skeletonBaseClass}`} />
        <div className="min-w-0 flex-1">
          <Skeleton className={`h-3 w-16 mb-1 rounded ${skeletonBaseClass}`} />
          <Skeleton className={`h-3 w-10 rounded ${skeletonBaseClass}`} />
        </div>
      </div>

      {/* Price */}
      <div className="flex-shrink-0 w-28 flex items-center">
        <div className="w-full">
          <Skeleton className={`h-3 w-20 mb-1 rounded ${skeletonBaseClass}`} />
          <Skeleton className={`h-3 w-12 rounded ${skeletonBaseClass}`} />
        </div>
      </div>

      {/* Market Cap */}
      <div className="flex-shrink-0 w-28 flex items-center">
        <Skeleton className={`h-3 w-14 rounded ${skeletonBaseClass}`} />
      </div>

      {/* Volume */}
      <div className="flex-shrink-0 w-28 flex items-center">
        <Skeleton className={`h-3 w-14 rounded ${skeletonBaseClass}`} />
      </div>

      {/* GitHub Stars */}
      <div className="flex-shrink-0 w-24 flex items-center">
        <Skeleton className={`h-4 w-10 rounded ${skeletonBaseClass}`} />
      </div>

      {/* Twitter Followers */}
      <div className="flex-shrink-0 w-24 flex items-center">
        <Skeleton className={`h-4 w-10 rounded ${skeletonBaseClass}`} />
      </div>

      {/* Beat Score */}
      <div className="flex-shrink-0 w-32 flex items-center justify-center">
        <FlickeringPixelHeart size="sm" isDarkMode={isDarkMode} />
      </div>

      {/* Consistency Score */}
      <div className="flex-shrink-0 w-32 flex items-center justify-center">
        <Skeleton className={`h-4 w-10 rounded ${skeletonBaseClass}`} />
      </div>

      {/* Portfolio - conditional */}
      {user && (
        <div className="flex-shrink-0 w-16 flex items-center justify-center">
          <Skeleton className={`w-2 h-2 rounded-full ${skeletonBaseClass}`} />
        </div>
      )}
    </div>
  )
}
