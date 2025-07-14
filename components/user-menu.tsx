"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { User, Settings, LogOut, Heart, Wallet, Bell } from "lucide-react"
import { signOut, type AuthUser } from "../utils/supabase-auth"

interface UserMenuProps {
  user: AuthUser
  isDarkMode: boolean
  onSignOut: () => void
}

export function UserMenu({ user, isDarkMode, onSignOut }: UserMenuProps) {
  const [loading, setLoading] = useState(false)

  const handleSignOut = async () => {
    setLoading(true)
    try {
      await signOut()
      onSignOut()
    } catch (error) {
      console.error("Error signing out:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={`h-10 px-3 rounded-xl transition-all duration-300 backdrop-blur-md shadow-lg border-0 ${
            isDarkMode
              ? "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70 hover:text-slate-100 hover:scale-105"
              : "bg-white/80 text-slate-700 hover:bg-white/90 hover:text-slate-900 hover:scale-105"
          }`}
        >
          <img src="/loggedinin.png" alt="Logged in" className="w-5 h-5 mr-2" />
          <span className="hidden sm:inline text-sm">{user.user_metadata?.full_name || user.email?.split("@")[0]}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className={`w-48 rounded-xl border-0 shadow-2xl backdrop-blur-md ${
          isDarkMode ? "bg-slate-800/95 text-slate-100" : "bg-white/95 text-slate-900"
        }`}
      >
        <DropdownMenuLabel className="px-3 py-2">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold">{user.user_metadata?.full_name || "User"}</p>
            <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{user.email}</p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className={isDarkMode ? "bg-slate-700/50" : "bg-slate-200/50"} />

        <DropdownMenuItem className="px-3 py-2 cursor-pointer rounded-lg mx-2 my-1">
          <User className="w-4 h-4 mr-2" />
          Profile
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="px-3 py-2 cursor-pointer rounded-lg mx-2 my-1">
          <Link href="/portfolio">
            <Wallet className="w-4 h-4 mr-2" />
            Portfolio
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="px-3 py-2 cursor-pointer rounded-lg mx-2 my-1">
          <Link href="/notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem className="px-3 py-2 cursor-pointer rounded-lg mx-2 my-1">
          <Heart className="w-4 h-4 mr-2" />
          Favorites
        </DropdownMenuItem>

        <DropdownMenuItem className="px-3 py-2 cursor-pointer rounded-lg mx-2 my-1">
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </DropdownMenuItem>

        <DropdownMenuSeparator className={isDarkMode ? "bg-slate-700/50" : "bg-slate-200/50"} />

        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={loading}
          className="px-3 py-2 cursor-pointer rounded-lg mx-2 my-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <LogOut className="w-4 h-4 mr-2" />
          {loading ? "Signing out..." : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
