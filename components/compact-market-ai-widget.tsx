"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Loader2, MessageCircle, Sparkles, TrendingUp, Target, X, Minimize2, Maximize2 } from "lucide-react"
import Image from "next/image"
import type { AuthUser } from "../utils/supabase-auth"
import { AuthModal } from "./auth-modal"
import { ElegantMarketCapAnalysis } from "./elegant-market-cap-analysis"
import { ElegantDetailedAnalysis } from "./elegant-detailed-analysis"
import { CompactQuotaDisplay } from "./compact-quota-display"
import { analyzeMarketWithQuota, chatWithMarketBotWithQuota } from "../actions/market-analysis-with-quota"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface CompactMarketAIWidgetProps {
  user: AuthUser | null
  isDarkMode: boolean
  onAuthSuccess: () => void
}

export function CompactMarketAIWidget({ user, isDarkMode, onAuthSuccess }: CompactMarketAIWidgetProps) {
  // Top-level render log
  if (typeof window !== "undefined") {
    console.log("[DEBUG] CompactMarketAIWidget rendered. user:", user)
  }

  // Debug log for Analyze button
  if (typeof window !== "undefined" && user) {
    console.log("[DEBUG] Analyze button will render (user is present)")
  }

  const [isExpanded, setIsExpanded] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
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
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [capAnalysisData, setCapAnalysisData] = useState<any>(null)
  const [riskIndicatorsData, setRiskIndicatorsData] = useState<any[]>([])
  const [quotaRefreshKey, setQuotaRefreshKey] = useState(0)
  const [quotaExceededMessage, setQuotaExceededMessage] = useState<string>("")

  const scrollToBottom = () => {
    const container = messagesContainerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages])

  const handleQuotaError = (error: any) => {
    setQuotaExceededMessage(
      error?.message || "You have reached your monthly AI quota. Please upgrade your plan for more requests, or wait until your quota resets next month."
    )
  }

  const handleToggleExpand = () => {
    if (!user) return
    setIsExpanded(!isExpanded)
    setIsMinimized(false)
  }

  const handleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

  const handleClose = () => {
    setIsExpanded(false)
    setIsMinimized(false)
  }

  const handleAnalyzeMarket = async () => {
    console.log("[DEBUG] handleAnalyzeMarket called")
    if (!user) return

    setLoading(true)
    setActiveTab("analysis")
    setShowDetailed(false)
    try {
      const result = await analyzeMarketWithQuota(user, false)
      console.log("[DEBUG] analyzeMarketWithQuota result:", result)

      if ("needUpgrade" in result) {
        handleQuotaError(result)
        return
      }

      setAnalysis(result.analysis)
      setCapAnalysisData(result.capAnalysis)
      setRiskIndicatorsData(result.riskIndicators || [])
      setQuotaRefreshKey((prev) => prev + 1)
    } catch (error) {
      console.error("Error analyzing market:", error)
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
      }
    }
    return sections
  }

  const parsedAnalysis = analysis ? parseAnalysis(analysis) : null

  // Debug logging (moved to always run on render)
  if (typeof window !== "undefined") {
    console.log("[DEBUG] analysis:", analysis)
    console.log("[DEBUG] parsedAnalysis:", parsedAnalysis)
    console.log("[DEBUG] showDetailed:", showDetailed)
  }

  return (
    <>
      {/* Compact Widget Button */}
      <div className="relative">
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <CompactQuotaDisplay user={user} isDarkMode={isDarkMode} refreshKey={quotaRefreshKey} />
              <Button
                onClick={handleToggleExpand}
                className={`bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-xl px-4 py-2 text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 ${
                  isExpanded ? "ring-2 ring-amber-300" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="absolute inset-0 bg-white rounded-lg blur-sm opacity-20 animate-pulse"></div>
                    <Image
                      src="/ailogo.png"
                      alt="CocoriAI"
                      width={20}
                      height={20}
                      className="relative drop-shadow-lg"
                    />
                  </div>
                  <span className="font-bold">CocoriAI</span>
                </div>
              </Button>
            </>
          ) : (
            <AuthModal
              isDarkMode={isDarkMode}
              onAuthSuccess={onAuthSuccess}
              triggerButton={
                <Button className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-xl px-4 py-2 text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                  <div className="flex items-center gap-2">
                    <Image src="/ailogo.png" alt="CocoriAI" width={20} height={20} className="drop-shadow-lg" />
                    <span className="font-bold">Try for Free</span>
                  </div>
                </Button>
              }
            />
          )}
        </div>

        {/* Expanded Panel */}
        {isExpanded && user && (
          <div
            className={`absolute top-full right-0 mt-2 w-[90vw] max-w-6xl rounded-2xl ${cardClass} backdrop-blur-md shadow-2xl border overflow-hidden transition-all duration-500 z-50 ${
              isMinimized ? "h-16" : "h-96"
            }`}
          >
            {/* Header */}
            <div className="relative overflow-hidden">
              <div
                className={`p-4 ${isDarkMode ? "bg-gradient-to-r from-slate-800/80 via-blue-900/40 to-slate-800/80" : "bg-gradient-to-r from-blue-50/80 via-sky-100/60 to-blue-50/80"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-xl blur-md opacity-30 animate-pulse"></div>
                      <div className="relative p-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 shadow-lg">
                        <Image src="/ailogo.png" alt="CocoriAI" width={24} height={24} className="drop-shadow-lg" />
                      </div>
                    </div>
                    <div>
                      <h2 className={`text-lg font-bold ${textClass}`}>CocoriAI Market Intelligence</h2>
                      <p className={`text-xs ${mutedTextClass} font-medium`}>AI-Powered Market Analysis</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isMinimized && (
                      <>
                        <Button
                          onClick={() => setActiveTab("chat")}
                          variant={activeTab === "chat" ? "default" : "ghost"}
                          size="sm"
                          className={`rounded-lg ${
                            activeTab === "chat"
                              ? "bg-amber-500 text-white"
                              : isDarkMode
                                ? "text-slate-300 hover:text-slate-100"
                                : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          Chat
                        </Button>
                        <Button
                          onClick={() => {
                            setActiveTab("analysis")
                            if (!analysis) handleAnalyzeMarket()
                          }}
                          variant={activeTab === "analysis" ? "default" : "ghost"}
                          size="sm"
                          disabled={loading}
                          className={`rounded-lg ${
                            activeTab === "analysis"
                              ? "bg-amber-500 text-white"
                              : isDarkMode
                                ? "text-slate-300 hover:text-slate-100"
                                : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {loading ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4 mr-1" />
                          )}
                          Analyze
                        </Button>
                      </>
                    )}
                    <Button onClick={handleMinimize} variant="ghost" size="sm" className="p-1">
                      {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                    </Button>
                    <Button onClick={handleClose} variant="ghost" size="sm" className="p-1">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            {!isMinimized && (
              <div className="h-80 overflow-y-auto p-4">
                {quotaExceededMessage && (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6">
                    <div className="text-2xl mb-2">🐔</div>
                    <div className={`${isDarkMode ? "text-amber-300" : "text-amber-700"} font-semibold text-base mb-2`}>Quota Exhausted</div>
                    <div className={`${isDarkMode ? "text-slate-300" : "text-slate-700"} mb-4 text-xs`}>{quotaExceededMessage}</div>
                    <Button className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-xl px-4 py-2 text-xs font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                      <a href="/plans">Upgrade Plan</a>
                    </Button>
                  </div>
                )}

                {!quotaExceededMessage && activeTab === "chat" && (
                  <div className="space-y-3 h-full flex flex-col">
                     <div ref={messagesContainerRef} className={`flex-1 overflow-y-auto p-3 rounded-xl ${cardClass} border space-y-3`}>
                      {chatMessages.length === 0 && (
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
                          <h3 className={`text-base font-semibold mb-2 ${textClass}`}>Market Intelligence Chat 🐓</h3>
                          <p className={`${mutedTextClass} max-w-md mx-auto text-sm`}>
                            Ask me about market trends, specific coins, or trading opportunities!
                          </p>
                        </div>
                      )}

                      {chatMessages.map((message, index) => (
                        <div
                          key={index}
                          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] p-3 rounded-xl shadow-lg ${
                              message.role === "user"
                                ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-white"
                                : isDarkMode
                                  ? "bg-slate-700/50 text-slate-100 border border-slate-600/30"
                                  : "bg-white text-slate-900 border border-slate-200/50"
                            }`}
                          >
                            <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
                            <div className="text-xs mt-1 opacity-70">{message.timestamp.toLocaleTimeString()}</div>
                          </div>
                        </div>
                      ))}

                      {chatLoading && (
                        <div className="flex justify-start">
                          <div
                            className={`p-3 rounded-xl ${isDarkMode ? "bg-slate-700/50" : "bg-white border border-slate-200/50"} shadow-lg`}
                          >
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-sm">Analyzing market...</span>
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
                        placeholder="Ask about market trends..."
                        className={`flex-1 rounded-xl h-10 ${isDarkMode ? "bg-slate-700/50 border-slate-600/50" : "bg-white border-slate-200"} shadow-lg`}
                        disabled={chatLoading}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={chatLoading || !chatInput.trim()}
                        className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-xl px-4 h-10 shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {!quotaExceededMessage && activeTab === "analysis" && (
                  <div className="h-full overflow-y-auto">
                    {!analysis && !loading && (
                      <div className="text-center py-6">
                        <div className="relative mb-4">
                          <Image
                            src="/ailogo.png"
                            alt="CocoriAI"
                            width={64}
                            height={64}
                            className="relative mx-auto drop-shadow-lg"
                          />
                        </div>
                        <h3 className={`text-lg font-semibold mb-2 ${textClass}`}>Ready to analyze the market!</h3>
                        <p className={`${mutedTextClass} mb-4 max-w-md mx-auto text-sm`}>
                          Get AI-powered insights on market trends, top performers, and emerging opportunities.
                        </p>
                        <Button
                          onClick={handleAnalyzeMarket}
                          className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-xl px-6 py-2 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Start Analysis
                        </Button>
                      </div>
                    )}

                    {analysis && parsedAnalysis && !showDetailed && (
                      <div className="space-y-4">
                        {/* Market Sentiment */}
                        {parsedAnalysis.marketSentiment && (
                          <div
                            className={`p-3 rounded-xl ${isDarkMode ? "bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border-blue-700/50" : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"} border`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp className={`w-4 h-4 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
                              <h3 className={`text-sm font-bold ${textClass}`}>Market Sentiment</h3>
                            </div>
                            <p className={`${textClass} leading-relaxed text-xs font-medium`}>
                              {parsedAnalysis.marketSentiment}
                            </p>
                          </div>
                        )}

                        {/* Top Insights */}
                        {parsedAnalysis.insights && parsedAnalysis.insights.length > 0 && (
                          <div className={`p-3 rounded-xl ${cardClass} border`}>
                            <div className="flex items-center gap-2 mb-2">
                              <Target className={`w-4 h-4 ${isDarkMode ? "text-amber-400" : "text-amber-600"}`} />
                              <h3 className={`text-sm font-bold ${textClass}`}>Key Insights</h3>
                            </div>
                            <div className="space-y-2">
                              {parsedAnalysis.insights.slice(0, 2).map((insight, index) => (
                                <div key={index} className="flex items-start gap-2">
                                  <div
                                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                                      isDarkMode ? "bg-amber-500/20 text-amber-300" : "bg-amber-100 text-amber-700"
                                    }`}
                                  >
                                    {index + 1}
                                  </div>
                                  <p className={`${textClass} text-xs leading-relaxed flex-1`}>{insight}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Market Cap Analysis */}
                        {capAnalysisData && (
                          <ElegantMarketCapAnalysis capAnalysis={capAnalysisData} isDarkMode={isDarkMode} />
                        )}

                        {/* More Details Button */}
                        <div className="pt-2">
                          <Button
                            onClick={handleDetailedAnalysis}
                            disabled={detailedLoading}
                            className={`w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl py-2 text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300`}
                          >
                            {detailedLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Getting Details...
                              </>
                            ) : (
                              <>
                                <TrendingUp className="w-4 h-4 mr-2" />
                                More Details
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
            )}
          </div>
        )}
      </div>

      {/* Removed old Upgrade Modal usage in favor of inline message + link to /plans */}
    </>
  )
}
