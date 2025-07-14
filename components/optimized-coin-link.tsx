"use client"

import Link from "next/link"
import type { ReactNode } from "react"

interface OptimizedCoinLinkProps {
  coinId: string
  children: ReactNode
  className?: string
}

export function OptimizedCoinLink({ coinId, children, className }: OptimizedCoinLinkProps) {
  return (
    <Link
      href={`/coin/${coinId}`}
      className={className}
      prefetch={true} // Enable Next.js prefetching for instant navigation
    >
      {children}
    </Link>
  )
}
