"use client"

import { Button } from "@/components/ui/button"
import type { SortOption } from "../utils/beat-calculator"
import type { AuthUser } from "../utils/supabase-auth"

interface EnhancedTableHeaderProps {
  sortBy: SortOption
  ascending: boolean
  onSort: (column: SortOption) => void
  isDarkMode: boolean
  user?: AuthUser | null
}

export function EnhancedTableHeader({ sortBy, ascending, onSort, isDarkMode, user }: EnhancedTableHeaderProps) {
  const getSortTriangle = (column: SortOption) => {
    if (sortBy !== column) {
      return (
        <div className="flex flex-col opacity-0 group-hover:opacity-60 transition-opacity duration-200 ml-1">
          <div
            className={`w-0 h-0 border-l-[2px] border-r-[2px] border-b-[3px] border-l-transparent border-r-transparent ${
              isDarkMode ? "border-b-blue-400" : "border-b-sky-600"
            }`}
          />
          <div
            className={`w-0 h-0 border-l-[2px] border-r-[2px] border-t-[3px] border-l-transparent border-r-transparent mt-0.5 ${
              isDarkMode ? "border-t-blue-400" : "border-t-sky-600"
            }`}
          />
        </div>
      )
    }

    return (
      <div className="flex flex-col ml-1">
        {ascending ? (
          <div
            className={`w-0 h-0 border-l-[2px] border-r-[2px] border-b-[3px] border-l-transparent border-r-transparent ${
              isDarkMode ? "border-b-blue-400" : "border-b-sky-600"
            }`}
          />
        ) : (
          <div
            className={`w-0 h-0 border-l-[2px] border-r-[2px] border-t-[3px] border-l-transparent border-r-transparent ${
              isDarkMode ? "border-t-orange-400" : "border-t-orange-600"
            }`}
          />
        )}
      </div>
    )
  }

  const headerClass = `text-xs font-bold uppercase tracking-wider ${isDarkMode ? "text-slate-300" : "text-slate-600"}`

  const bgClass = isDarkMode
    ? "bg-slate-900/70 backdrop-blur-md border-b border-slate-700/50"
    : "bg-white/70 backdrop-blur-md border-b border-sky-200/50"

  const buttonStyle = `justify-start p-3 h-auto ${headerClass} hover:bg-transparent transition-all duration-300 flex items-center group rounded-xl whitespace-nowrap ${
    isDarkMode ? "hover:text-blue-300 hover:bg-slate-800/40" : "hover:text-sky-700 hover:bg-sky-50/60"
  }`

  return (
    <div className={`flex items-center gap-3 px-6 py-4 ${bgClass} sticky top-0 z-10 min-w-max`}>
      <Button variant="ghost" size="sm" onClick={() => onSort("rank")} className={`flex-shrink-0 w-12 ${buttonStyle}`}>
        <span>Rank</span>
        {getSortTriangle("rank")}
      </Button>

      <Button variant="ghost" size="sm" onClick={() => onSort("name")} className={`flex-shrink-0 w-44 ${buttonStyle}`}>
        <span>Coin</span>
        {getSortTriangle("name")}
      </Button>

      <Button variant="ghost" size="sm" onClick={() => onSort("price")} className={`flex-shrink-0 w-28 ${buttonStyle}`}>
        <span>Price</span>
        {getSortTriangle("price")}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onSort("marketCap")}
        className={`flex-shrink-0 w-28 ${buttonStyle}`}
      >
        <span>Market Cap</span>
        {getSortTriangle("marketCap")}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onSort("volume")}
        className={`flex-shrink-0 w-28 ${buttonStyle}`}
      >
        <span>Volume</span>
        {getSortTriangle("volume")}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onSort("githubStars")}
        className={`flex-shrink-0 w-24 ${buttonStyle}`}
      >
        <span>GitHub</span>
        {getSortTriangle("githubStars")}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onSort("twitterFollowers")}
        className={`flex-shrink-0 w-24 ${buttonStyle}`}
      >
        <span>Social</span>
        {getSortTriangle("twitterFollowers")}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onSort("healthScore")}
        className={`flex-shrink-0 w-32 ${buttonStyle}`}
      >
        <span>Health Score</span>
        {getSortTriangle("healthScore")}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onSort("consistencyScore")}
        className={`flex-shrink-0 w-32 ${buttonStyle}`}
      >
        <span>Consistency</span>
        {getSortTriangle("consistencyScore")}
      </Button>

      {user && (
        <div className={`flex-shrink-0 w-16 flex items-center justify-center ${headerClass}`}>
          <span>Actions</span>
        </div>
      )}
    </div>
  )
}
