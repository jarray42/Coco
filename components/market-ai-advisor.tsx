"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import {
  Bot,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Loader2,
  Send,
  MessageSquare,
  Sparkles,
  Target,
  AlertTriangle,
} from "lucide-react"
import { analyzeMarketWithQuota, chatWithMarketBotWithQuota } from "../actions/market-analysis-with-quota"
import { useUser } from "../hooks/use-user"
import type { MarketAnalysisResult } from "../actions/market-analysis"
import type { AuthUser } from "../utils/supabase-auth"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface MarketAIAdvisorProps {
  className?: string
}

export function MarketAIAdvisor({ className }: MarketAIAdvisorProps) {
  const { user } = useUser()
  const [analysis, setAnalysis] = useState<MarketAnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quotaInfo, setQuotaInfo] = useState<any>(null)
  const [showChat, setShowChat] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState("")
  const chatEndRef = useRef<HTMLDivElement>(null)

  const handleAnalyze = async (analysisType: "basic" | "detailed" = "basic") => {
    if (!user) {
      setError("Please sign in to use AI analysis")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await analyzeMarketWithQuota(user as AuthUser, analysisType === "detailed")
      console.log("Market analysis result:", result)

      if ("needUpgrade" in result) {
        setError(result.message)
        setQuotaInfo(result.quota)
      } else if (result && result.analysis) {
        setAnalysis(result)
        setQuotaInfo(null)
      } else {
        setError("No analysis result returned from server.")
        setAnalysis(null)
      }
    } catch (err) {
      setError("Failed to analyze market data")
      console.error("Market analysis error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!user || !chatInput.trim()) return

    const userMessage: ChatMessage = {
      role: "user",
      content: chatInput,
      timestamp: new Date(),
    }

    setChatMessages((prev) => [...prev, userMessage])
    setChatInput("")
    setChatLoading(true)
    setStreamingMessage("")

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: chatInput,
          chatHistory: chatMessages,
          provider: "auto",
        }),
      })
      if (!response.body) throw new Error("No response body")
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let result = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        result += chunk
        setStreamingMessage(result)
      }
      // Add the streamed message to chat history
      const botMessage: ChatMessage = {
        role: "assistant",
        content: result,
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, botMessage])
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "Sorry, I'm having trouble right now. Please try again! 🐓",
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, errorMessage])
    } finally {
      setChatLoading(false)
      setStreamingMessage("")
    }
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "bullish":
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case "bearish":
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-yellow-500" />
    }
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "bullish":
        return "bg-green-100 text-green-800 border-green-200"
      case "bearish":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
    }
  }

  const parseAnalysis = (analysisText: string) => {
    const sections: Record<string, string> = {}
    const parts = analysisText.split(/(?=## )/g)

    for (const part of parts) {
      if (part.startsWith("## ")) {
        const lines = part.split("\n")
        const title = lines[0].replace("## ", "").trim()
        const content = lines.slice(1).join("\n").trim()
        sections[title] = content
      }
    }
    return sections
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages, streamingMessage])

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <CardTitle>CocoriAI Market Advisor</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {quotaInfo && (
              <Badge variant="outline" className="text-xs">
                Tokens: {quotaInfo.tokens_used}/{quotaInfo.monthly_limit || 20}
              </Badge>
            )}
            <Button onClick={() => setShowChat(!showChat)} variant={showChat ? "default" : "outline"} size="sm">
              <MessageSquare className="h-4 w-4 mr-1" />
              Chat
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!user && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">Sign in to access AI market analysis</span>
          </div>
        )}

        {!showChat ? (
          <>
            <div className="flex gap-2">
              <Button onClick={() => handleAnalyze("basic")} disabled={loading || !user} variant="outline" size="sm">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                Quick Analysis
              </Button>
              <Button onClick={() => handleAnalyze("detailed")} disabled={loading || !user} size="sm">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Target className="h-4 w-4 mr-1" />}
                Detailed Analysis
              </Button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-800">{error}</span>
                </div>
              </div>
            )}

            {analysis && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getSentimentIcon(analysis.sentiment)}
                    <Badge className={getSentimentColor(analysis.sentiment)}>{analysis.sentiment.toUpperCase()}</Badge>
                    <span className="text-sm text-muted-foreground">Confidence: {analysis.confidence}%</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {analysis.modelUsed}
                  </Badge>
                </div>

                <Separator />

                <ScrollArea className="h-96 w-full">
                  <div className="space-y-4 pr-4">
                    {(() => {
                      const sections = parseAnalysis(analysis.analysis)
                      return Object.entries(sections).map(([title, content]) => (
                        <div key={title} className="space-y-2">
                          <div className="flex items-center gap-2">
                            {title === "Market Pulse" && <TrendingUp className="h-4 w-4 text-blue-500" />}
                            {title === "Key Insights" && <Target className="h-4 w-4 text-green-500" />}
                            {title === "Critical Risks" && <AlertTriangle className="h-4 w-4 text-red-500" />}
                            {title === "Actionable Takeaway" && <Sparkles className="h-4 w-4 text-purple-500" />}
                            <h4 className="font-semibold text-sm">{title}</h4>
                          </div>
                          <div className="text-sm text-muted-foreground whitespace-pre-wrap pl-6">{content}</div>
                        </div>
                      ))
                    })()}
                  </div>
                </ScrollArea>

                {analysis.riskIndicators && analysis.riskIndicators.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-red-800">Risk Alerts</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {analysis.riskIndicators.slice(0, 3).map((risk, index) => (
                        <Badge
                          key={index}
                          variant={risk.severity === "high" ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {risk.title}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!analysis && !loading && user && (
              <div className="text-center py-8">
                <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-2">Ready to analyze the market</p>
                <p className="text-sm text-muted-foreground">
                  Get AI-powered insights on current market trends and opportunities
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <ScrollArea className="h-64 w-full border rounded-lg p-3">
              <div className="space-y-3">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">Ask me about market trends!</p>
                  </div>
                ) : (
                  chatMessages.map((message, index) => (
                    <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                          message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{message.content}</div>
                        <div className="text-xs opacity-70 mt-1">{message.timestamp.toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))
                )}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
                {/* Show streaming message if present */}
                {streamingMessage && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-3 py-2 animate-pulse">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">{streamingMessage}</div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about market trends, specific coins..."
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                disabled={chatLoading || !user}
              />
              <Button onClick={handleSendMessage} disabled={chatLoading || !chatInput.trim() || !user} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
