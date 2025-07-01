"use client"

import Link from "next/link"
import { prefetchCoinDetails } from "../actions/fetch-coin-details"
import type { ReactNode } from "react"

interface OptimizedCoinLinkProps {
  coinId: string
  children: ReactNode
  className?: string
}

export function OptimizedCoinLink({ coinId, children, className }: OptimizedCoinLinkProps) {
  const handleMouseEnter = () => {
    // Prefetch coin details on hover for instant loading
    prefetchCoinDetails(coinId)
  }

  return (
    <Link
      href={`/coin/${coinId}`}
      className={className}
      onMouseEnter={handleMouseEnter}
      prefetch={false} // We handle prefetching manually
    >
      {children}
    </Link>
  )
}
