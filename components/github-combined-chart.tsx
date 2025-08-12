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

interface GitHubCombinedChartProps {
  historyData: CoinHistoryData[]
  isDarkMode: boolean
  title: string
}

export function GitHubCombinedChart({ historyData, isDarkMode, title }: GitHubCombinedChartProps) {
  const [chartData, setChartData] = useState<any>({
    labels: [],
    datasets: [],
  })

  // Format numbers for GitHub metrics (no decimal places)
  const formatGitHubNumber = (value: number) => {
    if (value === 0) return "0"
    if (Math.abs(value) >= 1e9) return Math.round(value / 1e9) + "B"
    if (Math.abs(value) >= 1e6) return Math.round(value / 1e6) + "M"
    if (Math.abs(value) >= 1e3) return Math.round(value / 1e3) + "K"
    return Math.round(value).toString()
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

      // GitHub Stars dataset
      const starsData = historyData.map((item) =>
        typeof item.github_stars === 'number' ? item.github_stars : 0
      )
      
      // GitHub Forks dataset
      const forksData = historyData.map((item) =>
        typeof item.github_forks === 'number' ? item.github_forks : 0
      )

      const datasets = [
        {
          label: "GitHub Stars",
          data: starsData,
          borderColor: isDarkMode ? "#f59e0b" : "#d97706",
          backgroundColor: isDarkMode ? "rgba(245, 158, 11, 0.3)" : "rgba(217, 119, 6, 0.3)",
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: isDarkMode ? "#f59e0b" : "#d97706",
          pointBorderColor: isDarkMode ? "#1e293b" : "#ffffff",
          pointBorderWidth: 2,
          tension: 0.4,
          fill: true,
        },
        {
          label: "GitHub Forks",
          data: forksData,
          borderColor: isDarkMode ? "#10b981" : "#059669",
          backgroundColor: isDarkMode ? "rgba(16, 185, 129, 0.2)" : "rgba(5, 150, 105, 0.2)",
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: isDarkMode ? "#10b981" : "#059669",
          pointBorderColor: isDarkMode ? "#1e293b" : "#ffffff",
          pointBorderWidth: 2,
          tension: 0.4,
          fill: false,
        }
      ]

      setChartData({
        labels,
        datasets,
      })
    } catch (error) {
      console.error("Error processing GitHub combined chart data:", error)
      // Set empty chart data on error
      setChartData({
        labels: [],
        datasets: [],
      })
    }
  }, [historyData, isDarkMode])

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          font: {
            family: "'Inter', sans-serif",
            size: 12,
            weight: 500,
          },
        },
      },
      tooltip: {
        backgroundColor: isDarkMode ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)",
        titleColor: isDarkMode ? "#f1f5f9" : "#0f172a",
        bodyColor: isDarkMode ? "#e2e8f0" : "#334155",
        borderColor: isDarkMode ? "rgba(51, 65, 85, 0.3)" : "rgba(203, 213, 225, 0.6)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
        displayColors: true,
        titleFont: {
          family: "'Inter', sans-serif",
          size: 12,
          weight: 600,
        },
        bodyFont: {
          family: "'Inter', sans-serif",
          size: 11,
          weight: 500,
        },
        callbacks: {
          title: (context: any) => context[0].label,
          label: (context: any) => {
            const value = context.parsed.y
            const label = context.dataset.label
            return `${label}: ${formatGitHubNumber(value)}`
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
            weight: 500,
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
            weight: 500,
          },
          maxTicksLimit: 5,
          callback: (value: any) => {
            return formatGitHubNumber(value)
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