"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Zap, Crown, Sparkles, Loader2 } from "lucide-react"
import type { AuthUser } from "../utils/supabase-auth"

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  user: AuthUser
  isDarkMode: boolean
  onUpgradeSuccess: () => void
}

interface PricingPlan {
  name: string
  tokens: number
  price: number
  popular?: boolean
  features: string[]
}

const PRICING_PLANS: PricingPlan[] = [
  {
    name: "Starter Pack",
    tokens: 100,
    price: 9.99,
    features: ["100 AI Analysis Requests", "Portfolio Health Scoring", "Basic Recommendations", "Email Support"],
  },
  {
    name: "Pro Pack",
    tokens: 500,
    price: 39.99,
    popular: true,
    features: [
      "500 AI Analysis Requests",
      "Advanced Portfolio Analytics",
      "Real-time Market Intelligence",
      "Migration & Delisting Alerts",
      "Priority Support",
    ],
  },
  {
    name: "Enterprise Pack",
    tokens: 1500,
    price: 99.99,
    features: [
      "1,500 AI Analysis Requests",
      "Comprehensive Risk Assessment",
      "Custom Investment Strategies",
      "Technical Analysis Insights",
      "24/7 Premium Support",
      "API Access",
    ],
  },
]

export function UpgradeModal({ isOpen, onClose, user, isDarkMode, onUpgradeSuccess }: UpgradeModalProps) {
  const [loading, setLoading] = useState<number | null>(null)

  const handleUpgrade = async (planIndex: number) => {
    setLoading(planIndex)

    try {
      const response = await fetch("/api/checkout-sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planIndex,
          userId: user.id,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create checkout session")
      }

      const { url } = await response.json()

      // Redirect to Stripe Checkout
      window.location.href = url
    } catch (error) {
      console.error("Error creating checkout session:", error)
      alert("Failed to start checkout process. Please try again.")
    } finally {
      setLoading(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-4xl rounded-2xl border-0 shadow-2xl ${
          isDarkMode ? "bg-slate-800/95 text-slate-100" : "bg-white/95 text-slate-900"
        } backdrop-blur-md`}
      >
        <DialogHeader className="text-center pb-6">
          <DialogTitle className="text-2xl font-bold mb-2">
            <div className="flex items-center justify-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white">
                <Sparkles className="w-6 h-6" />
              </div>
              Upgrade to CocoriAI Pro
            </div>
          </DialogTitle>
          <p className={`${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
            Unlock unlimited AI-powered portfolio analysis and advanced insights
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PRICING_PLANS.map((plan, index) => (
            <div
              key={index}
              className={`relative p-6 rounded-2xl border transition-all duration-300 hover:scale-105 ${
                plan.popular
                  ? isDarkMode
                    ? "border-amber-500/50 bg-amber-900/20"
                    : "border-amber-300 bg-amber-50"
                  : isDarkMode
                    ? "border-slate-700/50 bg-slate-800/50"
                    : "border-slate-200 bg-white"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold px-4 py-1">
                    <Crown className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                  {plan.name}
                </h3>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className={`text-3xl font-bold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                    ${plan.price}
                  </span>
                  <span className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>one-time</span>
                </div>
                <div className="flex items-center justify-center gap-1 text-sm">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className={isDarkMode ? "text-slate-300" : "text-slate-700"}>{plan.tokens} AI Requests</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleUpgrade(index)}
                disabled={loading !== null}
                className={`w-full h-12 rounded-xl font-semibold transition-all duration-300 ${
                  plan.popular
                    ? "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white shadow-lg hover:shadow-xl"
                    : isDarkMode
                      ? "bg-slate-700 hover:bg-slate-600 text-slate-100"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-900"
                }`}
              >
                {loading === index ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Get ${plan.name}`
                )}
              </Button>
            </div>
          ))}
        </div>

        <div className={`text-center mt-6 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
          <p>Secure payment powered by Stripe • Cancel anytime • 30-day money-back guarantee</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
