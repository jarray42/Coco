"use client"

import Image from "next/image"

interface CocoricoinLogoProps {
  size?: "sm" | "md" | "lg"
}

export function CocoricoinLogo({ size = "md" }: CocoricoinLogoProps) {
  const sizeClasses = {
    sm: "w-10 h-10", // Adjusted for potentially non-square logo
    md: "w-12 h-12",
    lg: "w-16 h-16",
  }

  return (
    <div className={`${sizeClasses[size]} relative`}>
      <Image
        src="/cocoricoin-logo.png"
        alt="Cocoricoin Logo"
        width={size === "lg" ? 64 : size === "md" ? 48 : 40}
        height={size === "lg" ? 64 : size === "md" ? 48 : 40}
        className="object-contain"
      />
    </div>
  )
}
