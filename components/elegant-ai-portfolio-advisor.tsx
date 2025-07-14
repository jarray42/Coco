"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Loader2, Shield, Target, MessageCircle, Sparkles, BarChart3, ChevronDown, ChevronUp, Twitter } from "lucide-react"
import Image from "next/image"
import { formatPrice } from "../utils/beat-calculator"
import type { AuthUser } from "../utils/supabase-auth"
import { chatWithPortfolioBotWithQuota, analyzePortfolioWithQuota, getDetailedPortfolioAnalysisWithQuota } from "../actions/ai-portfolio-advisor-with-quota"
import { UpgradeModal } from "./upgrade-modal"
import { CompactQuotaDisplay } from "./compact-quota-display"
import { getUserQuota } from "../utils/quota-manager"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface ElegantAIPortfolioAdvisorProps {
  user: AuthUser
  isDarkMode: boolean
}

// Add provider options
const PROVIDER_OPTIONS = [
  { value: "auto", label: "Best (Auto)" },
  { value: "groq", label: "Groq" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
]

export function ElegantAIPortfolioAdvisor({ user, isDarkMode }: ElegantAIPortfolioAdvisorProps) {
  const [analysis, setAnalysis] = useState<any>(null)
  const [advice, setAdvice] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const [expandedSection, setExpandedSection] = useState<"none" | "chat" | "analysis">("none")
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)

  // Add state for detailed analysis
  const [showDetailed, setShowDetailed] = useState(false)
  const [detailedAnalysis, setDetailedAnalysis] = useState<any>(null)
  const [detailedAdvice, setDetailedAdvice] = useState<string>("")

  // State to trigger quota refresh
  const [quotaRefreshKey, setQuotaRefreshKey] = useState(0)

  const [provider, setProvider] = useState("auto")
  const [streamingMessage, setStreamingMessage] = useState("")
  // Local state for chat quota modal
  const [showChatUpgradeModal, setShowChatUpgradeModal] = useState(false)
  const [chatQuotaInfo, setChatQuotaInfo] = useState<any>(null)

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
    // Always focus input after chatMessages change
    chatInputRef.current?.focus()
  }, [chatMessages])

  useEffect(() => {
    if (!user) return;
    async function fetchQuota() {
      const quota = await getUserQuota(user)
      setChatQuotaInfo(quota)
    }
    fetchQuota()
  }, [quotaRefreshKey, user])

  // Portfolio analysis with quota enforcement
  const handleAnalyzePortfolio = async () => {
    setLoading(true)
    setExpandedSection("analysis")
    setShowDetailed(false)
    try {
      const result = await analyzePortfolioWithQuota(user)
      if (result && 'needUpgrade' in result && result.needUpgrade) {
        setChatQuotaInfo(result.quota)
        setShowChatUpgradeModal(true)
        setLoading(false)
        return
      }
      if (result && !('needUpgrade' in result)) {
        setAnalysis(result.analysis)
        setAdvice(result.advice)
        setQuotaRefreshKey((prev) => prev + 1)
      }
    } catch (error) {
      setAdvice("Sorry, there was an error analyzing your portfolio. Please try again! 🐓")
    } finally {
      setLoading(false)
    }
  }

  // Detailed analysis with quota enforcement
  const handleDetailedAnalysis = async () => {
    setLoading(true)
    try {
      const result = await getDetailedPortfolioAnalysisWithQuota(user)
      if (result && 'needUpgrade' in result && result.needUpgrade) {
        setChatQuotaInfo(result.quota)
        setShowChatUpgradeModal(true)
        setLoading(false)
        return
      }
      if (result && !('needUpgrade' in result)) {
        setDetailedAnalysis(result.analysis)
        setDetailedAdvice(result.advice)
        setShowDetailed(true)
        setQuotaRefreshKey((prev) => prev + 1)
      }
    } catch (error) {
      setDetailedAdvice("Sorry, there was an error getting detailed insights. Please try again! 🐓")
    } finally {
      setLoading(false)
    }
  }

  const handleChatToggle = () => {
    if (expandedSection === "chat") {
      setExpandedSection("none")
    } else {
      setExpandedSection("chat")
    }
  }

  // Robust chat handler with atomic quota check/increment
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return

    const userMessage: ChatMessage = {
      role: "user",
      content: chatInput,
      timestamp: new Date(),
    }

    setChatMessages((prev) => [...prev, userMessage])
    setChatInput("")
    setChatLoading(true)
    setStreamingMessage("")
    setTimeout(() => { chatInputRef.current?.focus(); }, 0)

    try {
      const result = await chatWithPortfolioBotWithQuota(user, chatInput, chatMessages)
      if (result && 'response' in result && typeof result.response === "string") {
        const botMessage: ChatMessage = {
          role: "assistant",
          content: result.response,
          timestamp: new Date(),
        }
        setChatMessages((prev) => [...prev, botMessage])
        setQuotaRefreshKey((prev) => prev + 1)
      } else if (result && 'needUpgrade' in result && result.needUpgrade) {
        setChatQuotaInfo(result.quota)
        setShowChatUpgradeModal(true)
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
      handleSendMessage()
    }
  }

  const cardClass = isDarkMode ? "bg-slate-800/50 border-slate-700/30" : "bg-white/80 border-slate-200/50"
  const textClass = isDarkMode ? "text-slate-100" : "text-slate-900"
  const mutedTextClass = isDarkMode ? "text-slate-400" : "text-slate-600"

  // Parse the AI advice into structured sections (updated for elegant format)
  const parseAdvice = (advice: string) => {
    const sections = {
      assessment: "",
      insights: [] as string[],
      alerts: "",
      actions: "",
    }

    const lines = advice
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
    let currentSection = ""

    for (const line of lines) {
      if (line.includes("PORTFOLIO HEALTH:")) {
        currentSection = "assessment"
        sections.assessment = line.replace("PORTFOLIO HEALTH:", "").trim()
      } else if (line.includes("TOP 3 INSIGHTS:")) {
        currentSection = "insights"
      } else if (line.includes("MIGRATION") && line.includes("ALERTS:")) {
        currentSection = "alerts"
        sections.alerts = line.split(":")[1]?.trim() || ""
      } else if (line.includes("ACTION REQUIRED:")) {
        currentSection = "actions"
        sections.actions = line.replace("ACTION REQUIRED:", "").trim()
      } else if (line.startsWith("•") && currentSection === "insights") {
        sections.insights.push(line.replace("•", "").trim())
      } else if (currentSection === "alerts" && !line.includes("ALERTS:")) {
        sections.alerts += " " + line
      } else if (currentSection === "actions" && !line.includes("ACTION REQUIRED:")) {
        sections.actions += " " + line
      }
    }

    return sections
  }

  const parseDetailedAdvice = (advice: string) => {
    const sections = {
      executive: "",
      composition: [] as string[],
      performance: [] as string[],
      risk: [] as string[],
      intelligence: [] as string[],
      recommendations: [] as string[],
      technical: [] as string[],
    }

    const lines = advice
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
    let currentSection = ""

    for (const line of lines) {
      if (line.includes("EXECUTIVE SUMMARY")) {
        currentSection = "executive"
      } else if (line.includes("PORTFOLIO COMPOSITION")) {
        currentSection = "composition"
      } else if (line.includes("PERFORMANCE & DEVELOPMENT")) {
        currentSection = "performance"
      } else if (line.includes("RISK ASSESSMENT")) {
        currentSection = "risk"
      } else if (line.includes("MARKET INTELLIGENCE")) {
        currentSection = "intelligence"
      } else if (line.includes("STRATEGIC RECOMMENDATIONS")) {
        currentSection = "recommendations"
      } else if (line.includes("TECHNICAL ANALYSIS")) {
        currentSection = "technical"
      } else if (line.startsWith("•") && currentSection) {
        const content = line.replace("•", "").trim()
        if (currentSection === "composition") sections.composition.push(content)
        else if (currentSection === "performance") sections.performance.push(content)
        else if (currentSection === "risk") sections.risk.push(content)
        else if (currentSection === "intelligence") sections.intelligence.push(content)
        else if (currentSection === "recommendations") sections.recommendations.push(content)
        else if (currentSection === "technical") sections.technical.push(content)
      } else if (currentSection === "executive" && !line.includes("EXECUTIVE SUMMARY")) {
        sections.executive += line + " "
      }
    }

    return sections
  }

  const parsedAdvice = advice ? parseAdvice(advice) : null

  return (
    <div
      className={`rounded-3xl ${cardClass} backdrop-blur-md shadow-xl border overflow-hidden transition-all duration-500`}
    >
      {/* Elegant Header */}
      <div className="relative overflow-hidden">
        <div
          className={`p-6 ${
            isDarkMode
              ? "bg-gradient-to-r from-slate-800/80 via-blue-900/40 to-slate-800/80"
              : "bg-gradient-to-r from-blue-50/80 via-sky-100/60 to-blue-50/80"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-2xl blur-lg opacity-30 animate-pulse"></div>
                <div className="relative p-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 shadow-lg">
                  <Image src="/ailogo.png" alt="CocoriAI" width={48} height={48} className="drop-shadow-lg" />
                </div>
              </div>
              <div>
                <h2 className={`text-2xl font-bold ${textClass} mb-1`}>CocoriAI</h2>
                <p className={`text-sm ${mutedTextClass} font-medium`}>Your AI Portfolio Advisor</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <CompactQuotaDisplay user={user} isDarkMode={isDarkMode} refreshKey={quotaRefreshKey} />

              <Button
                onClick={handleChatToggle}
                className={`bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-xl px-6 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 ${
                  expandedSection === "chat" ? "ring-2 ring-amber-300" : ""
                }`}
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Chat with AI Advisor
                {expandedSection === "chat" ? (
                  <ChevronUp className="w-4 h-4 ml-2" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-2" />
                )}
              </Button>

              <Button
                onClick={handleAnalyzePortfolio}
                disabled={loading}
                className={`bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-xl px-6 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 ${
                  expandedSection === "analysis" ? "ring-2 ring-amber-300" : ""
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Analyze Portfolio
                    {expandedSection === "analysis" ? (
                      <ChevronUp className="w-4 h-4 ml-2" />
                    ) : (
                      <ChevronDown className="w-4 h-4 ml-2" />
                    )}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Content */}
      <div
        className={`transition-all duration-500 ease-in-out overflow-hidden ${
          expandedSection !== "none" ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {/* Chat Section */}
        {expandedSection === "chat" && (
          <div className="p-4 max-h-[600px] overflow-y-auto">
            <div className="space-y-3">
              {/* Provider Selector */}
              <div className="flex items-center gap-2 mb-2">
                <label htmlFor="provider-select" className={`text-xs font-medium ${mutedTextClass}`}>AI Provider:</label>
                <select
                  id="provider-select"
                  value={provider}
                  onChange={e => setProvider(e.target.value)}
                  className={`rounded px-2 py-1 text-xs ${isDarkMode ? "bg-slate-700/50 text-slate-100" : "bg-white text-slate-900"}`}
                >
                  {PROVIDER_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Chat Messages - Reduced height */}
              <div className={`h-64 overflow-y-auto p-3 rounded-xl ${cardClass} border space-y-3`}>
                {chatMessages.length === 0 && (
                  <div className="text-center py-8">
                    <div className="relative mb-4">
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full blur-lg opacity-20 animate-pulse"></div>
                      <Image
                        src="/ailogo.png"
                        alt="CocoriAI"
                        width={64}
                        height={64}
                        className="relative mx-auto drop-shadow-lg"
                      />
                    </div>
                    <h3 className={`text-lg font-semibold mb-2 ${textClass}`}>Hello! I'm CocoriAI 🐓</h3>
                    <p className={`${mutedTextClass} max-w-md mx-auto`}>
                      I'm here to help you optimize your crypto portfolio. Ask me anything about your investments,
                      market trends, or trading strategies!
                    </p>
                  </div>
                )}

                {chatMessages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] p-4 rounded-2xl shadow-lg font-sans font-[Inter,system-ui,sans-serif] text-xl font-semibold ${
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

                {chatLoading && (
                  <div className="flex justify-start">
                    <div
                      className={`p-4 rounded-2xl ${isDarkMode ? "bg-slate-700/50" : "bg-white border border-slate-200/50"} shadow-lg`}
                    >
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">CocoriAI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show streaming message if present */}
                {streamingMessage && (
                  <div className="flex justify-start">
                    <div className={`p-4 rounded-2xl font-sans font-[Inter,system-ui,sans-serif] text-base font-medium ${isDarkMode ? "bg-slate-700/50" : "bg-white border border-slate-200/50"} shadow-lg animate-pulse flex items-center`}>
                      <div className="whitespace-pre-wrap leading-relaxed">{streamingMessage}
                        <span className="blinking-cursor-block ml-1">█</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="flex gap-3">
                <Input
                  ref={chatInputRef}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me about your portfolio..."
                  className={`flex-1 rounded-xl h-12 ${isDarkMode ? "bg-slate-700/50 border-slate-600/50" : "bg-white border-slate-200"} shadow-lg`}
                  disabled={chatLoading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={chatLoading || !chatInput.trim()}
                  className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-xl px-6 h-12 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Analysis Section */}
        {expandedSection === "analysis" && (
          <div className="p-4 max-h-[600px] overflow-y-auto">
            {!analysis && !loading && (
              <div className="text-center py-8">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full blur-lg opacity-20 animate-pulse"></div>
                  <Image
                    src="/ailogo.png"
                    alt="CocoriAI"
                    width={80}
                    height={80}
                    className="relative mx-auto drop-shadow-lg"
                  />
                </div>
                <h3 className={`text-xl font-semibold mb-3 ${textClass}`}>Ready to analyze your portfolio!</h3>
                <p className={`${mutedTextClass} mb-6 max-w-md mx-auto`}>
                  Click "Analyze Portfolio" to get personalized AI-powered investment advice based on your holdings and
                  real-time market data.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                  <div className={`p-4 rounded-xl ${cardClass} border text-center`}>
                    <BarChart3 className={`w-8 h-8 mx-auto mb-2 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
                    <div className={`text-sm font-medium ${textClass}`}>Performance Analysis</div>
                  </div>
                  <div className={`p-4 rounded-xl ${cardClass} border text-center`}>
                    <Shield className={`w-8 h-8 mx-auto mb-2 ${isDarkMode ? "text-green-400" : "text-green-600"}`} />
                    <div className={`text-sm font-medium ${textClass}`}>Risk Assessment</div>
                  </div>
                  <div className={`p-4 rounded-xl ${cardClass} border text-center`}>
                    <Target className={`w-8 h-8 mx-auto mb-2 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`} />
                    <div className={`text-sm font-medium ${textClass}`}>Smart Recommendations</div>
                  </div>
                </div>
              </div>
            )}

            {analysis && (
              <div className="space-y-4">
                {/* Compact Stats Grid - 5 items in one row */}
                <div className="grid grid-cols-5 gap-3">
                  <div className={`p-3 rounded-xl ${cardClass} border text-center`}>
                    <div className={`text-xs font-medium ${mutedTextClass} mb-1`}>Total Value</div>
                    <div className={`text-lg font-bold ${textClass}`}>{formatPrice(analysis.totalValue)}</div>
                  </div>
                  <div className={`p-3 rounded-xl ${cardClass} border text-center`}>
                    <div className={`text-xs font-medium ${mutedTextClass} mb-1`}>Health Score</div>
                    <div className={`text-lg font-bold ${textClass}`}>{analysis.avgHealthScore.toFixed(1)}/100</div>
                  </div>
                  <div className={`p-3 rounded-xl ${cardClass} border text-center`}>
                    <div className={`text-xs font-medium ${mutedTextClass} mb-1`}>Risk Level</div>
                    <div className="flex items-center justify-center">
                      {analysis.riskLevel === "High" ? (
                        <div className="text-red-500">🔥</div>
                      ) : analysis.riskLevel === "Medium" ? (
                        <div className="text-yellow-500">⚡</div>
                      ) : (
                        <div className="text-green-500">🛡️</div>
                      )}
                      <span className={`text-sm font-semibold ml-1 ${textClass}`}>{analysis.riskLevel}</span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl ${cardClass} border text-center`}>
                    <div className={`text-xs font-medium ${mutedTextClass} mb-1`}>Diversification</div>
                    <div className="flex items-center justify-center">
                      {analysis.diversification === "Excellent" ? (
                        <div className="text-green-500">🎯</div>
                      ) : analysis.diversification === "Good" ? (
                        <div className="text-blue-500">📊</div>
                      ) : (
                        <div className="text-orange-500">⚠️</div>
                      )}
                      <span className={`text-sm font-semibold ml-1 ${textClass}`}>{analysis.diversification}</span>
                    </div>
                  </div>
                  {/* Top Performer - moved to top right */}
                  {analysis.topPerformer && (
                    <div
                      className={`p-3 rounded-xl border ${isDarkMode ? "bg-emerald-900/20 border-emerald-700/50" : "bg-emerald-50 border-emerald-200"} text-center`}
                    >
                      <div className={`text-xs font-medium ${mutedTextClass} mb-1`}>🏆 Top Performer</div>
                      <div className={`font-bold text-sm ${textClass}`}>{analysis.topPerformer.coin_name}</div>
                      <div className="text-emerald-600 font-bold text-sm">
                        +{analysis.topPerformer.priceChange24h?.toFixed(2)}%
                      </div>
                    </div>
                  )}
                </div>

                {/* Concise AI Analysis */}
                {!showDetailed ? (
                  <div className="space-y-4">
                    {/* Portfolio Assessment */}
                    {parsedAdvice?.assessment && (
                      <div className={`p-4 rounded-xl ${cardClass} border`}>
                        <h3 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${textClass}`}>
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          Portfolio Health Assessment
                        </h3>
                        <p className={`${textClass} leading-relaxed text-sm font-medium`}>{parsedAdvice.assessment}</p>
                      </div>
                    )}

                    {/* Top Insights */}
                    {parsedAdvice?.insights && parsedAdvice.insights.length > 0 && (
                      <div className={`p-4 rounded-xl ${cardClass} border`}>
                        <h3 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${textClass}`}>
                          <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                          Key Insights
                        </h3>
                        <div className="space-y-2">
                          {parsedAdvice.insights.map((insight, index) => (
                            <div key={index} className="flex items-start gap-3">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  isDarkMode ? "bg-amber-500/20 text-amber-300" : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {index + 1}
                              </div>
                              <p className={`${textClass} text-sm leading-relaxed flex-1`}>{insight}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Migration & Delisting Alerts */}
                    {parsedAdvice?.alerts && (
                      <div
                        className={`p-4 rounded-xl border ${
                          parsedAdvice.alerts.toLowerCase().includes("no potential")
                            ? isDarkMode
                              ? "bg-green-900/20 border-green-700/50"
                              : "bg-green-50 border-green-200"
                            : isDarkMode
                              ? "bg-red-900/20 border-red-700/50"
                              : "bg-red-50 border-red-200"
                        }`}
                      >
                        <h3 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${textClass}`}>
                          <div
                            className={`w-2 h-2 rounded-full ${
                              parsedAdvice.alerts.toLowerCase().includes("no potential") ? "bg-green-500" : "bg-red-500"
                            }`}
                          ></div>
                          Migration & Delisting Status
                        </h3>
                        <p className={`${textClass} text-sm leading-relaxed font-medium`}>{parsedAdvice.alerts}</p>
                      </div>
                    )}

                    {/* Action Required */}
                    {parsedAdvice?.actions && (
                      <div
                        className={`p-4 rounded-xl border ${
                          parsedAdvice.actions.toLowerCase().includes("no immediate")
                            ? isDarkMode
                              ? "bg-slate-700/30 border-slate-600/50"
                              : "bg-slate-50 border-slate-200"
                            : isDarkMode
                              ? "bg-purple-900/20 border-purple-700/50"
                              : "bg-purple-50 border-purple-200"
                        }`}
                      >
                        <h3 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${textClass}`}>
                          <div
                            className={`w-2 h-2 rounded-full ${
                              parsedAdvice.actions.toLowerCase().includes("no immediate")
                                ? "bg-slate-500"
                                : "bg-purple-500"
                            }`}
                          ></div>
                          Recommended Actions
                        </h3>
                        <p className={`${textClass} text-sm leading-relaxed font-medium`}>{parsedAdvice.actions}</p>
                      </div>
                    )}

                    {/* More Details Button */}
                    <div className="mt-6 text-center">
                      <Button
                        onClick={handleDetailedAnalysis}
                        disabled={loading}
                        className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl px-8 py-3 text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating Detailed Analysis...
                          </>
                        ) : (
                          <>
                            <BarChart3 className="w-4 h-4 mr-2" />
                            More Detailed Insights
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Enhanced Detailed Analysis View */
                  <div className="space-y-6">
                    {(() => {
                      const parsedDetailed = detailedAdvice ? parseDetailedAdvice(detailedAdvice) : null

                      return (
                        <>
                          <div className="flex items-center justify-between mb-6">
                            <h3 className={`text-2xl font-bold ${textClass} flex items-center gap-3`}>
                              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
                              Comprehensive Portfolio Analysis
                            </h3>
                            <Button
                              onClick={() => setShowDetailed(false)}
                              variant="ghost"
                              size="sm"
                              className={`text-sm ${isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-800"}`}
                            >
                              Back to Summary
                            </Button>
                          </div>

                          {parsedDetailed ? (
                            <div className="space-y-5">
                              {/* Executive Summary */}
                              {parsedDetailed.executive && (
                                <div className={`p-5 rounded-xl ${cardClass} border`}>
                                  <h4 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${textClass}`}>
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                    Executive Summary
                                  </h4>
                                  <p className={`${textClass} leading-relaxed text-sm`}>
                                    {parsedDetailed.executive.trim()}
                                  </p>
                                </div>
                              )}

                              {/* Portfolio Composition */}
                              {parsedDetailed.composition.length > 0 && (
                                <div className={`p-5 rounded-xl ${cardClass} border`}>
                                  <h4 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${textClass}`}>
                                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                    Portfolio Composition Analysis
                                  </h4>
                                  <div className="space-y-3">
                                    {parsedDetailed.composition.map((item, index) => (
                                      <div key={index} className="flex items-start gap-3">
                                        <div
                                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isDarkMode ? "bg-purple-500/20 text-purple-300" : "bg-purple-100 text-purple-700"}`}
                                        >
                                          {index + 1}
                                        </div>
                                        <p className={`${textClass} text-sm leading-relaxed flex-1`}>{item}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Performance & Development */}
                              {parsedDetailed.performance.length > 0 && (
                                <div className={`p-5 rounded-xl ${cardClass} border`}>
                                  <h4 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${textClass}`}>
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    Performance & Development Metrics
                                  </h4>
                                  <div className="space-y-3">
                                    {parsedDetailed.performance.map((item, index) => (
                                      <div key={index} className="flex items-start gap-3">
                                        <div
                                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isDarkMode ? "bg-green-500/20 text-green-300" : "bg-green-100 text-green-700"}`}
                                        >
                                          {index + 1}
                                        </div>
                                        <p className={`${textClass} text-sm leading-relaxed flex-1`}>{item}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Risk Assessment */}
                              {parsedDetailed.risk.length > 0 && (
                                <div className={`p-5 rounded-xl ${cardClass} border`}>
                                  <h4 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${textClass}`}>
                                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                    Risk Assessment & Scenarios
                                  </h4>
                                  <div className="space-y-3">
                                    {parsedDetailed.risk.map((item, index) => (
                                      <div key={index} className="flex items-start gap-3">
                                        <div
                                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isDarkMode ? "bg-orange-500/20 text-orange-300" : "bg-orange-100 text-orange-700"}`}
                                        >
                                          {index + 1}
                                        </div>
                                        <p className={`${textClass} text-sm leading-relaxed flex-1`}>{item}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Market Intelligence */}
                              {parsedDetailed.intelligence.length > 0 && (
                                <div className={`p-5 rounded-xl ${cardClass} border`}>
                                  <h4 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${textClass}`}>
                                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                    Market Intelligence & Alerts
                                  </h4>
                                  <div className="space-y-3">
                                    {parsedDetailed.intelligence.map((item, index) => (
                                      <div key={index} className="flex items-start gap-3">
                                        <div
                                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isDarkMode ? "bg-red-500/20 text-red-300" : "bg-red-100 text-red-700"}`}
                                        >
                                          {index + 1}
                                        </div>
                                        <p className={`${textClass} text-sm leading-relaxed flex-1`}>{item}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Strategic Recommendations */}
                              {parsedDetailed.recommendations.length > 0 && (
                                <div
                                  className={`p-5 rounded-xl border ${isDarkMode ? "bg-amber-900/20 border-amber-700/50" : "bg-amber-50 border-amber-200"}`}
                                >
                                  <h4 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${textClass}`}>
                                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                    Strategic Recommendations
                                  </h4>
                                  <div className="space-y-3">
                                    {parsedDetailed.recommendations.map((item, index) => (
                                      <div key={index} className="flex items-start gap-3">
                                        <div
                                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isDarkMode ? "bg-amber-500/20 text-amber-300" : "bg-amber-100 text-amber-700"}`}
                                        >
                                          {index + 1}
                                        </div>
                                        <p className={`${textClass} text-sm leading-relaxed flex-1 font-medium`}>
                                          {item}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Technical Analysis */}
                              {parsedDetailed.technical.length > 0 && (
                                <div className={`p-5 rounded-xl ${cardClass} border`}>
                                  <h4 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${textClass}`}>
                                    <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                                    Technical Analysis Insights
                                  </h4>
                                  <div className="space-y-3">
                                    {parsedDetailed.technical.map((item, index) => (
                                      <div key={index} className="flex items-start gap-3">
                                        <div
                                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isDarkMode ? "bg-cyan-500/20 text-cyan-300" : "bg-cyan-100 text-cyan-700"}`}
                                        >
                                          {index + 1}
                                        </div>
                                        <p className={`${textClass} text-sm leading-relaxed flex-1`}>{item}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className={`p-5 rounded-xl ${cardClass} border`}>
                              <div className={`prose prose-sm ${isDarkMode ? "prose-invert" : ""} max-w-none`}>
                                <div className={`whitespace-pre-wrap ${textClass} leading-relaxed text-sm`}>
                                  {detailedAdvice || advice}
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>
                )}
              </div>
            )}

            {analysis && analysis.length > 0 && (
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                  analysis.length > 260 ? analysis.slice(0, 257) + "..." : analysis
                )}%20%23CocoriCoin`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1 mt-2 rounded bg-blue-500 text-white hover:bg-blue-600 transition font-semibold shadow-sm"
                title="Share this analysis on Twitter"
              >
                <Twitter className="w-4 h-4" />
                Tweet this analysis
              </a>
            )}
          </div>
        )}
      </div>

      {/* Upgrade Modal - Only shows when quota exceeded */}
      <UpgradeModal
        isOpen={showChatUpgradeModal}
        onClose={() => { setShowChatUpgradeModal(false); setChatQuotaInfo(null); }}
        user={user}
        isDarkMode={isDarkMode}
        onUpgradeSuccess={() => { setShowChatUpgradeModal(false); setChatQuotaInfo(null); }}
      />
    </div>
  )
}

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
