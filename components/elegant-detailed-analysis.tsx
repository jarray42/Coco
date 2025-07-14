"use client"

import { useState } from "react"
import { TrendingUp, Shield, AlertTriangle, Target, Zap, ChevronRight, Activity, ExternalLink } from "lucide-react"

interface DetailedAnalysisProps {
  analysis: string
  riskIndicators?: any[]
  isDarkMode: boolean
  onBack: () => void
}

const SectionIcon = ({ section }: { section: string }) => {
  if (section.includes("SENTIMENT")) return <Activity className="w-5 h-5" />
  if (section.includes("PERFORMERS")) return <TrendingUp className="w-5 h-5" />
  if (section.includes("HEALTHIEST")) return <Shield className="w-5 h-5" />
  if (section.includes("OPPORTUNITIES")) return <Target className="w-5 h-5" />
  if (section.includes("RISK")) return <AlertTriangle className="w-5 h-5" />
  if (section.includes("MIGRATION")) return <ExternalLink className="w-5 h-5" />
  if (section.includes("STRATEGIC")) return <Zap className="w-5 h-5" />
  return <ChevronRight className="w-5 h-5" />
}

const RiskBadge = ({ type, isDarkMode }: { type: string; isDarkMode: boolean }) => {
  const colors = {
    dead_coins: isDarkMode ? "bg-red-500/20 text-red-300 border-red-500/30" : "bg-red-50 text-red-700 border-red-200",
    low_liquidity: isDarkMode
      ? "bg-orange-500/20 text-orange-300 border-orange-500/30"
      : "bg-orange-50 text-orange-700 border-orange-200",
    stagnant_development: isDarkMode
      ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
      : "bg-yellow-50 text-yellow-700 border-yellow-200",
  }

  const icons = {
    dead_coins: "💀",
    low_liquidity: "🌊",
    stagnant_development: "⏰",
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${colors[type as keyof typeof colors] || colors.dead_coins}`}
    >
      <span>{icons[type as keyof typeof icons] || "⚠️"}</span>
      {type.replace(/_/g, " ").toUpperCase()}
    </div>
  )
}

export function ElegantDetailedAnalysis({ analysis, riskIndicators = [], isDarkMode, onBack }: DetailedAnalysisProps) {
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null)

  const cardClass = isDarkMode ? "bg-slate-800/50 border-slate-700/30" : "bg-white/80 border-slate-200/50"
  const textClass = isDarkMode ? "text-slate-100" : "text-slate-900"
  const mutedTextClass = isDarkMode ? "text-slate-400" : "text-slate-600"

  // Parse analysis into structured sections
  const parseDetailedAnalysis = (analysis: string) => {
    const sections: Array<{ title: string; content: string; items: string[] }> = []
    const lines = analysis
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)

    let currentSection = { title: "", content: "", items: [] as string[] }

    for (const line of lines) {
      if (line.includes(":") && !line.startsWith("•") && !line.startsWith("-")) {
        // Save previous section
        if (currentSection.title) {
          sections.push({ ...currentSection })
        }

        // Start new section
        const [title, ...contentParts] = line.split(":")
        currentSection = {
          title: title.trim(),
          content: contentParts.join(":").trim(),
          items: [],
        }
      } else if (line.startsWith("•")) {
        currentSection.items.push(line.replace("•", "").trim())
      } else if (line.startsWith("-")) {
        currentSection.items.push(line.replace("-", "").trim())
      } else if (line.length > 0) {
        currentSection.content += (currentSection.content ? " " : "") + line
      }
    }

    // Add final section
    if (currentSection.title) {
      sections.push(currentSection)
    }

    return sections
  }

  const sections = parseDetailedAnalysis(analysis)

  return (
    <div className="space-y-6">
      {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-xl ${isDarkMode ? "bg-gradient-to-r from-purple-500/20 to-blue-500/20" : "bg-gradient-to-r from-purple-100 to-blue-100"}`}
          >
            <Zap className={`w-6 h-6 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`} />
          </div>
          <div>
            <h2 className={`text-lg font-semibold tracking-wide ${textClass}`} style={{ fontFamily: "'Inter', sans-serif" }}>
              Comprehensive Market Analysis
            </h2>
            <p className={`text-xs ${mutedTextClass}`}>Detailed insights and strategic recommendations</p>
          </div>
        </div>

        <button
          onClick={onBack}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
            isDarkMode
              ? "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          ← Back to Summary
        </button>
      </div>

            {/* Analysis Sections */}
      <div className="grid gap-4">
        {sections.map((section, index) => (
          <div
            key={index}
            className={`rounded-2xl ${cardClass} border backdrop-blur-md p-6 transition-all duration-300 hover:shadow-lg`}
          >
            <div className="flex items-center gap-3 mb-4">
                <div
                className={`p-2 rounded-lg ${
                  section.title.includes("SENTIMENT")
                      ? isDarkMode
                      ? "bg-blue-500/20"
                      : "bg-blue-100"
                    : section.title.includes("RISK")
                      ? (isDarkMode ? "bg-red-500/20" : "bg-red-100")
                      : section.title.includes("STRATEGIC")
                        ? isDarkMode
                          ? "bg-purple-500/20"
                          : "bg-purple-100"
                        : isDarkMode
                          ? "bg-green-500/20"
                          : "bg-green-100"
                }`}
              >
                <SectionIcon section={section.title} />
              </div>
              <div>
                <h3 className={`text-base font-semibold tracking-wide ${textClass}`} style={{ fontFamily: "'Inter', sans-serif" }}>
                  {section.title.replace(/[A-Z_]+:?/g, (match) =>
                    match
                      .replace(/_/g, " ")
                      .toLowerCase()
                      .replace(/\b\w/g, (l) => l.toUpperCase()),
                  )}
                </h3>
              </div>
            </div>

            {/* Section Content */}
            {section.content && (
              <div className={`mb-4 p-4 rounded-xl ${isDarkMode ? "bg-slate-700/30" : "bg-slate-50"}`}>
                <p className={`${textClass} leading-snug text-xs font-medium opacity-90`}>{section.content}</p>
              </div>
            )}

            {/* Section Items */}
            {section.items.length > 0 && (
              <div className="space-y-3">
                {section.items.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-200 ${
                      isDarkMode ? "hover:bg-slate-700/30" : "hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[0.85rem] font-bold mt-0.5 ${
                        itemIndex === 0
                          ? isDarkMode
                            ? "bg-green-500/20 text-green-300"
                            : "bg-green-100 text-green-700"
                          : itemIndex === 1
                            ? (isDarkMode ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-700")
                            : (isDarkMode ? "bg-purple-500/20 text-purple-300" : "bg-purple-100 text-purple-700")
                      }`}
                    >
                      {itemIndex + 1}
                        </div>
                    <p className={`${textClass} text-xs leading-snug flex-1 font-medium opacity-90`}>{item}</p>
                  </div>
                ))}
                </div>
            )}
              </div>
            ))}
      </div>

      {/* Risk Indicators Section */}
      {riskIndicators.length > 0 && (
        <div className={`rounded-2xl ${cardClass} border backdrop-blur-md p-6`}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-2 rounded-lg ${isDarkMode ? "bg-red-500/20" : "bg-red-100"}`}>
              <AlertTriangle className={`w-6 h-6 ${isDarkMode ? "text-red-400" : "text-red-600"}`} />
            </div>
            <div>
              <h3 className={`text-lg font-bold ${textClass}`} style={{ fontFamily: "'Inter', sans-serif" }}>
                Detailed Risk Analysis
              </h3>
              <p className={`text-sm ${mutedTextClass}`}>{riskIndicators.length} risk categories identified</p>
            </div>
                  </div>

          <div className="space-y-4">
                    {riskIndicators.map((risk, index) => (
                      <div
                        key={index}
                className={`border rounded-xl overflow-hidden transition-all duration-300 ${
                  isDarkMode ? "border-slate-700/50" : "border-slate-200"
                }`}
              >
                <div
                  className={`p-4 cursor-pointer transition-all duration-200 ${
                    expandedRisk === risk.type
                      ? isDarkMode
                        ? "bg-slate-700/50"
                        : "bg-slate-50"
                      : isDarkMode
                        ? "hover:bg-slate-700/30"
                        : "hover:bg-slate-50/50"
                        }`}
                  onClick={() => setExpandedRisk(expandedRisk === risk.type ? null : risk.type)}
                      >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <RiskBadge type={risk.type} isDarkMode={isDarkMode} />
                      <div>
                        <h4 className={`font-semibold ${textClass}`}>{risk.title}</h4>
                        <p className={`text-sm ${mutedTextClass}`}>{risk.description}</p>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-5 h-5 ${mutedTextClass} transition-transform duration-200 ${
                        expandedRisk === risk.type ? "rotate-90" : ""
                      }`}
                    />
                  </div>
                </div>

                {expandedRisk === risk.type && (
                  <div
                    className={`p-4 border-t ${isDarkMode ? "border-slate-700/50 bg-slate-800/30" : "border-slate-200 bg-slate-50/50"}`}
                  >
                    <div className="space-y-3">
                      {risk.coins.map((coin: any, coinIndex: number) => (
                        <div
                          key={coinIndex}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            isDarkMode ? "bg-slate-700/30" : "bg-white/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                isDarkMode ? "bg-slate-600 text-slate-200" : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {coin.symbol?.charAt(0) || coin.name?.charAt(0) || "?"}
                            </div>
                            <div>
                              <p className={`font-medium ${textClass}`}>{coin.name}</p>
                              <p className={`text-xs ${mutedTextClass}`}>{coin.reason}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            {coin.score && (
                              <p
                                className={`text-sm font-mono font-bold ${
                                  Number.parseFloat(coin.score) < 5
                                    ? "text-red-500"
                                    : Number.parseFloat(coin.score) < 10
                                      ? "text-orange-500"
                                      : "text-yellow-500"
                                }`}
                              >
                                {coin.score}/100
                              </p>
                            )}
                            {coin.ratio && (
                              <p className={`text-sm font-mono font-bold text-orange-500`}>{coin.ratio}%</p>
                            )}
                            {coin.days && (
                              <p className={`text-sm font-mono font-bold text-yellow-500`}>
                                {Math.floor(coin.days / 30)}mo
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
