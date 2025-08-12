"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"
import { ElegantFooter } from "@/components/elegant-footer"
import { ModernDeFiBackground } from "@/components/modern-defi-background"
import { AuthModal } from "@/components/auth-modal"
import { useState, useEffect } from "react"
import { getCurrentUser, onAuthStateChange, type AuthUser } from "@/utils/supabase-auth"
import { UserMenu } from "@/components/user-menu"
import { Sun, Moon, ArrowLeft, Check, Loader2 } from "lucide-react"

export default function PlansPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isYearly, setIsYearly] = useState(false)
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    getCurrentUser().then(({ user }) => setUser(user as AuthUser | null))
    const { data: { subscription } } = onAuthStateChange((user) => setUser(user))
    return () => subscription.unsubscribe()
  }, [])
  
  const handleSignOut = () => setUser(null)
  
  const handleUpgrade = async () => {
    if (!user) {
      alert('Please sign in to upgrade your plan')
      return
    }

    setLoading(true)
    
    try {
      const response = await fetch('/api/checkout-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isYearly,
          userId: user.id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { url } = await response.json()
      
      // Redirect to Stripe Checkout
      window.location.href = url
    } catch (error) {
      console.error('Error creating checkout session:', error)
      alert('Failed to start checkout process. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  
  // Calculate pricing
  const monthlyPrice = 19.99
  const yearlyPrice = monthlyPrice * 12 * 0.8 // 20% discount
  const yearlyMonthlyEquivalent = yearlyPrice / 12

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
            Choose Your Plan
          </h1>
          <p className={`text-lg md:text-xl mb-6 ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>
            Start your crypto journey with the perfect plan for your needs
          </p>
        </section>

        {/* Divider */}
        <div className="border-t border-black/10 mb-12" />

        {/* Plans Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 max-w-5xl mx-auto">
          {/* Free Plan */}
          <div className={`rounded-3xl p-8 flex flex-col shadow-xl border transition-all duration-300 hover:scale-[1.02] ${
            isDarkMode 
              ? "bg-slate-800/60 border-slate-700/50 backdrop-blur-md" 
              : "bg-white/70 border-white/40 backdrop-blur-md"
          }`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className={`text-2xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                  Free Plan
                </h3>
                <div className={`text-3xl font-bold ${isDarkMode ? "text-green-400" : "text-green-600"}`}>
                  $0<span className={`text-lg font-normal ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>/month</span>
                </div>
              </div>
              <Image 
                src="/plan0.png"
                alt="Free Plan"
                width={96}
                height={96}
                className="w-24 h-24"
              />
            </div>
            
            <ul className="space-y-4 mb-8 flex-grow">
              <li className="flex items-start gap-3">
                <Check className={`w-5 h-5 mt-0.5 ${isDarkMode ? "text-green-400" : "text-green-600"}`} />
                <span className={`${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>2000+ assets</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className={`w-5 h-5 mt-0.5 ${isDarkMode ? "text-green-400" : "text-green-600"}`} />
                <span className={`${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>20 cocoriAI tokens /month</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className={`w-5 h-5 mt-0.5 ${isDarkMode ? "text-green-400" : "text-green-600"}`} />
                <span className={`${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>Basic Recommendations</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className={`w-5 h-5 mt-0.5 ${isDarkMode ? "text-green-400" : "text-green-600"}`} />
                <span className={`${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>20 custom smart alerts</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className={`w-5 h-5 mt-0.5 ${isDarkMode ? "text-green-400" : "text-green-600"}`} />
                <span className={`${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>Access detected gems and new coins</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className={`w-5 h-5 mt-0.5 ${isDarkMode ? "text-green-400" : "text-green-600"}`} />
                <span className={`${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>🥚10 welcome eggs to start your crypto adventure!</span>
              </li>
            </ul>
            
            {!user ? (
              <AuthModal
                isDarkMode={isDarkMode}
                onAuthSuccess={() => getCurrentUser().then(({ user }) => setUser(user as AuthUser | null))}
                triggerButton={
                  <Button
                    className={`w-full py-3 rounded-xl font-medium text-base transition-all duration-300 ${
                      isDarkMode
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    }`}
                  >
                    Get Started Free
                  </Button>
                }
              />
            ) : (
              <Button
                disabled
                className={`w-full py-3 rounded-xl font-medium text-base transition-all duration-300 cursor-not-allowed ${
                  isDarkMode
                    ? "bg-green-600/50 text-white/70"
                    : "bg-green-600/50 text-white/70"
                }`}
              >
                Current Plan
              </Button>
            )}
          </div>

          {/* Paid Plan */}
          <div className={`rounded-3xl p-8 flex flex-col shadow-xl border transition-all duration-300 hover:scale-[1.02] relative overflow-hidden ${
            isDarkMode 
              ? "bg-gradient-to-br from-purple-900/60 to-blue-900/60 border-purple-500/50 backdrop-blur-md" 
              : "bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200 backdrop-blur-md"
          }`}>
            {/* Premium Badge */}
            <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-1 rounded-full text-sm font-medium transform rotate-12">
              Popular
            </div>
            
                         <div className="flex items-center justify-between mb-6">
               <div>
                 <h3 className={`text-2xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                   Paid Plan
                 </h3>
                 <div className={`text-3xl font-bold ${isDarkMode ? "text-purple-400" : "text-purple-600"}`}>
                   {isYearly ? (
                     <>
                       ${yearlyMonthlyEquivalent.toFixed(2)}
                       <span className={`text-lg font-normal ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>/month</span>
                       <div className={`text-sm font-normal ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                         billed annually (${yearlyPrice.toFixed(2)}/year)
                       </div>
                     </>
                   ) : (
                     <>
                       $19.99<span className={`text-lg font-normal ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>/month</span>
                     </>
                   )}
                 </div>
               </div>
               <Image 
                 src="/plan1.png"
                 alt="Paid Plan"
                 width={96}
                 height={96}
                 className="w-24 h-24"
               />
             </div>
             
             {/* Billing Toggle */}
             <div className="flex items-center justify-center mb-6">
               <div className={`flex items-center p-1 rounded-xl ${isDarkMode ? "bg-slate-700/50" : "bg-gray-100"}`}>
                 <button
                   onClick={() => setIsYearly(false)}
                   className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                     !isYearly
                       ? `${isDarkMode ? "bg-purple-600 text-white" : "bg-white text-gray-900 shadow-sm"}`
                       : `${isDarkMode ? "text-slate-300 hover:text-white" : "text-gray-600 hover:text-gray-900"}`
                   }`}
                 >
                   Monthly
                 </button>
                 <button
                   onClick={() => setIsYearly(true)}
                   className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 relative ${
                     isYearly
                       ? `${isDarkMode ? "bg-purple-600 text-white" : "bg-white text-gray-900 shadow-sm"}`
                       : `${isDarkMode ? "text-slate-300 hover:text-white" : "text-gray-600 hover:text-gray-900"}`
                   }`}
                 >
                   Yearly
                   <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                     20% OFF
                   </span>
                 </button>
               </div>
             </div>
            
            <ul className="space-y-4 mb-8 flex-grow">
              <li className="flex items-start gap-3">
                <Check className={`w-5 h-5 mt-0.5 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`} />
                <span className={`font-medium ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>Everything from the free plan</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className={`w-5 h-5 mt-0.5 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`} />
                <span className={`${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>200 cocoriAI tokens /month</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className={`w-5 h-5 mt-0.5 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`} />
                <span className={`${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>200 custom smart alerts</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className={`w-5 h-5 mt-0.5 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`} />
                <span className={`${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>Access new coins and full list of gems with high potential</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className={`w-5 h-5 mt-0.5 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`} />
                <span className={`${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>Migration & delisting alerts and emails</span>
              </li>
                             <li className="flex items-start gap-3">
                 <Check className={`w-5 h-5 mt-0.5 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`} />
                 <span className={`${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>Full access to advanced asset screening</span>
               </li>
               <li className="flex items-start gap-3">
                 <Check className={`w-5 h-5 mt-0.5 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`} />
                 <span className={`${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>Early access to new features</span>
               </li>
               <li className="flex items-start gap-3">
                 <Check className={`w-5 h-5 mt-0.5 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`} />
                 <span className={`${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>Priority support</span>
               </li>
            </ul>
            
                         <Button
               onClick={handleUpgrade}
               disabled={loading}
               className={`w-full py-3 rounded-xl font-medium text-base transition-all duration-300 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed`}
             >
               {loading ? (
                 <>
                   <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                   Processing...
                 </>
               ) : (
                 <>
                   {isYearly ? "Upgrade to Pro (Save 20%)" : "Upgrade to Pro"}
                 </>
               )}
             </Button>
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-black/10 mb-12" />
        
        <ElegantFooter isDarkMode={isDarkMode} />
      </div>
    </div>
  )
} 