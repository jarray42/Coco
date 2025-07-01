"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Loader2, MessageCircle, Sparkles, TrendingUp, Target, X, ChevronDown, ChevronUp } from "lucide-react"
import Image from "next/image"
import type { AuthUser } from "../utils/supabase-auth"
import { AuthModal } from "./auth-modal"
import { ElegantDetailedAnalysis } from "./elegant-detailed-analysis"
import { CompactQuotaDisplay } from "./compact-quota-display"
import { UpgradeModal } from "./upgrade-modal"
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
  const [capAnalysisData, setCapAnalysisData] = useState<any>(null)
  const [riskIndicatorsData, setRiskIndicatorsData] = useState<any[]>([])
  const [quotaRefreshKey, setQuotaRefreshKey] = useState(0)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  // Refs for animation
  const widgetRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const connectorRef = useRef<HTMLDivElement>(null)

  // Measured dimensions
  const [widgetPosition, setWidgetPosition] = useState({ x: 0, y: 0, width: 0 })
  const [panelWidth, setPanelWidth] = useState(0)
  const [dashboardOffset, setDashboardOffset] = useState(0)

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages])

  // Measure widget position and dashboard dimensions
  const measureDimensions = useCallback(() => {
    if (widgetRef.current) {
      const rect = widgetRef.current.getBoundingClientRect()
      const dashboardContainer = widgetRef.current.closest(".max-w-\\[90rem\\]")

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
    setShowUpgradeModal(true)
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

      const result = await analyzeMarketWithQuota(user, false)
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
      const result = await analyzeMarketWithQuota(user, true)

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

    try {
      const result = await chatWithMarketBotWithQuota(user, chatInput)

      if ("needUpgrade" in result) {
        handleQuotaError(result)
        const errorMessage: ChatMessage = {
          role: "assistant",
          content: "You've reached your monthly AI request limit. Please upgrade to continue! 🐓",
          timestamp: new Date(),
        }
        setChatMessages((prev) => [...prev, errorMessage])
        return
      }

      const botMessage: ChatMessage = {
        role: "assistant",
        content: result.response,
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, botMessage])
      setQuotaRefreshKey((prev) => prev + 1)
    } catch (error) {
      console.error("Error in chat:", error)
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "Sorry, I'm having trouble right now. Please try again! 🐓",
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, errorMessage])
    } finally {
      setChatLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
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
      if (currentSection === "marketSentiment" && line) {
        sections.marketSentiment += (sections.marketSentiment ? "\n" : "") + line
      } else if (currentSection === "insights" && line) {
        // Split insights by bullet or numbered list
        if (line.startsWith("- ") || line.startsWith("•") || /^\d+\. /.test(line)) {
          sections.insights.push(line.replace(/^(- |•|\d+\. )/, "").trim())
        } else {
          // If not a bullet, treat as a paragraph insight
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
            isExpanded ? "max-h-[300px]" : "max-h-0"
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
          <div className="h-56 overflow-y-auto p-4">
            {activeTab === "chat" && (
              <div className="space-y-3 h-full flex flex-col">
                <div className={`flex-1 overflow-y-auto p-3 rounded-xl ${cardClass} border space-y-3`}>
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
                        className={`max-w-[80%] p-2 rounded-xl shadow-lg ${
                          message.role === "user"
                            ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-white"
                            : isDarkMode
                              ? "bg-slate-700/50 text-slate-100 border border-slate-600/30"
                              : "bg-white text-slate-900 border border-slate-200/50"
                        }`}
                      >
                        <div className="whitespace-pre-wrap text-xs leading-relaxed">{message.content}</div>
                        <div className="text-xs mt-1 opacity-70">{message.timestamp.toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))}

                  {chatLoading && (
                    <div className="flex justify-start">
                      <div
                        className={`p-2 rounded-xl ${isDarkMode ? "bg-slate-700/50" : "bg-white border border-slate-200/50"} shadow-lg`}
                      >
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span className="text-xs">Analyzing market data...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about market trends, specific coins..."
                    className={`flex-1 rounded-xl h-8 text-xs ${isDarkMode ? "bg-slate-700/50 border-slate-600/50" : "bg-white border-slate-200"} shadow-lg`}
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
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        user={user!}
        isDarkMode={isDarkMode}
        onUpgradeSuccess={() => {
          setShowUpgradeModal(false)
          setQuotaRefreshKey((prev) => prev + 1)
        }}
      />
    </div>
  )
}
