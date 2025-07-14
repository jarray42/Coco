"use client"

import { useState, useEffect } from "react"
import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js"
import type { CoinHistoryData } from "../actions/fetch-coin-history"

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

interface CoinHistoryChartProps {
  historyData: CoinHistoryData[]
  isDarkMode: boolean
  metric: "price" | "market_cap" | "volume_24h" | "github_stars" | "github_forks" | "twitter_followers" | "health_score"
  title: string
  color: string
}

export function CoinHistoryChart({ historyData, isDarkMode, metric, title, color }: CoinHistoryChartProps) {
  const [chartData, setChartData] = useState<any>({
    labels: [],
    datasets: [],
  })

  // Format numbers for axis labels
  const formatAxisNumber = (value: number) => {
    if (value === 0) return "0"
    if (Math.abs(value) >= 1e9) return "$" + (value / 1e9).toFixed(1) + "B"
    if (Math.abs(value) >= 1e6) return "$" + (value / 1e6).toFixed(1) + "M"
    if (Math.abs(value) >= 1e3) return "$" + (value / 1e3).toFixed(1) + "K"
    if (value < 1 && value > 0) return "$" + value.toFixed(4)
    return "$" + value.toFixed(0)
  }

  // Format numbers for non-price metrics
  const formatNonPriceNumber = (value: number) => {
    if (value === 0) return "0"
    if (Math.abs(value) >= 1e9) return (value / 1e9).toFixed(1) + "B"
    if (Math.abs(value) >= 1e6) return (value / 1e6).toFixed(1) + "M"
    if (Math.abs(value) >= 1e3) return (value / 1e3).toFixed(1) + "K"
    return value.toFixed(0)
  }

  // Format dates like CoinGecko
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate()
    const month = date.toLocaleDateString("en-US", { month: "short" }).toLowerCase()
    return `${day} ${month}`
  }

  useEffect(() => {
    try {
      if (!historyData || historyData.length === 0) return

      // Format dates for labels
      const labels = historyData.map((item) => {
        try {
          return formatDate(item.date)
        } catch (e) {
          return "Invalid Date"
        }
      })

      let data
      if (metric === "health_score") {
        // Use pre-calculated health scores from history data
        data = historyData.map((item) => {
          // Use health_score from database if available, otherwise default to 50
          return (item as any).health_score || 50
        })
      } else {
        data = historyData
          .map((item) => {
            const value = item[metric] || 0
            return typeof value === "number" && !isNaN(value) ? Math.max(0, value) : 0
          })
          .filter((val) => val >= 0)
      }

      const gradientColors = {
        price: isDarkMode ? "rgba(59, 130, 246, 0.3)" : "rgba(14, 165, 233, 0.3)",
        market_cap: isDarkMode ? "rgba(139, 92, 246, 0.3)" : "rgba(168, 85, 247, 0.3)",
        volume_24h: isDarkMode ? "rgba(236, 72, 153, 0.3)" : "rgba(219, 39, 119, 0.3)",
        github_stars: isDarkMode ? "rgba(245, 158, 11, 0.3)" : "rgba(217, 119, 6, 0.3)",
        github_forks: isDarkMode ? "rgba(16, 185, 129, 0.3)" : "rgba(5, 150, 105, 0.3)",
        twitter_followers: isDarkMode ? "rgba(59, 130, 246, 0.3)" : "rgba(37, 99, 235, 0.3)",
        health_score: isDarkMode ? "rgba(34, 197, 94, 0.3)" : "rgba(22, 163, 74, 0.3)",
      }

      setChartData({
        labels,
        datasets: [
          {
            label: title,
            data,
            borderColor: color,
            backgroundColor: gradientColors[metric],
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: color,
            pointBorderColor: isDarkMode ? "#1e293b" : "#ffffff",
            pointBorderWidth: 2,
            tension: 0.4,
            fill: true,
          },
        ],
      })
    } catch (error) {
      console.error("Error processing chart data:", error)
      // Set empty chart data on error
      setChartData({
        labels: [],
        datasets: [],
      })
    }
  }, [historyData, isDarkMode, metric, title, color])

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Hide legend for cleaner look
      },
      tooltip: {
        backgroundColor: isDarkMode ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)",
        titleColor: isDarkMode ? "#f1f5f9" : "#0f172a",
        bodyColor: isDarkMode ? "#e2e8f0" : "#334155",
        borderColor: isDarkMode ? "rgba(51, 65, 85, 0.3)" : "rgba(203, 213, 225, 0.6)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
        displayColors: false,
        titleFont: {
          family: "'Inter', sans-serif",
          size: 12,
          weight: "600",
        },
        bodyFont: {
          family: "'Inter', sans-serif",
          size: 11,
          weight: "500",
        },
        callbacks: {
          title: (context: any) => context[0].label,
          label: (context: any) => {
            const value = context.parsed.y
            if (metric === "health_score") {
              return `Health Score: ${value.toFixed(1)}/100`
            }
            if (metric === "price" || metric === "market_cap" || metric === "volume_24h") {
              return `${title}: ${formatAxisNumber(value)}`
            }
            return `${title}: ${formatNonPriceNumber(value)}`
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          color: isDarkMode ? "#94a3b8" : "#64748b",
          font: {
            family: "'Inter', sans-serif",
            size: 10,
            weight: "500",
          },
          maxRotation: 0,
          minRotation: 0,
          maxTicksLimit: 5,
        },
        border: {
          display: false,
        },
      },
      y: {
        grid: {
          color: isDarkMode ? "rgba(71, 85, 105, 0.15)" : "rgba(203, 213, 225, 0.4)",
          drawBorder: false,
          lineWidth: 1,
        },
        ticks: {
          color: isDarkMode ? "#94a3b8" : "#64748b",
          font: {
            family: "'Inter', sans-serif",
            size: 10,
            weight: "500",
          },
          maxTicksLimit: 5,
          callback: (value: any) => {
            if (metric === "price" || metric === "market_cap" || metric === "volume_24h") {
              return formatAxisNumber(value)
            }
            return formatNonPriceNumber(value)
          },
        },
        border: {
          display: false,
        },
        beginAtZero: false,
      },
    },
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    animation: {
      duration: 1000,
      easing: "easeInOutCubic" as const,
    },
    elements: {
      point: {
        hoverBackgroundColor: color,
      },
    },
  }

  if (historyData.length === 0) {
    return (
      <div
        className={`flex items-center justify-center h-64 rounded-2xl ${
          isDarkMode ? "bg-slate-800/50" : "bg-white/80"
        } backdrop-blur-md shadow-lg p-4 border ${isDarkMode ? "border-slate-700/30" : "border-slate-200/50"}`}
      >
        <div className="text-center">
          <div className="text-3xl mb-2">📊</div>
          <p className={`text-sm font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
            No historical data available
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`rounded-2xl ${
        isDarkMode ? "bg-slate-800/50" : "bg-white/80"
      } backdrop-blur-md shadow-lg p-4 transition-all duration-300 border ${
        isDarkMode ? "border-slate-700/30" : "border-slate-200/50"
      } hover:shadow-xl`}
    >
      <h3 className={`text-base font-semibold mb-4 ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>{title}</h3>
      <div className="h-64">
        <Line data={chartData} options={options} />
      </div>
    </div>
  )
}
