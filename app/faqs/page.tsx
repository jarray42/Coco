"use client"

import { useState, useEffect, useRef } from "react"
import { ArrowLeft, Code, Heart, DollarSign, Mail, Sun, Moon, Sparkles, TrendingUp, Shield, Edit, Egg, AlertTriangle, Users, Gift, Coins } from "lucide-react"
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
  const [openIndex, setOpenIndex] = useState<number | null>(null)

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
      question: 'How are the "Health Score" and "Consistency Score" calculated?',
      answer:
        "We combine three simple measures—trading activity, social engagement, and code updates—to give each project a \"health\" score from 0–100, where higher means more active and well supported. Trading volume is scaled so both small and large projects fit on the same curve, while Twitter posts and GitHub commits get credit for how recent they are and how many followers or stars they have. The \"consistency\" score also runs from 0–100 and tracks how regularly the team tweets or ships code, rewarding steady, ongoing work and lowering the score if long breaks occur. Together, these two scores let you see at a glance which projects are not only popular but also reliably maintained.",
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
    {
      icon: <Sparkles className="w-6 h-6 text-yellow-500" />,
      question: "What is the AI Portfolio Advisor and how does it work?",
      answer:
        "The AI Portfolio Advisor is your personal crypto assistant. It analyzes your portfolio and the latest market data using advanced AI models to give you tailored insights and actionable advice. You can request a quick summary, dive into detailed analysis, or chat with the advisor for specific recommendations. The AI considers coin performance, risk, diversification, and project activity to help you make smarter investment decisions.",
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-blue-500" />,
      question: "What is the quota system and how does it affect my usage?",
      answer:
        "To keep our AI services fast and fair for everyone, each user has a monthly quota of AI-powered requests, based on their subscription plan. This includes portfolio analysis, market analysis, and AI chat. If you reach your quota, you'll be prompted to upgrade your plan or wait for your quota to reset next month. You can always see your remaining quota in your dashboard.",
    },
    {
      icon: <Shield className="w-6 h-6 text-green-500" />,
      question: "How is my portfolio data kept secure?",
      answer:
        "Your privacy and security are very important to us. All portfolio data is stored securely and is only accessible to you when you're logged in. We use strong authentication and encryption practices, and never share your personal or portfolio information with third parties. You control your data at all times.",
    },
    {
      icon: <Edit className="w-6 h-6 text-purple-500" />,
      question: "How do I add, edit, or remove coins from my portfolio?",
      answer:
        "Managing your portfolio is easy. To add a coin, use the \"Add Coin\" button or search for a coin and select \"Add to Portfolio.\" To edit, click the pencil or edit icon next to a coin to update your amount. To remove a coin, click the trash or remove icon. All changes are saved instantly, and your portfolio analysis updates automatically.",
    },
    {
      icon: <Egg className="w-6 h-6 text-yellow-600" />,
      question: "What are eggs and how do I earn them?",
      answer:
        "Eggs 🥚 are our reward currency that you can use to participate in community alerts and earn more rewards. Every new user starts with 10 eggs when they create an account. You can earn additional eggs by successfully staking on verified coin alerts - when your alert is confirmed by the community, you receive double the eggs you staked as a reward.",
    },
    {
      icon: <Users className="w-6 h-6 text-orange-500" />,
      question: "How do I use eggs to stake on coin alerts?",
      answer:
        "To stake eggs on alerts, you need at least 2 eggs in your balance. When you spot a potential coin migration or delisting, you can submit an alert with proof (like a link to an announcement) and stake 2 eggs on it. Your staked eggs join a community pool with other users who also believe the alert is valid. You can check your egg balance in your portfolio page.",
    },
    {
      icon: <Gift className="w-6 h-6 text-green-600" />,
      question: "What happens when I stake eggs on an alert?",
      answer:
        "When you stake 2 eggs on an alert, they go into a community pool that needs 6 total eggs to be considered \"filled.\" Once the pool is filled and the alert is verified as accurate by our system, all participants receive double their staked eggs as a reward (4 eggs back for your 2 staked). The verification process ensures only legitimate alerts are rewarded.",
    },
    {
      icon: <AlertTriangle className="w-6 h-6 text-red-500" />,
      question: "What are coin migration and delisting alerts?",
      answer:
        "These are community-driven warnings about important changes to cryptocurrencies. Migration alerts notify users when a coin is moving to a new contract address or blockchain, while delisting alerts warn when exchanges are removing a coin from trading. These alerts help protect the community from potential losses by providing early warnings about critical changes that could affect their holdings.",
    },
    {
      icon: <Shield className="w-6 h-6 text-amber-600" />,
      question: "Can I lose my staked eggs?",
      answer:
        "Currently, staked eggs remain in the alert pool until verification. If an alert isn't verified or doesn't reach the required pool size, the specific mechanics for egg return may vary. We recommend only staking on alerts you're confident about and have solid proof for, as this increases the chances of successful verification and reward.",
    },
    {
      icon: <Coins className="w-6 h-6 text-indigo-500" />,
      question: "What's the difference between eggs and AI quota tokens?",
      answer:
        "These are two separate systems in CocoriCoin. AI quota tokens are used for AI-powered features like portfolio analysis, market insights, and chatting with our AI advisor - these reset monthly based on your subscription plan. Eggs are our community reward currency specifically for the alert staking system, where you can earn more by participating in verified community alerts. Think of quota tokens as your \"AI usage allowance\" and eggs as your \"community participation rewards.\"",
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

        {/* FAQ Content - Enhanced Accordion */}
        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`rounded-lg border-0 overflow-hidden shadow-md backdrop-blur-md transition-all duration-500 ease-out hover:shadow-lg hover:scale-[1.002] ${
                openIndex === index 
                  ? isDarkMode 
                    ? "bg-slate-800/70 shadow-xl ring-2 ring-blue-400/30" 
                    : "bg-white/90 shadow-xl ring-2 ring-blue-400/30"
                  : isDarkMode 
                    ? "bg-slate-800/50" 
                    : "bg-white/80"
              }`}
            >
              <button
                className={`w-full flex items-center gap-3 p-4 text-left focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all duration-500 ease-out ${
                  openIndex === index
                    ? isDarkMode
                      ? "bg-slate-700/40" : "bg-slate-100/60"
                    : "hover:bg-slate-50/30"
                }`}
                aria-expanded={openIndex === index}
                aria-controls={`faq-answer-${index}`}
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <div
                  className={`p-2 rounded-lg transition-all duration-500 ease-out flex-shrink-0 ${
                    openIndex === index
                      ? isDarkMode 
                        ? "bg-blue-500/20 text-blue-400" 
                        : "bg-blue-500/10 text-blue-600"
                      : isDarkMode 
                        ? "bg-slate-700/50" 
                        : "bg-slate-100/50"
                  }`}
                >
                  {faq.icon}
                </div>
                <h2
                  className={`text-lg font-semibold leading-tight flex-1 transition-colors duration-500 ease-out ${
                    openIndex === index
                      ? isDarkMode 
                        ? "text-blue-200" 
                        : "text-blue-800"
                      : isDarkMode 
                        ? "text-white" 
                        : "text-slate-900"
                  }`}
                >
                  {faq.question}
                </h2>
                <span
                  className={`ml-4 transition-all duration-500 ease-out text-lg ${
                    openIndex === index 
                      ? "rotate-90 text-blue-400" 
                      : "rotate-0 " + (isDarkMode ? "text-slate-400" : "text-slate-600")
                  }`}
                  aria-hidden="true"
                >
                  ▶
                </span>
              </button>
              <div
                id={`faq-answer-${index}`}
                className={`pl-14 pr-6 pb-5 transition-all duration-600 ease-out ${
                  openIndex === index
                    ? "max-h-[400px] opacity-100 visible"
                    : "max-h-0 opacity-0 invisible"
                }`}
                style={{ overflow: 'hidden' }}
                aria-hidden={openIndex !== index}
              >
                <p
                  className={`text-sm leading-relaxed transition-colors duration-500 ease-out pt-2 ${
                    openIndex === index
                      ? isDarkMode 
                        ? "text-slate-200" 
                        : "text-slate-800"
                      : isDarkMode 
                        ? "text-slate-300" 
                        : "text-slate-700"
                  }`}
                >
                  {faq.answer}
                </p>
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
