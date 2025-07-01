"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Code, Heart, DollarSign, Mail, Sun, Moon } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ModernDeFiBackground } from "../../components/modern-defi-background"
import { ElegantFooter } from "../../components/elegant-footer"
import { AuthModal } from "../../components/auth-modal"
import { UserMenu } from "../../components/user-menu"
import { SiteHeader } from "../../components/site-header"
import { getCurrentUser, onAuthStateChange, type AuthUser } from "../../utils/supabase-auth"

export default function FAQsPage() {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    // Get initial user
    getCurrentUser().then(({ user }) => {
      setUser(user as AuthUser | null)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = onAuthStateChange((user) => {
      setUser(user)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleAuthSuccess = () => {
    getCurrentUser().then(({ user }) => {
      setUser(user as AuthUser | null)
    })
  }

  const handleSignOut = () => {
    setUser(null)
  }

  const faqs = [
    {
      icon: <Code className="w-6 h-6" />,
      question: 'How is the "Consistency Score" calculated?',
      answer:
        "The Consistency Score is a number from 1–100 that measures how regularly and how recently a crypto project's team ships code on GitHub and posts on Twitter. It is computed by combining weighted, normalized measures of frequency (20-day commit baseline, 60-day tweet baseline) and recency (days commit cap, days tweet cap) for a project's last 30 days of GitHub commits and Twitter posts (60% frequency/40% recency), blended 60% GitHub to 40% Twitter.",
    },
    {
      icon: <Heart className="w-6 h-6 text-red-500" />,
      question: "How is the Health Score calculated?",
      answer:
        "Our Health Score combines on-chain metrics (transaction volume, active addresses), developer activity (GitHub commits/issues), social sentiment, and community heart-votes—each normalized and weighted, with AI dynamically tuning the weights in real time—to produce a 0–100 index.",
    },
    {
      icon: <DollarSign className="w-6 h-6" />,
      question: "What are Coin Price, Market Capitalization, and Volume?",
      answer:
        "Coin Price denotes the current global, volume-weighted average trading price of a cryptoasset across all active exchanges; Market Capitalization measures the asset's overall size by multiplying that price by its circulating supply; and Volume captures the total quantity of the asset traded on all active exchanges over a specified period.",
    },
    {
      icon: <Mail className="w-6 h-6" />,
      question: "How can I update inaccurate coin or token information?",
      answer:
        "We're here to help! To request a correction, simply email us at cocoricoins@gmail.com with a detailed description of what needs updating.",
    },
  ]

  return (
    <div className={`min-h-screen transition-all duration-1000 ${isDarkMode ? "dark" : ""}`}>
      <ModernDeFiBackground isDarkMode={isDarkMode} />

      <div className="relative z-10 max-w-[90rem] mx-auto p-3 sm:p-4 lg:p-6">
        {/* Header Layout - Same as Main Page */}
        <div className="flex flex-col lg:flex-row items-center justify-between mb-8 gap-6">
          {/* Left: Back Button + Logo */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 backdrop-blur-md shadow-lg border-0 hover:scale-105 ${
                isDarkMode
                  ? "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70 hover:text-slate-100"
                  : "bg-white/80 text-slate-700 hover:bg-white/90 hover:text-slate-900"
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-bold text-sm">Back</span>
            </Link>
            <SiteHeader isMainPage={false} isDarkMode={isDarkMode} />
          </div>

          {/* Right: Controls - Same as Main Page */}
          <div className="flex items-center gap-3">
            {/* Dark/Light Mode Toggle */}
            <Button
              onClick={() => setIsDarkMode(!isDarkMode)}
              variant="outline"
              className={`h-10 px-4 rounded-xl transition-all duration-300 backdrop-blur-md shadow-lg border-0 ${
                isDarkMode
                  ? "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70 hover:text-slate-100 hover:scale-105"
                  : "bg-white/80 text-slate-700 hover:bg-white/90 hover:text-slate-900 hover:scale-105"
              }`}
            >
              {isDarkMode ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
              {isDarkMode ? "Light" : "Dark"}
            </Button>

            {/* Authentication */}
            {user ? (
              <UserMenu user={user} isDarkMode={isDarkMode} onSignOut={handleSignOut} />
            ) : (
              <AuthModal isDarkMode={isDarkMode} onAuthSuccess={handleAuthSuccess} />
            )}
          </div>
        </div>

        {/* FAQ Content - Same Card Style as Main Page */}
        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`rounded-2xl border-0 overflow-hidden shadow-2xl backdrop-blur-md transition-all duration-300 hover:shadow-xl hover:scale-[1.01] ${
                isDarkMode ? "bg-slate-800/50" : "bg-white/80"
              }`}
            >
              <div className="p-6 lg:p-8">
                {/* Question Header */}
                <div className="flex items-start gap-4 mb-6">
                  <div
                    className={`p-3 rounded-xl transition-all duration-300 ${
                      isDarkMode ? "bg-slate-700/50" : "bg-slate-100/50"
                    }`}
                  >
                    {faq.icon}
                  </div>
                  <h2
                    className={`text-xl lg:text-2xl font-bold leading-tight ${
                      isDarkMode ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {faq.question}
                  </h2>
                </div>

                {/* Answer */}
                <div className="pl-16">
                  <p
                    className={`text-base lg:text-lg leading-relaxed ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Status Bar - Same as Main Page */}
        <div
          className={`mt-6 flex items-center justify-center p-4 rounded-2xl backdrop-blur-md shadow-lg border-0 ${
            isDarkMode ? "bg-slate-800/50" : "bg-white/80"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full shadow-lg bg-emerald-500" />
            <span className={`text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
              Help Center • Updated regularly
            </span>
          </div>
        </div>

        {/* Elegant Footer */}
        <ElegantFooter isDarkMode={isDarkMode} />
      </div>
    </div>
  )
}
