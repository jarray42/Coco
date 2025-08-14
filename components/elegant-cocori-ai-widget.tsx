"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Send,
  Loader2,
  MessageCircle,
  Sparkles,
  TrendingUp,
  Target,
  X,
  ChevronDown,
  ChevronUp,
  Twitter,
  TrendingDown,
  Crown,
} from "lucide-react"
import Image from "next/image"
import type { AuthUser } from "../utils/supabase-auth"
import { AuthModal } from "./auth-modal"
import { ElegantDetailedAnalysis } from "./elegant-detailed-analysis"
import { CompactQuotaDisplay } from "./compact-quota-display"
import { analyzeMarketWithQuota, chatWithMarketBotWithQuota } from "../actions/market-analysis-with-quota"
import { PieChart, Gem } from "lucide-react"

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
  const [panelLeft, setPanelLeft] = useState(0)

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
        const offset = dashboardRect.left - widgetRect.left
        setDashboardOffset(offset)
        setPanelLeft(offset)
      } else if (dashboardWidth > 0) {
        setPanelWidth(dashboardWidth)
        setPanelLeft(0)
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
      // Measure before toggling
      measureDimensions()

      if (expand) {
        if (tab) setActiveTab(tab)
        setIsExpanded(true)
        onExpansionChange?.(true)

        // Wait for DOM update then start animation
        await new Promise((resolve) => setTimeout(resolve, 50))
        // Re-measure after expansion to ensure correct alignment during loading
        measureDimensions()
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

  // Re-measure when expanded state changes to keep panel aligned immediately
  useEffect(() => {
    if (isExpanded) {
      measureDimensions()
      const rafId = requestAnimationFrame(() => measureDimensions())
      const timeoutId = setTimeout(() => measureDimensions(), 250)
      return () => {
        cancelAnimationFrame(rafId)
        clearTimeout(timeoutId)
      }
    }
  }, [isExpanded, measureDimensions])

  // Re-measure when content state changes to keep alignment stable after analysis finishes
  useEffect(() => {
    if (isExpanded) {
      measureDimensions()
    }
  }, [loading, analysis, detailedLoading, showDetailed, measureDimensions, isExpanded])

  const handleQuotaError = (error: any) => {
    setQuotaExceededMessage(
      "You have reached your monthly AI quota. Please upgrade your plan for more requests, or wait until your quota resets next month.",
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

      if ("error" in (result as any)) {
        setAnalysis("Sorry, market data service is busy. Please try again in a moment! 🐓")
        return
      }

      if ("needUpgrade" in (result as any)) {
        handleQuotaError(result)
        return
      }

      const success = result as any
      setAnalysis(success.analysis)
      setCapAnalysisData(success.capAnalysis)
      setRiskIndicatorsData(success.riskIndicators || [])
      setQuotaRefreshKey((prev) => prev + 1)
    } catch (error: any) {
      if (timeoutId) clearTimeout(timeoutId)
      console.error("[DEBUG] Error in handleAnalyzeMarket:", error)
      // Distinguish quota vs service error based on shape
      if (error && typeof error === "object" && "needUpgrade" in error) {
        setQuotaExceededMessage(
          (error as any).message ||
            "You have reached your monthly AI quota. Please upgrade your plan for more requests, or wait until your quota resets next month.",
        )
      } else if (error && typeof error === "object" && "error" in error) {
        setAnalysis("Sorry, market data service is busy. Please try again in a moment! 🐓")
      } else {
        setAnalysis("Sorry, there was an error analyzing the market. Please try again! 🐓")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDetailedAnalysis = async () => {
    if (!user) return

    setDetailedLoading(true)
    try {
      const result = await analyzeMarketWithQuota(user, true, selectedModel)

      if ("error" in (result as any)) {
        setDetailedAnalysis("Sorry, market data service is busy. Please try again in a moment! 🐓")
        setShowDetailed(true)
        return
      }

      if ("needUpgrade" in (result as any)) {
        handleQuotaError(result)
        return
      }

      const success = result as any
      setDetailedAnalysis(success.analysis)
      if (success.capAnalysis) {
        setCapAnalysisData(success.capAnalysis)
      }
      if (success.riskIndicators) {
        setRiskIndicatorsData(success.riskIndicators)
      }
      setShowDetailed(true)
      setQuotaRefreshKey((prev) => prev + 1)
    } catch (error) {
      console.error("Error getting detailed analysis:", error)
      setDetailedAnalysis("Sorry, there was an error getting detailed insights. Please try again! 🐓")
      setShowDetailed(true)
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
      if (result && "response" in result && typeof result.response === "string") {
        const botMessage: ChatMessage = {
          role: "assistant",
          content: result.response,
          timestamp: new Date(),
        }
        setChatMessages((prev) => [...prev, botMessage])
        setQuotaRefreshKey((prev) => prev + 1)
      } else if (result && "needUpgrade" in result && result.needUpgrade) {
        // Handle quota error if needed
        setQuotaExceededMessage(result.message || "You've reached your quota.")
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, I'm having trouble right now. Please try again! 🐓",
            timestamp: new Date(),
          },
        ])
      }
    } catch (error) {
      console.error("Error in chat:", error)
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I'm having trouble right now. Please try again! 🐓",
          timestamp: new Date(),
        },
      ])
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
  function getRandomTweetText(type: "sentiment" | "gems", data: any) {
    const userHandles = [
      "crypto enthusiast",
      "blockchain believer",
      "DeFi explorer",
      "CocoriCoin user",
      "market watcher",
      "portfolio optimizer",
      "trend spotter",
      "altcoin hunter",
      "hodler",
      "egg staker",
    ]
    const intros = [
      "🚀 Just got my AI-powered market scoop:",
      "🤖 My crypto AI advisor says:",
      "🐔 CocoriAI just dropped this:",
      "💡 Here's my latest crypto insight:",
      "🔥 Market pulse from my dashboard:",
      "🦾 AI market check-in:",
      "🌐 Crypto update from CocoriCoin:",
      "📊 Portfolio AI says:",
      "🧠 AI market wisdom:",
      "🔍 My crypto radar:",
    ]
    const outros = [
      "What do you think?",
      "Stay sharp!",
      "Let's ride the trend!",
      "More at CocoriCoin.com",
      "Powered by #CocoriAI",
      "Eggs up! 🥚",
      "DYOR but this is 🔥",
      "Crypto never sleeps!",
      "Sharing for my fellow degens!",
      "Let's make it! 🚀",
    ]
    function pick(arr: string[]) {
      return arr[Math.floor(Math.random() * arr.length)]
    }
    if (type === "sentiment") {
      const intro = pick(intros)
      const outro = pick(outros)
      const user = pick(userHandles)
      const sentiment = data.marketSentiment ? `Market: ${data.marketSentiment}` : ""
      const insights =
        data.insights && data.insights.length > 0 ? `Key insights: ${data.insights.slice(0, 2).join("; ")}` : ""
      return `${intro}\n(${user})\n${sentiment}\n${insights}\n${outro} #CocoriCoin`.slice(0, 280)
    } else {
      const intro = pick(intros)
      const outro = pick(outros)
      const gems = data.capAnalysis
        ? `Gem picks: ${Object.values(data.capAnalysis)
            .map((cat: any) => cat.compositeScore?.name)
            .filter(Boolean)
            .join(", ")}`
        : ""
      const risks = data.migration ? `Risks/alerts: ${data.migration}` : ""
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
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className={`rounded-lg px-2 py-1 text-xs font-medium border ${isDarkMode ? "bg-slate-800/70 text-slate-100 border-slate-700" : "bg-white/80 text-slate-900 border-slate-300"}`}
                  style={{ minWidth: 120 }}
                  title="Choose AI model"
                >
                  {MODEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
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
        className={`absolute top-full transition-all duration-500 ease-out transform-gpu ${
          isExpanded ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
        style={{
          width: "2px",
          height: isExpanded ? "20px" : "0px",
          background: isDarkMode
            ? "linear-gradient(to bottom, rgba(148, 163, 184, 0.5), rgba(148, 163, 184, 0.1))"
            : "linear-gradient(to bottom, rgba(71, 85, 105, 0.3), rgba(71, 85, 105, 0.1))",
          transformOrigin: "top center",
          left: `${widgetPosition.width / 2}px`,
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
          left: isExpanded ? `${panelLeft}px` : `${0}px`,
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
                <div className={`font-semibold text-base mb-2 ${isDarkMode ? "text-amber-300" : "text-amber-700"}`}>
                  Quota Exhausted
                </div>
                <div className={`mb-4 text-xs ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                  {quotaExceededMessage}
                </div>
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
                    <div
                      ref={messagesContainerRef}
                      className={`flex-1 overflow-y-auto p-3 rounded-xl ${cardClass} border space-y-3`}
                    >
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
                            Ask me about market trends, specific coins, or trading opportunities based on CocoriCoin
                            data!
                          </p>
                        </div>
                      )}

                      {chatMessages.map((message, index) => (
                        <div
                          key={index}
                          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
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
                          <div
                            className={`p-2 rounded-xl font-sans font-[Inter,system-ui,sans-serif] text-lg font-medium ${isDarkMode ? "bg-slate-700/50" : "bg-white border border-slate-200/50"} shadow-lg animate-pulse flex items-center`}
                          >
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
                      <div className="flex gap-4 h-full">
                        {/* Main Content Area - 75% */}
                        <div className="flex-1 space-y-3 overflow-y-auto pr-2">
                          {/* Market Sentiment Card */}
                          {parsedAnalysis.marketSentiment && (
                            <div
                              className={`group relative overflow-hidden rounded-xl transition-all duration-300 hover:scale-[1.01] hover:shadow-md cursor-pointer ${
                                isDarkMode
                                  ? "bg-slate-800/60 border border-slate-700/40 hover:bg-slate-800/80"
                                  : "bg-white/90 border border-slate-200/60 hover:bg-white"
                              }`}
                            >
                              {/* Colored top border */}
                              <div className="h-1 bg-gradient-to-r from-blue-400 to-cyan-400"></div>

                              <div className="p-4">
                                <div className="flex items-start gap-3">
                                  <div className={`p-2 rounded-lg ${isDarkMode ? "bg-blue-500/10" : "bg-blue-50"}`}>
                                    <TrendingUp
                                      className={`w-4 h-4 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className={`text-sm font-semibold mb-2 ${textClass}`}>Market Sentiment</h3>
                                    <p className={`${mutedTextClass} text-xs leading-relaxed line-clamp-3`}>
                                      {parsedAnalysis.marketSentiment}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Key Insights Card */}
                          {parsedAnalysis.insights && parsedAnalysis.insights.length > 0 && (
                            <div
                              className={`group relative overflow-hidden rounded-xl transition-all duration-300 hover:scale-[1.01] hover:shadow-md cursor-pointer ${
                                isDarkMode
                                  ? "bg-slate-800/60 border border-slate-700/40 hover:bg-slate-800/80"
                                  : "bg-white/90 border border-slate-200/60 hover:bg-white"
                              }`}
                            >
                              {/* Colored top border */}
                              <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-400"></div>

                              <div className="p-4">
                                <div className="flex items-start gap-3">
                                  <div className={`p-2 rounded-lg ${isDarkMode ? "bg-amber-500/10" : "bg-amber-50"}`}>
                                    <Target className={`w-4 h-4 ${isDarkMode ? "text-amber-400" : "text-amber-600"}`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className={`text-sm font-semibold mb-3 ${textClass}`}>Key Insights</h3>
                                    <div className="space-y-2">
                                      {parsedAnalysis.insights.slice(0, 2).map((insight, index) => (
                                        <div key={index} className="flex items-start gap-2">
                                          <div
                                            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium mt-0.5 flex-shrink-0 ${
                                              isDarkMode ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600"
                                            }`}
                                          >
                                            {index + 1}
                                          </div>
                                          <p className={`${mutedTextClass} text-xs leading-relaxed flex-1`}>
                                            {insight}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Market Cap Analysis */}
                          {capAnalysisData && (
                            <div
                              className={`group relative overflow-hidden rounded-xl transition-all duration-300 hover:scale-[1.01] hover:shadow-md cursor-pointer ${
                                isDarkMode
                                  ? "bg-slate-800/60 border border-slate-700/40 hover:bg-slate-800/80"
                                  : "bg-white/90 border border-slate-200/60 hover:bg-white"
                              }`}
                            >
                              <div className="p-4">
                                <div className="flex items-start gap-3 mb-4">
                                  <div className={`p-2 rounded-lg ${isDarkMode ? "bg-purple-500/10" : "bg-purple-50"}`}>
                                    <Gem className={`w-4 h-4 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className={`text-sm font-semibold ${textClass}`}>Market Cap Gems 💎</h3>
                                    <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-600"} mt-1`}>
                                      Discover promising coins across market caps
                                    </p>
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  {Object.entries(capAnalysisData).map(([category, data]: [string, any]) => {
                                    if (!data?.gems || data.gems.length === 0) return null

                                    const categoryColors = {
                                      "Low Cap": {
                                        badge: isDarkMode
                                          ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                                          : "bg-purple-100 text-purple-700 border-purple-200",
                                        gradient: "from-purple-500 to-purple-600",
                                        dot: "bg-purple-500",
                                      },
                                      "Mid Cap": {
                                        badge: isDarkMode
                                          ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                                          : "bg-blue-100 text-blue-700 border-blue-200",
                                        gradient: "from-blue-500 to-blue-600",
                                        dot: "bg-blue-500",
                                      },
                                      "High Cap": {
                                        badge: isDarkMode
                                          ? "bg-teal-500/20 text-teal-300 border-teal-500/30"
                                          : "bg-teal-100 text-teal-700 border-teal-200",
                                        gradient: "from-teal-500 to-teal-600",
                                        dot: "bg-teal-500",
                                      },
                                    }

                                    const colors =
                                      categoryColors[category as keyof typeof categoryColors] ||
                                      categoryColors["Low Cap"]

                                    return (
                                      <div key={category} className="space-y-3">
                                        {/* Category Badge */}
                                        <div className="flex items-center justify-between">
                                          <div
                                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${colors.badge}`}
                                          >
                                            <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                                            {category}
                                          </div>
                                          <span
                                            className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}
                                          >
                                            {data.gems.length} gems
                                          </span>
                                        </div>

                                        {/* Gem Cards Grid */}
                                    <div className="grid grid-cols-3 gap-2">
                                      {data.gems.slice(0, 3).map((gem: any, index: number) => (
                                        <div
                                          key={`${gem.id || gem.symbol}-${index}`}
                                          className={`group relative overflow-hidden rounded-lg transition-all duration-200 cursor-pointer hover:scale-[1.02] ${
                                            isDarkMode
                                              ? "bg-slate-700/60 border border-slate-600/40 hover:bg-slate-700/80"
                                              : "bg-white/90 border border-slate-200/60 hover:bg-white"
                                          }`}
                                        >
                                          <div className="p-2">
                                            <div className="flex items-center gap-2">
                                              {/* Text block */}
                                              <div className="min-w-0 flex-1">
                                                <div className={`text-[11px] font-bold ${textClass} truncate`} title={gem.name}>
                                                  {gem.name || gem.symbol}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                  <div className={`text-[10px] ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                                                    {gem.price ? (gem.price < 0.01 ? `$${gem.price.toFixed(6)}` : gem.price < 1 ? `$${gem.price.toFixed(4)}` : gem.price < 100 ? `$${gem.price.toFixed(2)}` : `$${gem.price.toLocaleString()}`) : "N/A"}
                                                  </div>
                                                  {gem.priceChange24h !== undefined && (
                                                    <div className="flex items-center gap-0.5">
                                                      {gem.priceChange24h >= 0 ? (
                                                        <TrendingUp className="w-2 h-2 text-green-500" />
                                                      ) : (
                                                        <TrendingDown className="w-2 h-2 text-red-500" />
                                                      )}
                                                      <span className={`text-[10px] ${gem.priceChange24h >= 0 ? "text-green-500" : "text-red-500"}`}>
                                                        {gem.priceChange24h >= 0 ? "+" : ""}
                                                        {gem.priceChange24h.toFixed(1)}%
                                                      </span>
                                                    </div>
                                                  )}
                                                </div>
                                                <div className={`text-[10px] ${isDarkMode ? "text-slate-400" : "text-slate-600"} truncate`}>
                                                  MC {gem.marketCap ? `$${(gem.marketCap as number).toLocaleString()}` : "N/A"}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                  <span className={`text-[10px] ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Project Health</span>
                                                  <span className={`text-[11px] font-bold ${
                                                    (gem.beatScore || gem.compositeScore || 0) >= 80
                                                      ? "text-green-500"
                                                      : (gem.beatScore || gem.compositeScore || 0) >= 60
                                                        ? "text-blue-500"
                                                        : (gem.beatScore || gem.compositeScore || 0) >= 40
                                                          ? "text-yellow-500"
                                                          : (gem.beatScore || gem.compositeScore || 0) >= 20
                                                            ? "text-orange-500"
                                                            : "text-red-500"
                                                  }`}>
                                                    {Math.round(gem.beatScore || gem.compositeScore || 0)}/100
                                                  </span>
                                                </div>
                                              </div>
                                              {/* Logo on right */}
                                              <div className="flex-shrink-0">
                                                {(() => {
                                                  const src = gem.logoUrl || (gem.logoStoragePath ? `https://cocricoin.b-cdn.net/${gem.logoStoragePath}` : null)
                                                  return src ? (
                                                    <img
                                                    src={src}
                                                    alt={`${gem.name} logo`}
                                                    className="w-7 h-7 rounded-md shadow-sm"
                                                    onError={(e) => {
                                                      const target = e.currentTarget as HTMLImageElement
                                                      target.src = "/placeholder.svg"
                                                    }}
                                                    />
                                                  ) : (
                                                  <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold bg-gradient-to-br ${colors.gradient} text-white shadow-sm`}>
                                                    {gem.symbol ? gem.symbol.slice(0, 2).toUpperCase() : <Gem className="w-3 h-3" />}
                                                  </div>
                                                  )
                                                })()}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Migration Alerts */}
                          {parsedAnalysis.migration && (
                            <div
                              className={`group relative overflow-hidden rounded-xl transition-all duration-300 hover:scale-[1.01] hover:shadow-md cursor-pointer ${
                                isDarkMode
                                  ? "bg-red-900/20 border border-red-800/40 hover:bg-red-900/30"
                                  : "bg-red-50/90 border border-red-200/60 hover:bg-red-50"
                              }`}
                            >
                              {/* Colored top border */}
                              <div className="h-1 bg-gradient-to-r from-red-400 to-rose-400"></div>

                              <div className="p-4">
                                <div className="flex items-start gap-3">
                                  <div className={`p-2 rounded-lg ${isDarkMode ? "bg-red-500/10" : "bg-red-100"}`}>
                                    <PieChart className={`w-4 h-4 ${isDarkMode ? "text-red-400" : "text-red-600"}`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3
                                      className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-red-300" : "text-red-700"}`}
                                    >
                                      Migration Alerts
                                    </h3>
                                    <p
                                      className={`text-xs leading-relaxed line-clamp-3 ${isDarkMode ? "text-red-200" : "text-red-800"}`}
                                    >
                                      {parsedAnalysis.migration}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* More Details Button */}
                          <div className="pt-2">
                            <Button
                              onClick={handleDetailedAnalysis}
                              disabled={detailedLoading}
                              className={`w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl py-2.5 text-xs font-medium shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.01] border-0`}
                            >
                              {detailedLoading ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Getting Detailed Insights...
                                </>
                              ) : (
                                <>
                                  <TrendingUp className="w-4 h-4 mr-2" />
                                  More Detailed Insights
                                </>
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Twitter Sidebar - 25% */}
                        <div className="w-24 flex-shrink-0">
                          <div
                            className={`sticky top-0 p-3 rounded-xl transition-all duration-300 ${
                              isDarkMode
                                ? "bg-slate-800/60 border border-slate-700/40"
                                : "bg-white/90 border border-slate-200/60"
                            }`}
                          >
                            <h4 className={`text-xs font-semibold mb-3 ${textClass} text-center`}>Share</h4>
                            <div className="space-y-2">
                              {/* Sentiment Tweet */}
                              {parsedAnalysis.marketSentiment && (
                                <a
                                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(getRandomTweetText("sentiment", { ...parsedAnalysis, capAnalysis: capAnalysisData }))}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="group flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
                                  title="Share sentiment"
                                >
                                  <Twitter className="w-3.5 h-3.5" />
                                  <span className="text-xs font-medium">Sentiment</span>
                                </a>
                              )}

                              {/* Gems Tweet */}
                              {(capAnalysisData || parsedAnalysis.migration) && (
                                <a
                                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(getRandomTweetText("gems", { ...parsedAnalysis, capAnalysis: capAnalysisData }))}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="group flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
                                  title="Share gems & risks"
                                >
                                  <Twitter className="w-3.5 h-3.5" />
                                  <span className="text-xs font-medium">Gems</span>
                                </a>
                              )}
                            </div>
                          </div>
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
