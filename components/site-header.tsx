"use client"

import Image from "next/image"
import Link from "next/link"

interface SiteHeaderProps {
  isMainPage?: boolean
  isDarkMode: boolean
}

export function SiteHeader({ isMainPage = false, isDarkMode }: SiteHeaderProps) {
  const logoSize = isMainPage ? 280 : 120
  const containerClass = isMainPage ? "flex items-center gap-6" : "flex items-center justify-center py-4"

  return (
    <div className={containerClass}>
      <Link href="/" className="relative">
        <Image
          src="/cocoricoin-new-logo.png"
          alt="Cocoricoin Logo"
          width={logoSize}
          height={logoSize}
          className={`object-contain drop-shadow-lg transition-all duration-300 ${
            !isMainPage ? "hover:scale-105" : ""
          }`}
          style={{ background: "transparent" }}
        />
      </Link>
    </div>
  )
}
