"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"
import { ElegantFooter } from "@/components/elegant-footer"
import { ModernDeFiBackground } from "@/components/modern-defi-background"
import { AuthModal } from "@/components/auth-modal"
import { useState, useEffect } from "react"
import { getCurrentUser, onAuthStateChange, type AuthUser } from "@/utils/supabase-auth"
import { UserMenu } from "@/components/user-menu"
import { LucideRocket, LucideShield, LucideLayers, LucideSparkles, Sun, Moon, ArrowLeft } from "lucide-react"

export default function FeaturesPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  useEffect(() => {
    getCurrentUser().then(({ user }) => setUser(user as AuthUser | null))
    const { data: { subscription } } = onAuthStateChange((user) => setUser(user))
    return () => subscription.unsubscribe()
  }, [])
  const handleSignOut = () => setUser(null)

  return (
    <div className={`min-h-screen relative flex flex-col transition-all duration-1000 ${isDarkMode ? "dark bg-slate-900" : ""}`}>
      <ModernDeFiBackground isDarkMode={isDarkMode} />
      <div className="relative z-10 max-w-6xl mx-auto p-4 flex flex-col min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
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
          <div className="flex items-center gap-3">
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
            {user ? (
              <UserMenu user={user} isDarkMode={isDarkMode} onSignOut={handleSignOut} />
            ) : null}
          </div>
        </div>
        {/* Hero Section */}
        <section className="mb-12 text-center">
          <h1 className={`font-heading text-5xl md:text-6xl font-semibold tracking-tight leading-tight mb-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            Smarter Crypto. Safer Moves.
          </h1>
          <p className={`text-lg md:text-xl mb-6 ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>
            Stay alert, analyze smarter, and earn eggs as you build your ultimate crypto portfolio
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-3">
            {!user && (
              <AuthModal
                isDarkMode={isDarkMode}
                onAuthSuccess={() => getCurrentUser().then(({ user }) => setUser(user as AuthUser | null))}
                triggerButton={
                  <Button
                    className="px-8 py-3 bg-black text-white rounded-lg font-medium text-base shadow-lg hover:bg-gray-800 transition-all"
                  >
                    Get Started
                  </Button>
                }
              />
            )}
          </div>
        </section>
        {/* Divider */}
        <div className="border-t border-black/10 mb-12" />
        {/* Feature Grid: now 2x2 */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Card 1: Smart Alerts & Notifications */}
          <div className="glass rounded-2xl p-8 flex flex-col items-center shadow-xl border border-white/40 backdrop-blur-md bg-white/70">
            <img src="/Features_icon/F1.png" alt="Smart Alerts & Notifications" className="w-28 h-28 object-contain mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Smart Alerts & Notifications</h3>
            <p className="text-sm text-gray-600 text-center">Set custom smart alerts for price, health, or consistency on any coin. Get instant notifications when your conditions are met—never miss a token/coin migration or delisting.</p>
          </div>
          {/* Card 2: Eggs System */}
          <div className="glass rounded-2xl p-8 flex flex-col items-center shadow-xl border border-white/40 backdrop-blur-md bg-white/70">
            <img src="/Features_icon/F2.png" alt="Community-Driven “Eggs” System" className="w-28 h-28 object-contain mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Community-Driven “Eggs” System</h3>
            <p className="text-sm text-gray-600 text-center">
              Earn and collect “eggs” by engaging with the platform and community events. Unlock special features, participate in Cocoricoin’s growth, and contribute valuable insights to help shape the platform’s future.
            </p>
          </div>
          {/* Card 3: AI-Powered Market Analysis */}
          <div className="glass rounded-2xl p-8 flex flex-col items-center shadow-xl border border-white/40 backdrop-blur-md bg-white/70">
            <img src="/Features_icon/F3.png" alt="AI-Powered Market Analysis" className="w-28 h-28 object-contain mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-gray-900">AI-Powered Market Analysis</h3>
            <p className="text-sm text-gray-600 text-center">Leverage built-in AI advisors for portfolio suggestions, market sentiment, and risk analysis. Get actionable insights tailored to your holdings.</p>
          </div>
          {/* Card 4: Portfolio Tracking */}
          <div className="glass rounded-2xl p-8 flex flex-col items-center shadow-xl border border-white/40 backdrop-blur-md bg-white/70">
            <img src="/Features_icon/F4.png" alt="Portfolio Tracking" className="w-36 h-36 object-contain mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Portfolio Tracking</h3>
            <p className="text-sm text-gray-600 text-center">Track over 2,000 crypto assets in your personal portfolio and go beyond simple price monitoring. Instantly assess the development activity and health of every token using clear, efficient metrics—helping you spot dead projects, inconsistent teams, and hidden gems with high potential. Stay ahead of the market by following real project progress, not just price swings.</p>
          </div>
        </section>
        {/* Divider */}
        <div className="border-t border-black/10 mb-12" />
        <ElegantFooter isDarkMode={isDarkMode} />
      </div>
    </div>
  )
} 