"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  isDarkMode: boolean
}

export function Pagination({ currentPage, totalPages, onPageChange, isDarkMode }: PaginationProps) {
  const getVisiblePages = () => {
    const delta = 2
    const range = []
    const rangeWithDots = []

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i)
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...")
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages)
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages)
    }

    return rangeWithDots
  }

  const buttonClass = `h-12 w-12 p-0 rounded-2xl transition-all duration-300 backdrop-blur-md shadow-lg border-0 hover:scale-110 ${
    isDarkMode ? "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70" : "bg-white/80 text-slate-700 hover:bg-white/90"
  }`

  const activeButtonClass = `h-12 w-12 p-0 rounded-2xl transition-all duration-300 shadow-xl scale-110 ${
    isDarkMode ? "bg-blue-600/90 text-white hover:bg-blue-700/90" : "bg-sky-500/90 text-white hover:bg-sky-600/90"
  }`

  return (
    <div className="flex items-center justify-center gap-3 mt-8">
      <Button variant="outline" onClick={() => onPageChange(1)} disabled={currentPage === 1} className={buttonClass}>
        <ChevronsLeft className="w-4 h-4" />
      </Button>

      <Button
        variant="outline"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={buttonClass}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      {getVisiblePages().map((page, index) => (
        <div key={index}>
          {page === "..." ? (
            <span className={`px-3 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>...</span>
          ) : (
            <Button
              variant="outline"
              onClick={() => onPageChange(page as number)}
              className={currentPage === page ? activeButtonClass : buttonClass}
            >
              <span className="font-semibold">{page}</span>
            </Button>
          )}
        </div>
      ))}

      <Button
        variant="outline"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={buttonClass}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>

      <Button
        variant="outline"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className={buttonClass}
      >
        <ChevronsRight className="w-4 h-4" />
      </Button>
    </div>
  )
}
