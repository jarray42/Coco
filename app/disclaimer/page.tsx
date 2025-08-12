"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Sun, Moon } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ModernDeFiBackground } from "../../components/modern-defi-background"
import { ElegantFooter } from "../../components/elegant-footer"
import { AuthModal } from "../../components/auth-modal"
import { UserMenu } from "../../components/user-menu"
import { SiteHeader } from "../../components/site-header"
import { getCurrentUser, onAuthStateChange, type AuthUser } from "../../utils/supabase-auth"

export default function DisclaimerPage() {
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

  return (
    <div className={`min-h-screen transition-all duration-1000 ${isDarkMode ? "dark" : ""}`}>
      <ModernDeFiBackground isDarkMode={isDarkMode} />

      <div className="relative z-10 max-w-[90rem] mx-auto p-3 sm:p-4 lg:p-6">
        {/* Header Layout - Same as Main Page */}
        <div className="flex flex-col lg:flex-row items-center justify-between mb-8 gap-6">
          {/* Left: Back Button + Logo */}
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button
                variant="outline"
                className={`h-10 w-10 p-0 rounded-xl transition-all duration-300 backdrop-blur-md shadow-lg border-0 ${
                  isDarkMode
                    ? "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70 hover:text-slate-100 hover:scale-105"
                    : "bg-white/80 text-slate-700 hover:bg-white/90 hover:text-slate-900 hover:scale-105"
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
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

        {/* Disclaimer Content */}
        <div className="max-w-4xl mx-auto">
          <Card
            className={`${
              isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-white/80 border-slate-200"
            } backdrop-blur-md shadow-2xl`}
          >
            <CardHeader className="text-center pb-8">
              <div className="mx-auto mb-6 flex items-center justify-center">
                <Image 
                  src="/disclaimer.png"
                  alt="Disclaimer"
                  width={160}
                  height={160}
                  className="w-40 h-40"
                />
              </div>
              <CardTitle className={`text-3xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                Disclaimer
              </CardTitle>
            </CardHeader>

            <CardContent className="p-8">
              <div className={`prose prose-lg max-w-none ${isDarkMode ? "prose-invert" : ""}`}>
                <div className={`text-base leading-relaxed space-y-6 ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
                  <p>
                    All content on Cocoricoin—including our website, dashboards, visuals (such as "heartbeat" activity indicators), associated applications, emails, forums, blogs, and social media accounts (collectively, the "Site")—is provided for general informational and educational purposes only. Much of our data is sourced from third parties and public feeds (e.g., GitHub and X/Twitter). Metrics and signals shown on the Site reflect observed public activity only; they do not assess code quality, project solvency, financial health, team competence, or future performance. Data may be delayed, incomplete, inaccurate, or removed without notice.
                  </p>
                  
                  <p>
                    We make no warranties—express or implied—regarding the accuracy, completeness, timeliness, security, availability, or continued operation of the Site or any content/services.
                  </p>
                  
                  <p>
                    Nothing on the Site constitutes financial, investment, legal, accounting, or tax advice, nor any inducement, solicitation, recommendation, or offer to buy or sell any asset. Cocoricoin does not provide brokerage, exchange, custodian, portfolio management, or investment advisory services, and does not facilitate transactions. Nothing here is intended to constitute dealing in, or promotion of, securities or other regulated products in any jurisdiction.
                  </p>
                  
                  <p>
                    Any use of or reliance on the Site is at your own risk and discretion. You should conduct your own research, review, analyze, and independently verify any information before acting on it. Trading digital assets is highly risky and may result in substantial or total losses. Consider consulting a qualified professional advisor before making decisions.
                  </p>
                  
                  <p>
                    References to third-party projects, protocols, or trademarks are for identification only and do not imply affiliation, endorsement, or sponsorship.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
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
              Legal Information • Updated regularly
            </span>
          </div>
        </div>

        {/* Elegant Footer */}
        <ElegantFooter isDarkMode={isDarkMode} />
      </div>
    </div>
  )
}
