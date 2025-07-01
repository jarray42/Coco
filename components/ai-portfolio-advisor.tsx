"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Bot,
  Send,
  Loader2,
  TrendingUp,
  TrendingDown,
  Shield,
  Target,
  MessageCircle,
  Sparkles,
  BarChart3,
} from "lucide-react"
import { analyzePortfolioWithAI, chatWithPortfolioBot } from "../actions/ai-portfolio-advisor"
import { formatPrice } from "../utils/beat-calculator"
import type { AuthUser } from "../utils/supabase-auth"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface AIPortfolioAdvisorProps {
  user: AuthUser
  isDarkMode: boolean
}

export function AIPortfolioAdvisor({ user, isDarkMode }: AIPortfolioAdvisorProps) {
  const [analysis, setAnalysis] = useState<any>(null)
  const [advice, setAdvice] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("analysis")
  const chatEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages])

  const handleAnalyzePortfolio = async () => {
    setLoading(true)
    try {
      const result = await analyzePortfolioWithAI(user)
      setAnalysis(result.analysis)
      setAdvice(result.advice)
      setActiveTab("analysis")

      // Show which model was used (optional - you can remove this in production)
      console.log(`Analysis completed using: ${result.modelUsed}`)
    } catch (error) {
      console.error("Error analyzing portfolio:", error)
      setAdvice("Sorry, all AI models are currently at capacity. Please try again later! 🐓")
    } finally {
      setLoading(false)
    }
  }

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

    try {
      const result = await chatWithPortfolioBot(user, chatInput, chatMessages)

      const botMessage: ChatMessage = {
        role: "assistant",
        content: result.response,
        timestamp: new Date(),
      }

      setChatMessages((prev) => [...prev, botMessage])

      // Show which model was used (optional)
      console.log(`Chat response from: ${result.modelUsed}`)
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

  return (
    <div className={`rounded-2xl ${cardClass} backdrop-blur-md shadow-lg border p-6`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white">
          <Bot className="w-6 h-6" />
        </div>
        <div>
          <h2 className={`text-xl font-bold ${textClass}`}>CocoriBot 🐓</h2>
          <p className={`text-sm ${mutedTextClass}`}>Your AI Portfolio Advisor</p>
        </div>
        <div className="ml-auto">
          <Button
            onClick={handleAnalyzePortfolio}
            disabled={loading}
            className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-xl"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze Portfolio
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full grid-cols-2 ${isDarkMode ? "bg-slate-700/50" : "bg-slate-100/80"}`}>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analysis
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-4 mt-4">
          {!analysis && !loading && (
            <div className="text-center py-8">
              <Bot className={`w-16 h-16 mx-auto mb-4 ${mutedTextClass}`} />
              <h3 className={`text-lg font-semibold mb-2 ${textClass}`}>Ready to analyze your portfolio!</h3>
              <p className={`${mutedTextClass} mb-4`}>
                Click "Analyze Portfolio" to get personalized AI-powered investment advice based on your holdings.
              </p>
            </div>
          )}

          {analysis && (
            <div className="space-y-4">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className={`p-3 rounded-xl ${cardClass} border`}>
                  <div className={`text-xs font-medium ${mutedTextClass}`}>Total Value</div>
                  <div className={`text-lg font-bold ${textClass}`}>{formatPrice(analysis.totalValue)}</div>
                </div>
                <div className={`p-3 rounded-xl ${cardClass} border`}>
                  <div className={`text-xs font-medium ${mutedTextClass}`}>Health Score</div>
                  <div className={`text-lg font-bold ${textClass}`}>{analysis.avgHealthScore.toFixed(1)}/100</div>
                </div>
                <div className={`p-3 rounded-xl ${cardClass} border`}>
                  <div className={`text-xs font-medium ${mutedTextClass}`}>Risk Level</div>
                  <Badge
                    variant={
                      analysis.riskLevel === "High"
                        ? "destructive"
                        : analysis.riskLevel === "Medium"
                          ? "default"
                          : "secondary"
                    }
                  >
                    <Shield className="w-3 h-3 mr-1" />
                    {analysis.riskLevel}
                  </Badge>
                </div>
                <div className={`p-3 rounded-xl ${cardClass} border`}>
                  <div className={`text-xs font-medium ${mutedTextClass}`}>Diversification</div>
                  <Badge variant={analysis.diversification === "Excellent" ? "default" : "secondary"}>
                    <Target className="w-3 h-3 mr-1" />
                    {analysis.diversification}
                  </Badge>
                </div>
              </div>

              {/* Performance Highlights */}
              {(analysis.topPerformer || analysis.worstPerformer) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {analysis.topPerformer && (
                    <div
                      className={`p-4 rounded-xl border ${isDarkMode ? "bg-emerald-900/20 border-emerald-700/50" : "bg-emerald-50 border-emerald-200"}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        <span className={`text-sm font-medium ${textClass}`}>Top Performer</span>
                      </div>
                      <div className={`font-semibold ${textClass}`}>{analysis.topPerformer.coin_name}</div>
                      <div className="text-emerald-600 font-bold">
                        +{analysis.topPerformer.priceChange24h?.toFixed(2)}%
                      </div>
                    </div>
                  )}

                  {analysis.worstPerformer && (
                    <div
                      className={`p-4 rounded-xl border ${isDarkMode ? "bg-red-900/20 border-red-700/50" : "bg-red-50 border-red-200"}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="w-4 h-4 text-red-600" />
                        <span className={`text-sm font-medium ${textClass}`}>Needs Attention</span>
                      </div>
                      <div className={`font-semibold ${textClass}`}>{analysis.worstPerformer.coin_name}</div>
                      <div className="text-red-600 font-bold">
                        {analysis.worstPerformer.priceChange24h?.toFixed(2)}%
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* AI Advice */}
              {advice && (
                <div className={`p-4 rounded-xl ${cardClass} border`}>
                  <h3 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${textClass}`}>
                    <Bot className="w-5 h-5" />
                    AI Recommendations
                  </h3>
                  <div className={`prose prose-sm ${isDarkMode ? "prose-invert" : ""} max-w-none`}>
                    <div className={`whitespace-pre-wrap ${textClass} leading-relaxed`}>{advice}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="chat" className="mt-4">
          <div className="space-y-4">
            {/* Chat Messages */}
            <div className={`h-96 overflow-y-auto p-4 rounded-xl ${cardClass} border space-y-3`}>
              {chatMessages.length === 0 && (
                <div className="text-center py-8">
                  <Bot className={`w-12 h-12 mx-auto mb-3 ${mutedTextClass}`} />
                  <p className={`${mutedTextClass}`}>
                    Hi! I'm CocoriBot 🐓 Ask me anything about your portfolio or crypto investing!
                  </p>
                </div>
              )}

              {chatMessages.map((message, index) => (
                <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] p-3 rounded-xl ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-white"
                        : isDarkMode
                          ? "bg-slate-700/50 text-slate-100"
                          : "bg-slate-100 text-slate-900"
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
                    <div className={`text-xs mt-1 opacity-70`}>{message.timestamp.toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex justify-start">
                  <div className={`p-3 rounded-xl ${isDarkMode ? "bg-slate-700/50" : "bg-slate-100"}`}>
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me about your portfolio..."
                className={`flex-1 rounded-xl ${isDarkMode ? "bg-slate-700/50 border-slate-600/50" : "bg-white border-slate-200"}`}
                disabled={chatLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={chatLoading || !chatInput.trim()}
                className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-xl px-4"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
