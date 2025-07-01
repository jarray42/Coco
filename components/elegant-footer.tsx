"use client"

import Link from "next/link"
import { Twitter, Youtube, Mail } from "lucide-react"

interface ElegantFooterProps {
  isDarkMode: boolean
}

export function ElegantFooter({ isDarkMode }: ElegantFooterProps) {
  const textClass = isDarkMode ? "text-slate-300" : "text-slate-700"
  const mutedTextClass = isDarkMode ? "text-slate-500" : "text-slate-500"
  const bgClass = isDarkMode ? "bg-slate-900/50" : "bg-white/50"

  return (
    <footer className={`mt-12 ${bgClass} backdrop-blur-md rounded-2xl border-0 shadow-lg`}>
      <div className="px-6 py-8">
        {/* Copyright */}
        <div className="text-center mb-6">
          <p className={`text-sm font-medium ${textClass}`}>© 2025 CocoriCoin. All Rights Reserved</p>
        </div>

        {/* Social Media Links */}
        <div className="flex justify-center items-center gap-6 mb-6">
          <a
            href="https://x.com/Cocoricoins"
            target="_blank"
            rel="noopener noreferrer"
            className={`p-3 rounded-xl transition-all duration-300 hover:scale-110 ${isDarkMode ? "hover:bg-slate-800/60" : "hover:bg-slate-100/60"} group`}
          >
            <Twitter className={`w-5 h-5 transition-colors duration-300 ${textClass} group-hover:text-yellow-500`} />
          </a>

          <a
            href="https://www.youtube.com/@Cocoricoin"
            target="_blank"
            rel="noopener noreferrer"
            className={`p-3 rounded-xl transition-all duration-300 hover:scale-110 ${isDarkMode ? "hover:bg-slate-800/60" : "hover:bg-slate-100/60"} group`}
          >
            <Youtube className={`w-5 h-5 transition-colors duration-300 ${textClass} group-hover:text-yellow-500`} />
          </a>

          <a
            href="mailto:cocoricoins@gmail.com"
            className={`p-3 rounded-xl transition-all duration-300 hover:scale-110 ${isDarkMode ? "hover:bg-slate-800/60" : "hover:bg-slate-100/60"} group`}
          >
            <Mail className={`w-5 h-5 transition-colors duration-300 ${textClass} group-hover:text-yellow-500`} />
          </a>
        </div>

        {/* Footer Links */}
        <div className="flex justify-center items-center gap-8 flex-wrap">
          <Link
            href="/contact"
            className={`text-sm font-bold transition-colors duration-300 hover:text-yellow-500 ${textClass}`}
          >
            Contact us
          </Link>
          <Link
            href="/about"
            className={`text-sm font-bold transition-colors duration-300 hover:text-yellow-500 ${textClass}`}
          >
            About us
          </Link>
          <Link
            href="/faqs"
            className={`text-sm font-bold transition-colors duration-300 hover:text-yellow-500 ${textClass}`}
          >
            FAQs
          </Link>
          <Link
            href="/privacy"
            className={`text-sm font-bold transition-colors duration-300 hover:text-yellow-500 ${textClass}`}
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  )
}
