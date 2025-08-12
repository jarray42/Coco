import { NextRequest } from "next/server"
import { groq } from "@ai-sdk/groq"
import { openai } from "@ai-sdk/openai"
import { anthropic } from "@ai-sdk/anthropic"
import { streamText } from "ai"

// Force dynamic rendering - prevent static analysis during build
export const dynamic = 'force-dynamic'


export const runtime = "edge" // Enable streaming

export async function POST(req: NextRequest) {
  try {
    const { input, chatHistory, provider } = await req.json()

    // Sanitize chatHistory: remove timestamp, ensure only 'user' or 'assistant' roles
    const safeHistory = (chatHistory || []).map((msg: any) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content,
    }))
    const systemPrompt = `You are CocoriAI, a cryptocurrency market analyst for the CocoriCoin platform. You have access to real-time data from the CocoriCoin database.

Rules:
- Keep responses under 100 words
- Only discuss coins available in the CocoriCoin database
- Provide actionable insights, not generic advice
- Use the Beat Score (community engagement + development activity) and consistency score in your analysis
- Always end by offering to answer follow-up questions
- Incorporate key technical indicators if you think it is useful:
  • Moving Averages (e.g., 50/200 SMA crossovers for trend direction).
  • RSI (highlight overbought/oversold levels at 70/30).
  • MACD (note bullish/bearish crossovers and divergence).
  • Bollinger Bands (spot squeezes and breakouts).
- Be conversational but professional`
    const messages = [
      { role: "system", content: systemPrompt },
      ...safeHistory,
      { role: "user", content: input },
    ]

    let model
    if (!provider || provider === "auto") {
      // Try Groq, then OpenAI, then Anthropic
      try {
        model = groq("llama-3.1-8b-instant")
        return await streamText({ model, messages }).toTextStreamResponse()
      } catch (e1) {
        console.error("[AI-CHAT] Groq failed:", e1)
        try {
          model = openai("gpt-4o-mini")
          return await streamText({ model, messages }).toTextStreamResponse()
        } catch (e2) {
          console.error("[AI-CHAT] OpenAI failed:", e2)
          try {
            model = anthropic("claude-3-haiku-20240307")
            return await streamText({ model, messages }).toTextStreamResponse()
          } catch (e3) {
            console.error("[AI-CHAT] Anthropic failed:", e3)
            throw new Error("All AI providers failed")
          }
        }
      }
    } else if (provider === "groq") {
      model = groq("llama-3.1-8b-instant")
      return await streamText({ model, messages }).toTextStreamResponse()
    } else if (provider === "openai") {
      model = openai("gpt-4o-mini")
      return await streamText({ model, messages }).toTextStreamResponse()
    } else if (provider === "anthropic") {
      model = anthropic("claude-3-haiku-20240307")
      return await streamText({ model, messages }).toTextStreamResponse()
    } else {
      return new Response("Unknown provider", { status: 400 })
    }
  } catch (err: any) {
    console.error("[AI-CHAT] Error:", err)
    // Always return JSON error, not HTML
    return new Response(
      JSON.stringify({ error: err.message || "AI chat error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
} 