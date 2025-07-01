"use client"

import "../styles/card2.css"
import { Gem, PieChart, TrendingUp, Users, Code2, Star } from "lucide-react"

interface MarketCapAnalysisProps {
  capAnalysis: Record<string, Record<string, any>> // e.g., { 'Low Cap': { compositeScore: {...}, ... }, ... }
  isDarkMode: boolean
}

const capGradients = {
  "Low Cap": "linear-gradient(135deg, #ffe066 0%, #ffb347 100%)",
  "Mid Cap": "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)",
  "High Cap": "linear-gradient(135deg, #d4a1fd 0%, #fbc2eb 100%)",
}
const metricIcons = {
  compositeScore: <Gem className="w-5 h-5 text-yellow-500" />, // or Star
  socialMomentum: <Users className="w-5 h-5 text-blue-500" />,
  developerActivity: <Code2 className="w-5 h-5 text-purple-500" />,
}
const metricLabels = {
  compositeScore: "Composite",
  socialMomentum: "Social",
  developerActivity: "Dev",
}

const metricColors = {
  compositeScore: "#ffe066",
  socialMomentum: "#a1c4fd",
  developerActivity: "#d4a1fd",
}

export function ElegantMarketCapAnalysis({ capAnalysis }: MarketCapAnalysisProps) {
  // Flatten all 3 metrics for each cap into a single array
  const cards = []
  const capOrder = ["Low Cap", "Mid Cap", "High Cap"]
  const metricOrder = ["compositeScore", "socialMomentum", "developerActivity"]
  for (const cap of capOrder) {
    for (const metric of metricOrder) {
      if (capAnalysis[cap] && capAnalysis[cap][metric]) {
        cards.push({
          cap,
          metric,
          data: capAnalysis[cap][metric],
        })
      }
    }
  }
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-4 min-w-[900px] justify-center">
        {cards.map(({ cap, metric, data }, idx) => (
          <div
            key={cap + metric}
            className="card hover:scale-105 transition-transform duration-300 flex-shrink-0"
            style={{
              background: capGradients[cap as keyof typeof capGradients] || undefined,
              width: 180,
              height: 200,
              minWidth: 180,
              maxWidth: 180,
            }}
          >
            <div className="img flex items-center justify-end" style={{ background: capGradients[cap as keyof typeof capGradients], height: 60 }}>
              <div className="save">
                {metricIcons[metric as keyof typeof metricIcons]}
              </div>
            </div>
            <div className="text flex flex-col gap-1 mt-1">
              <div className="h3 text-[0.95rem] font-bold mb-0.5" style={{ fontFamily: 'Inter, sans-serif', color: '#222' }}>{cap.replace(' Cap','')}<span className="ml-1 text-[0.8rem] font-normal opacity-70">{metricLabels[metric as keyof typeof metricLabels]}</span></div>
              <div className="flex items-center gap-1 icon-box" style={{ background: "#f7f7fa", padding: '6px 10px', minHeight: 32 }}>
                <span className="span text-[0.85rem] font-semibold" style={{ color: '#222' }}>{data.name}</span>
                <span className="span text-[0.7rem] text-gray-400">({data.symbol})</span>
                <span className="span text-[0.9rem] font-mono ml-auto" style={{ color: '#9198e5' }}>{data.rawValue?.toFixed(2) || '-'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
