"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Loader2, MessageCircle, Sparkles, TrendingUp, Target, X, ChevronDown, ChevronUp, Twitter } from "lucide-react"
import Image from "next/image"
import type { AuthUser } from "../utils/supabase-auth"
import { AuthModal } from "./auth-modal"
import { ElegantDetailedAnalysis } from "./elegant-detailed-analysis"
import { CompactQuotaDisplay } from "./compact-quota-display"
import { analyzeMarketWithQuota, chatWithMarketBotWithQuota } from "../actions/market-analysis-with-quota"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingDown, PieChart, Gem } from "lucide-react"
import { ElegantMarketCapAnalysis } from "./elegant-market-cap-analysis"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface ElegantCocoriAIWidgetProps {
  user: AuthUser | null
  isDarkMode: boolean
  onAuthSuccess: () => void
  onExpansionChange?: (isExpanded: boolean) => void
  dashboardWidth?: number
}

const MODEL_OPTIONS = [
  { value: "auto", label: "Auto (Best)" },
  { value: "llama-3.1-8b-instant", label: "Groq Llama 3.1 8B" },
  { value: "openrouter-mistral-small-3.2-24b", label: "Mistral Small 24B" },
  { value: "openrouter-qwen3-235b-a22b", label: "Qwen3 235B" },
  { value: "openrouter-gemma-3-27b-it", label: "Gemma 27B" },
  { value: "openrouter-gpt-4o-mini-2024-07-18", label: "GPT-4o Mini" },
  { value: "openrouter-gbtoss", label: "GPT OSS 20B" },
]

export function ElegantCocoriAIWidget({
  user,
  isDarkMode,
  onAuthSuccess,
  onExpansionChange,
  dashboardWidth = 0,
}: ElegantCocoriAIWidgetProps) {
  // Top-level render log
  if (typeof window !== "undefined") {
    console.log("[DEBUG] ElegantCocoriAIWidget rendered. user:", user)
  }

  const [isExpanded, setIsExpanded] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [analysis, setAnalysis] = useState<string>("")
  const [detailedAnalysis, setDetailedAnalysis] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [detailedLoading, setDetailedLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"chat" | "analysis">("analysis")
  const [showDetailed, setShowDetailed] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [capAnalysisData, setCapAnalysisData] = useState<any>(null)
  const [riskIndicatorsData, setRiskIndicatorsData] = useState<any[]>([])
  const [quotaRefreshKey, setQuotaRefreshKey] = useState(0)
  const [quotaExceededMessage, setQuotaExceededMessage] = useState<string>("")
  const [streamingMessage, setStreamingMessage] = useState("")
  const [selectedModel, setSelectedModel] = useState("auto")

  // Refs for animation
  const widgetRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const connectorRef = useRef<HTMLDivElement>(null)

  // Measured dimensions
  const [widgetPosition, setWidgetPosition] = useState({ x: 0, y: 0, width: 0 })
  const [panelWidth, setPanelWidth] = useState(0)
  const [dashboardOffset, setDashboardOffset] = useState(0)

  const scrollToBottom = () => {
    const container = messagesContainerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }

  useEffect(() => {
    scrollToBottom()
    if (chatInputRef.current) {
      chatInputRef.current.focus()
    }
  }, [chatMessages])

  // Measure widget position and dashboard dimensions
  const measureDimensions = useCallback(() => {
    if (widgetRef.current) {
      const rect = widgetRef.current.getBoundingClientRect()
      const dashboardContainer = widgetRef.current.closest("[class*='max-w-[']")

      if (dashboardContainer) {
        const dashboardRect = dashboardContainer.getBoundingClientRect()
        const widgetRect = widgetRef.current.getBoundingClientRect()

        setWidgetPosition({
          x: rect.left,
          y: rect.bottom,
          width: rect.width,
        })

        setPanelWidth(dashboardRect.width)
        // Calculate offset from widget to dashboard left edge
        setDashboardOffset(dashboardRect.left - widgetRect.left)
      } else if (dashboardWidth > 0) {
        setPanelWidth(dashboardWidth)
      }
    }
  }, [dashboardWidth])

  useEffect(() => {
    measureDimensions()
    window.addEventListener("resize", measureDimensions)
    return () => window.removeEventListener("resize", measureDimensions)
  }, [measureDimensions])

  const handleExpansionToggle = useCallback(
    async (expand: boolean, tab?: "chat" | "analysis") => {
      if (!user && expand) return

      setIsAnimating(true)
      measureDimensions()

      if (expand) {
        if (tab) setActiveTab(tab)
        setIsExpanded(true)
        onExpansionChange?.(true)

        // Wait for DOM update then start animation
        await new Promise((resolve) => setTimeout(resolve, 50))
      } else {
        setIsExpanded(false)
        onExpansionChange?.(false)
        setShowDetailed(false)
      }

      // Animation duration
      setTimeout(() => {
        setIsAnimating(false)
      }, 600)
    },
    [user, onExpansionChange, measureDimensions],
  )

  const handleQuotaError = (error: any) => {
    setQuotaExceededMessage(
      "You have reached your monthly AI quota. Please upgrade your plan for more requests, or wait until your quota resets next month."
    )
  }

  const handleAnalyzeMarket = async () => {
    console.log("[DEBUG] handleAnalyzeMarket called")
    if (!user) return

    setLoading(true)
    await handleExpansionToggle(true, "analysis")

    let timeoutId: NodeJS.Timeout | null = null
    try {
      console.log("[DEBUG] Calling analyzeMarketWithQuota...")
      timeoutId = setTimeout(() => {
        console.warn("[DEBUG] analyzeMarketWithQuota is taking longer than 5 seconds...")
      }, 5000)

      const result = await analyzeMarketWithQuota(user, false, selectedModel)
      if (timeoutId) clearTimeout(timeoutId)
      console.log("[DEBUG] analyzeMarketWithQuota result:", result)

      if (!result) {
        console.error("[DEBUG] analyzeMarketWithQuota returned undefined or null result")
      }

      if ("needUpgrade" in result) {
        handleQuotaError(result)
        return
      }

      setAnalysis(result.analysis)
      setCapAnalysisData(result.capAnalysis)
      setRiskIndicatorsData(result.riskIndicators || [])
      setQuotaRefreshKey((prev) => prev + 1)
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId)
      console.error("[DEBUG] Error in handleAnalyzeMarket:", error)
      setAnalysis("Sorry, there was an error analyzing the market. Please try again! 🐓")
    } finally {
      setLoading(false)
    }
  }

  const handleDetailedAnalysis = async () => {
    if (!user) return

    setDetailedLoading(true)
    try {
      const result = await analyzeMarketWithQuota(user, true, selectedModel)

      if ("needUpgrade" in result) {
        handleQuotaError(result)
        return
      }

      setDetailedAnalysis(result.analysis)
      if (result.capAnalysis) {
        setCapAnalysisData(result.capAnalysis)
      }
      if (result.riskIndicators) {
        setRiskIndicatorsData(result.riskIndicators)
      }
      setShowDetailed(true)
      setQuotaRefreshKey((prev) => prev + 1)
    } catch (error) {
      console.error("Error getting detailed analysis:", error)
      setDetailedAnalysis("Sorry, there was an error getting detailed insights. Please try again! 🐓")
    } finally {
      setDetailedLoading(false)
    }
  }

  const handleChatToggle = async () => {
    if (!user) return
    await handleExpansionToggle(true, "chat")
  }

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !user) return

    const userMessage: ChatMessage = {
      role: "user",
      content: chatInput,
      timestamp: new Date(),
    }

    setChatMessages((prev) => [...prev, userMessage])
    setChatInput("")
    setChatLoading(true)
    setStreamingMessage("")
    setTimeout(() => {
      if (chatInputRef.current) {
        chatInputRef.current.focus()
      }
    }, 0)

    try {
      // Use robust server action for market chat
      const result = await chatWithMarketBotWithQuota(user, chatInput, selectedModel)
      if (result && 'response' in result && typeof result.response === "string") {
        const botMessage: ChatMessage = {
          role: "assistant",
          content: result.response,
          timestamp: new Date(),
        }
        setChatMessages((prev) => [...prev, botMessage])
        setQuotaRefreshKey((prev) => prev + 1)
      } else if (result && 'needUpgrade' in result && result.needUpgrade) {
        // Handle quota error if needed
        setQuotaExceededMessage(result.message || "You've reached your quota.")
      } else {
        setChatMessages((prev) => [...prev, {
          role: "assistant",
          content: "Sorry, I'm having trouble right now. Please try again! 🐓",
          timestamp: new Date(),
        }])
      }
    } catch (error) {
      console.error("Error in chat:", error)
      setChatMessages((prev) => [...prev, {
        role: "assistant",
        content: "Sorry, I'm having trouble right now. Please try again! 🐓",
        timestamp: new Date(),
      }])
    } finally {
      setChatLoading(false)
      setStreamingMessage("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      e.stopPropagation()
      handleSendMessage()
      // Refocus input after Enter
      setTimeout(() => {
        if (chatInputRef.current) {
          chatInputRef.current.focus()
        }
      }, 0)
    }
  }

  const cardClass = isDarkMode ? "bg-slate-800/50 border-slate-700/30" : "bg-white/80 border-slate-200/50"
  const textClass = isDarkMode ? "text-slate-100" : "text-slate-900"
  const mutedTextClass = isDarkMode ? "text-slate-400" : "text-slate-600"

  // Parse the concise analysis
  const parseAnalysis = (analysis: string) => {
    const sections = {
      marketSentiment: "",
      insights: [] as string[],
      alerts: "",
      actions: "",
      migration: "",
    }
    let currentSection = ""
    const lines = analysis.split("\n").map((line) => line.trim())
    for (const line of lines) {
      // New format
      if (line.startsWith("MARKET SENTIMENT:")) {
        currentSection = "marketSentiment"
        sections.marketSentiment = line.replace("MARKET SENTIMENT:", "").trim()
        continue
      }
      if (line.startsWith("TOP 3 INSIGHTS:")) {
        currentSection = "insights"
        continue
      }
      if (line.startsWith("RISK INDICATORS:")) {
        currentSection = "alerts"
        continue
      }
      if (line.startsWith("MIGRATION & DELISTING ALERTS:")) {
        currentSection = "migration"
        sections.migration = line.replace("MIGRATION & DELISTING ALERTS:", "").trim()
        continue
      }
      if (line.startsWith("ACTION SUGGESTED:")) {
        currentSection = "actions"
        sections.actions = line.replace("ACTION SUGGESTED:", "").trim()
        continue
      }
      // Backward compatibility (old format)
      if (line.startsWith("## Market Pulse")) {
        currentSection = "marketSentiment"
        continue
      }
      if (line.startsWith("## Key Insights")) {
        currentSection = "insights"
        continue
      }
      if (line.startsWith("## Critical Risks")) {
        currentSection = "alerts"
        continue
      }
      if (line.startsWith("## Actionable Takeaway")) {
        currentSection = "actions"
        continue
      }
      if (line.startsWith("MIGRATION & EXCHANGE ALERTS:") || line.startsWith("## MIGRATION & EXCHANGE ALERTS")) {
        currentSection = "migration"
        sections.migration = line.replace(/^(MIGRATION & EXCHANGE ALERTS:|## MIGRATION & EXCHANGE ALERTS)/, "").trim()
        continue
      }
      // Section content
      if (currentSection === "marketSentiment" && line) {
        sections.marketSentiment += (sections.marketSentiment ? "\n" : "") + line
      } else if (currentSection === "insights" && line) {
        if (line.startsWith("- ") || line.startsWith("•") || /^\d+\. /.test(line)) {
          sections.insights.push(line.replace(/^(- |•|\d+\. )/, "").trim())
        } else {
          sections.insights.push(line)
        }
      } else if (currentSection === "alerts" && line) {
        sections.alerts += (sections.alerts ? "\n" : "") + line
      } else if (currentSection === "actions" && line) {
        sections.actions += (sections.actions ? "\n" : "") + line
      } else if (currentSection === "migration" && line) {
        sections.migration += (sections.migration ? "\n" : "") + line
      }
    }
    return sections
  }

  const parsedAnalysis = analysis ? parseAnalysis(analysis) : null

  // Debug logging (always run on render)
  if (typeof window !== "undefined") {
    console.log("[DEBUG] analysis:", analysis)
    console.log("[DEBUG] parsedAnalysis:", parsedAnalysis)
    console.log("[DEBUG] showDetailed:", showDetailed)
  }

  // Helper for random tweet phrasing
  function getRandomTweetText(type: 'sentiment' | 'gems', data: any) {
    const userHandles = [
      'crypto enthusiast', 'blockchain believer', 'DeFi explorer', 'CocoriCoin user', 'market watcher', 'portfolio optimizer', 'trend spotter', 'altcoin hunter', 'hodler', 'egg staker'
    ]
    const intros = [
      '🚀 Just got my AI-powered market scoop:',
      '🤖 My crypto AI advisor says:',
      '🐔 CocoriAI just dropped this:',
      '💡 Here\'s my latest crypto insight:',
      '🔥 Market pulse from my dashboard:',
      '🦾 AI market check-in:',
      '🌐 Crypto update from CocoriCoin:',
      '📊 Portfolio AI says:',
      '🧠 AI market wisdom:',
      '🔍 My crypto radar:'
    ]
    const outros = [
      'What do you think?',
      'Stay sharp!',
      'Let\'s ride the trend!',
      'More at CocoriCoin.com',
      'Powered by #CocoriAI',
      'Eggs up! 🥚',
      'DYOR but this is 🔥',
      'Crypto never sleeps!',
      'Sharing for my fellow degens!',
      'Let\'s make it! 🚀'
    ]
    function pick(arr: string[]) { return arr[Math.floor(Math.random() * arr.length)] }
    if (type === 'sentiment') {
      const intro = pick(intros)
      const outro = pick(outros)
      const user = pick(userHandles)
      const sentiment = data.marketSentiment ? `Market: ${data.marketSentiment}` : ''
      const insights = data.insights && data.insights.length > 0 ? `Key insights: ${data.insights.slice(0,2).join('; ')}` : ''
      return `${intro}\n(${user})\n${sentiment}\n${insights}\n${outro} #CocoriCoin`.slice(0, 280)
    } else {
      const intro = pick(intros)
      const outro = pick(outros)
      const gems = data.capAnalysis ? `Gem picks: ${Object.values(data.capAnalysis).map((cat: any) => cat.compositeScore?.name).filter(Boolean).join(', ')}` : ''
      const risks = data.migration ? `Risks/alerts: ${data.migration}` : ''
      return `${intro}\n${gems}\n${risks}\n${outro} #CocoriCoin`.slice(0, 280)
    }
  }

  return (
    <div className="relative">
      {/* Compact Widget Button */}
      <div
        ref={widgetRef}
        className={`h-12 rounded-2xl transition-all duration-300 backdrop-blur-md shadow-lg border-0 overflow-hidden relative z-20 ${
          isDarkMode
            ? "bg-slate-800/60 hover:bg-slate-800/80 border-slate-700/50"
            : "bg-white/80 hover:bg-white/90 border-slate-200/50"
        } ${isExpanded ? "shadow-2xl" : ""}`}
      >
        <div className="h-full flex items-center">
          {user ? (
            <div className="flex items-center w-full px-4 gap-3">
              {/* CocoriAI Logo - Larger and no gold background */}
              <div className="flex items-center gap-3">
                <Image src="/ailogo.png" alt="CocoriAI" width={28} height={28} className="drop-shadow-lg" />
                <span className={`text-sm font-bold ${textClass}`}>CocoriAI</span>
              </div>
              {/* Model select dropdown */}
              <div className="ml-4">
                <select
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
                  className={`rounded-lg px-2 py-1 text-xs font-medium border ${isDarkMode ? "bg-slate-800/70 text-slate-100 border-slate-700" : "bg-white/80 text-slate-900 border-slate-300"}`}
                  style={{ minWidth: 120 }}
                  title="Choose AI model"
                >
                  {MODEL_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {/* Action Buttons */}
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  onClick={handleAnalyzeMarket}
                  disabled={loading || isAnimating}
                  size="sm"
                  className={`bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-lg px-3 py-1.5 text-xs font-semibold shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 ${
                    activeTab === "analysis" && isExpanded ? "ring-2 ring-amber-300" : ""
                  }`}
                >
                  {loading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 mr-1" />
                      Analyze
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleChatToggle}
                  disabled={isAnimating}
                  size="sm"
                  className={`bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg px-3 py-1.5 text-xs font-semibold shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 ${
                    activeTab === "chat" && isExpanded ? "ring-2 ring-blue-300" : ""
                  }`}
                >
                  <MessageCircle className="w-3 h-3 mr-1" />
                  Chat
                </Button>

                <Button
                  onClick={() => handleExpansionToggle(!isExpanded)}
                  variant="ghost"
                  size="sm"
                  disabled={isAnimating}
                  className={`p-1.5 rounded-lg transition-all duration-300 ${
                    isDarkMode ? "hover:bg-slate-700/50" : "hover:bg-slate-100/50"
                  }`}
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-full px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Image src="/ailogo.png" alt="CocoriAI" width={28} height={28} className="drop-shadow-lg" />
                  <span className={`text-sm font-bold ${textClass}`}>CocoriAI</span>
                </div>

                <AuthModal
                  isDarkMode={isDarkMode}
                  onAuthSuccess={onAuthSuccess}
                  triggerButton={
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-lg px-3 py-1.5 text-xs font-semibold shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      Try for Free
                    </Button>
                  }
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Boomerang Connector - Positioned relative to widget center */}
      <div
        ref={connectorRef}
        className={`absolute left-1/2 top-full transition-all duration-500 ease-out transform-gpu ${
          isExpanded ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
        style={{
          width: "2px",
          height: isExpanded ? "20px" : "0px",
          background: isDarkMode
            ? "linear-gradient(to bottom, rgba(148, 163, 184, 0.5), rgba(148, 163, 184, 0.1))"
            : "linear-gradient(to bottom, rgba(71, 85, 105, 0.3), rgba(71, 85, 105, 0.1))",
          transformOrigin: "top center",
          transform: "translateX(-50%)",
          zIndex: 15,
        }}
      />

      {/* Expanded Panel - Positioned to align with dashboard */}
      <div
        className={`absolute top-full mt-5 transition-all duration-600 ease-out transform-gpu ${
          isExpanded ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-4"
        }`}
        style={{
          width: isExpanded ? `${panelWidth}px` : `${widgetPosition.width}px`,
          left: isExpanded ? `${dashboardOffset}px` : "0px",
          transformOrigin: "top center",
          zIndex: 10,
        }}
      >
        <div
          ref={panelRef}
          className={`rounded-2xl ${cardClass} backdrop-blur-md shadow-2xl border overflow-hidden transition-all duration-600 ease-out ${
            isExpanded ? "max-h-[375px]" : "max-h-0"
          }`}
        >
          {/* Header with Quota and Close */}
          <div className="relative overflow-hidden">
            <div
              className={`p-4 ${isDarkMode ? "bg-gradient-to-r from-slate-800/80 via-blue-900/40 to-slate-800/80" : "bg-gradient-to-r from-blue-50/80 via-sky-100/60 to-blue-50/80"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-base font-bold ${textClass}`}>Market Intelligence</h3>
                    <div
                      className={`w-2 h-2 rounded-full ${loading || chatLoading ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`}
                    ></div>
                  </div>

                  {/* Quota Display - Only shown when expanded */}
                  {user && <CompactQuotaDisplay user={user} isDarkMode={isDarkMode} refreshKey={quotaRefreshKey} />}
                </div>

                <div className="flex items-center gap-2">
                  {/* Tab Indicators */}
                  <div className="flex items-center gap-1">
                    <div
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        activeTab === "analysis"
                          ? "bg-amber-400 scale-125"
                          : isDarkMode
                            ? "bg-slate-600"
                            : "bg-slate-300"
                      }`}
                    ></div>
                    <div
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        activeTab === "chat" ? "bg-blue-400 scale-125" : isDarkMode ? "bg-slate-600" : "bg-slate-300"
                      }`}
                    ></div>
                  </div>

                  <Button
                    onClick={() => handleExpansionToggle(false)}
                    variant="ghost"
                    size="sm"
                    className={`p-2 rounded-lg transition-all duration-300 ${
                      isDarkMode
                        ? "hover:bg-slate-700/50 text-slate-400 hover:text-slate-200"
                        : "hover:bg-slate-100/50 text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Content - Reduced height */}
          <div className="h-[315px] overflow-y-auto p-4">
            {quotaExceededMessage && (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <div className="text-2xl mb-2">🐔</div>
                <div className={`font-semibold text-base mb-2 ${isDarkMode ? "text-amber-300" : "text-amber-700"}`}>Quota Exhausted</div>
                <div className={`mb-4 text-xs ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>{quotaExceededMessage}</div>
                <Button
                  asChild
                  className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-xl px-4 py-2 text-xs font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <a href="/plans">Upgrade Plan</a>
                </Button>
              </div>
            )}
            {!quotaExceededMessage && (
              <>
                {activeTab === "chat" && (
                  <div className="space-y-3 h-full flex flex-col">
                    <div ref={messagesContainerRef} className={`flex-1 overflow-y-auto p-3 rounded-xl ${cardClass} border space-y-3`}>
                      {chatMessages.length === 0 && (
                        <div className="text-center py-6">
                          <div className="relative mb-3">
                            <Image
                              src="/ailogo.png"
                              alt="CocoriAI"
                              width={40}
                              height={40}
                              className="relative mx-auto drop-shadow-lg"
                            />
                          </div>
                          <h3 className={`text-base font-semibold mb-2 ${textClass}`}>Market Intelligence Chat 🐓</h3>
                          <p className={`${mutedTextClass} max-w-md mx-auto text-xs`}>
                            Ask me about market trends, specific coins, or trading opportunities based on CocoriCoin data!
                          </p>
                        </div>
                      )}

                      {chatMessages.map((message, index) => (
                        <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[80%] p-2 rounded-xl shadow-lg font-sans font-[Inter,system-ui,sans-serif] text-[15px] font-medium ${
                              message.role === "user"
                                ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-white"
                                : isDarkMode
                                  ? "bg-slate-700/50 text-slate-100 border border-slate-600/30"
                                  : "bg-white text-slate-900 border border-slate-200/50"
                            }`}
                          >
                            <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
                          </div>
                        </div>
                      ))}

                      {/* Show streaming message if present */}
                      {streamingMessage && (
                        <div className="flex justify-start">
                          <div className={`p-2 rounded-xl font-sans font-[Inter,system-ui,sans-serif] text-lg font-medium ${isDarkMode ? "bg-slate-700/50" : "bg-white border border-slate-200/50"} shadow-lg animate-pulse flex items-center`}>
                            <div className="whitespace-pre-wrap leading-relaxed">
                              {streamingMessage}
                              <span className="blinking-cursor-block ml-1">█</span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div ref={chatEndRef} />
                    </div>

                    <div className="flex gap-2">
                      <Input
                        ref={chatInputRef}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask about market trends, specific coins..."
                        className={`flex-1 rounded-xl h-8 text-lg font-medium ${isDarkMode ? "bg-slate-700/50 border-slate-600/50" : "bg-white border-slate-200"} shadow-lg`}
                        disabled={chatLoading}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={chatLoading || !chatInput.trim()}
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl px-3 h-8 shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <Send className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {activeTab === "analysis" && (
                  <div className="h-full overflow-y-auto">
                    {!analysis && !loading && (
                      <div className="text-center py-6">
                        <div className="relative mb-3">
                          <Image
                            src="/ailogo.png"
                            alt="CocoriAI"
                            width={48}
                            height={48}
                            className="relative mx-auto drop-shadow-lg"
                          />
                        </div>
                        <h3 className={`text-base font-semibold mb-2 ${textClass}`}>Ready to analyze the market!</h3>
                        <p className={`${mutedTextClass} mb-3 max-w-md mx-auto text-xs`}>
                          Get AI-powered insights on market trends, top performers, and emerging opportunities from
                          CocoriCoin data.
                        </p>
                        <Button
                          onClick={handleAnalyzeMarket}
                          className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-xl px-4 py-2 text-xs font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          <Sparkles className="w-3 h-3 mr-2" />
                          Start Analysis
                        </Button>
                      </div>
                    )}

                    {loading && (
                      <div className="text-center py-6">
                        <div className="relative mb-3">
                          <Loader2 className="w-10 h-10 animate-spin mx-auto text-amber-500" />
                        </div>
                        <h3 className={`text-base font-semibold mb-2 ${textClass}`}>Analyzing Market Data...</h3>
                        <p className={`${mutedTextClass} text-xs`}>
                          Processing cryptocurrency data and generating insights
                        </p>
                      </div>
                    )}

                    {analysis && parsedAnalysis && !showDetailed && (
                      <div className="space-y-3">
                        {/* Market Sentiment */}
                        {parsedAnalysis.marketSentiment && (
                          <div
                            className={`p-3 rounded-xl ${isDarkMode ? "bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border-blue-700/50" : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"} border`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp className={`w-4 h-4 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
                              <h3 className={`text-xs font-semibold tracking-wide uppercase ${textClass}`}>Market Sentiment</h3>
                            </div>
                            <p className={`${textClass} leading-snug text-xs font-medium opacity-80`}>{parsedAnalysis.marketSentiment}</p>
                            {/* Tweet Button for Sentiment & Insights */}
                            <a
                              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(getRandomTweetText('sentiment', { ...parsedAnalysis, capAnalysis: capAnalysisData }))}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-1 mt-2 rounded bg-blue-500 text-white hover:bg-blue-600 transition font-semibold shadow-sm"
                              title="Share market sentiment & insights on Twitter"
                            >
                              <Twitter className="w-4 h-4" />
                              Tweet sentiment & insights
                            </a>
                          </div>
                        )}
                        {/* Top Insights */}
                        {parsedAnalysis.insights && parsedAnalysis.insights.length > 0 && (
                          <div className={`p-3 rounded-xl ${cardClass} border`}>
                            <div className="flex items-center gap-2 mb-2">
                              <Target className={`w-4 h-4 ${isDarkMode ? "text-amber-400" : "text-amber-600"}`} />
                              <h3 className={`text-xs font-semibold tracking-wide uppercase ${textClass}`}>Key Market Insights</h3>
                            </div>
                            <div className="space-y-2">
                              {parsedAnalysis.insights.slice(0, 2).map((insight, index) => (
                                <div key={index} className="flex items-start gap-2">
                                  <div
                                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[0.8rem] font-bold ${
                                      index === 0
                                        ? isDarkMode
                                          ? "bg-green-500/20 text-green-300"
                                          : "bg-green-100 text-green-700"
                                        : isDarkMode
                                          ? "bg-blue-500/20 text-blue-300"
                                          : "bg-blue-100 text-blue-700"
                                    }`}
                                  >
                                    {index + 1}
                                  </div>
                                  <p className={`${textClass} text-xs leading-snug flex-1 font-medium opacity-90`}>{insight}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Cap Category Cards: Low Cap, Mid Cap, High Cap */}
                        {capAnalysisData && (
                          <ElegantMarketCapAnalysis capAnalysis={capAnalysisData} isDarkMode={isDarkMode} />
                        )}
                        {/* Migration & Exchange Alerts */}
                        {parsedAnalysis.migration && (
                          <div className={`p-4 rounded-xl bg-gradient-to-r from-pink-500/80 to-yellow-400/80 border-0 shadow-xl flex items-start gap-3 my-2`}> 
                            <PieChart className="w-6 h-6 text-white mt-1" />
                            <div>
                              <h3 className="text-xs font-semibold tracking-wide uppercase text-white mb-1">Migration & Exchange Alerts</h3>
                              <p className="text-white text-xs whitespace-pre-line opacity-90">{parsedAnalysis.migration}</p>
                            </div>
                          </div>
                        )}
                        {/* Tweet Button for Gems & Risks */}
                        {(capAnalysisData || parsedAnalysis.migration) && (parsedAnalysis.migration && parsedAnalysis.migration.trim().length > 0) && (
                          <a
                            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(getRandomTweetText('gems', { ...parsedAnalysis, capAnalysis: capAnalysisData }))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1 mt-2 rounded bg-purple-600 text-white hover:bg-purple-700 transition font-semibold shadow-sm"
                            title="Share gems & risks on Twitter"
                          >
                            <Twitter className="w-4 h-4" />
                            Tweet gems & risks
                          </a>
                        )}
                        {/* More Details Button */}
                        <div className="pt-2">
                          <Button
                            onClick={handleDetailedAnalysis}
                            disabled={detailedLoading}
                            className={`w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl py-2 text-xs font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]`}
                          >
                            {detailedLoading ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                Getting Detailed Insights...
                              </>
                            ) : (
                              <>
                                <TrendingUp className="w-3 h-3 mr-2" />
                                More Detailed Insights
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Detailed Analysis */}
                    {showDetailed && detailedAnalysis && (
                      <ElegantDetailedAnalysis
                        analysis={detailedAnalysis}
                        riskIndicators={riskIndicatorsData}
                        isDarkMode={isDarkMode}
                        onBack={() => setShowDetailed(false)}
                      />
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Removed old Upgrade Modal usage in favor of inline message + link to /plans */}

      {/* Add CSS for blinking cursor */}
      <style jsx global>{`
        .blinking-cursor-block {
          font-weight: bold;
          font-size: 1.3em;
          color: #f59e42;
          opacity: 1;
          animation: blink-block 0.7s steps(2, start) infinite;
          vertical-align: middle;
          margin-left: 2px;
        }
        @keyframes blink-block {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
