import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import { cn } from "@/lib/utils"
import "./globals.css"

const fontInter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
})

const fontJetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-jetbrains-mono",
})

export const metadata: Metadata = {
  title: "Cocoricoin - Crypto Health Tracker",
  description: "Modern DeFi analytics with playful health scoring",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontInter.variable,
          fontJetBrainsMono.variable,
        )}
      >
        {children}
      </body>
    </html>
  )
}
