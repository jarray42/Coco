"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { AuthModal } from "./auth-modal"
import { UserMenu } from "./user-menu"
import { SiteHeader } from "./site-header"
import { getCurrentUser, onAuthStateChange, type AuthUser } from "../utils/supabase-auth"

interface ProfessionalHeaderProps {
  isDarkMode: boolean
  totalCoins: number
  activeCoins: number
}

export function ProfessionalHeader({ isDarkMode, totalCoins, activeCoins }: ProfessionalHeaderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial user
    getCurrentUser().then(({ user }) => {
      setUser(user as AuthUser | null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = onAuthStateChange((user) => {
      setUser(user)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleAuthSuccess = () => {
    // Refresh user data after successful auth
    getCurrentUser().then(({ user }) => {
      setUser(user as AuthUser | null)
    })
  }

  const handleSignOut = () => {
    setUser(null)
  }

  return (
    <div className="flex flex-col lg:flex-row items-center justify-between mb-12 gap-6">
      <SiteHeader isMainPage={true} isDarkMode={isDarkMode} />

      {/* Stats and Auth */}
      <div className="flex items-center gap-4 flex-wrap">
        <Badge
          variant="outline"
          className={`px-6 py-3 text-sm font-medium border rounded-2xl transition-all duration-300 backdrop-blur-sm shadow-lg ${
            isDarkMode
              ? "bg-slate-800/50 text-blue-300 border-blue-500/30 hover:bg-slate-800/70"
              : "bg-white/60 text-sky-700 border-sky-200/50 hover:bg-white/80"
          }`}
        >
          {totalCoins} Coins
        </Badge>
        <Badge
          variant="outline"
          className={`px-6 py-3 text-sm font-medium border rounded-2xl transition-all duration-300 backdrop-blur-sm shadow-lg ${
            isDarkMode
              ? "bg-slate-800/50 text-green-300 border-green-500/30 hover:bg-slate-800/70"
              : "bg-white/60 text-emerald-700 border-emerald-200/50 hover:bg-white/80"
          }`}
        >
          {activeCoins} Active
        </Badge>
        <div
          className={`w-3 h-3 rounded-full animate-pulse shadow-lg ${isDarkMode ? "bg-emerald-400" : "bg-emerald-500"}`}
        />

        {/* Authentication */}
        <div className="flex items-center gap-3">
          {loading ? (
            <div className={`h-12 w-24 rounded-2xl animate-pulse ${isDarkMode ? "bg-slate-800/60" : "bg-white/60"}`} />
          ) : user ? (
            <UserMenu user={user} isDarkMode={isDarkMode} onSignOut={handleSignOut} />
          ) : (
            <AuthModal isDarkMode={isDarkMode} onAuthSuccess={handleAuthSuccess} />
          )}
        </div>
      </div>
    </div>
  )
}
