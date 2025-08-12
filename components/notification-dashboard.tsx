"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Bell, Settings, Trash2, Search, Filter, Eye, EyeOff, Clock, AlertTriangle, TrendingDown, Activity, Shield, ChevronDown, ChevronUp, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { ElegantScrollBar } from "./elegant-scroll-bar"
import { useDebounce } from "../hooks/use-debounce"
import { NotificationPreferences } from "./notification-preferences"
import { getCoinsByIdsFromBunny } from "../actions/fetch-coins-from-bunny"
import type { AuthUser } from "../utils/supabase-auth"

interface NotificationLog {
  id: string
  coin_id: string
  alert_type: string
  message: string
  sent_at: string
  delivery_status: string
  acknowledged_at: string | null
}

interface UserAlert {
  id: string
  coin_id: string
  alert_type: string
  threshold_value: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface CoinAlertGroup {
  coin_id: string
  coin_name: string
  coin_symbol: string
  coin_logo: string
  alerts: UserAlert[]
  recent_notifications: NotificationLog[]
  active_count: number
  total_count: number
  last_triggered: string | null
}

interface NotificationDashboardProps {
  user: AuthUser
  isDarkMode: boolean
  onClose?: () => void
  onNotificationDeleted?: (coinId: string) => void
}

export function NotificationDashboard({ user, isDarkMode, onClose, onNotificationDeleted }: NotificationDashboardProps) {
  const [activeTab, setActiveTab] = useState<'coins' | 'history' | 'preferences'>('coins')
  const [notifications, setNotifications] = useState<NotificationLog[]>([])
  const [alerts, setAlerts] = useState<UserAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [coinDataLoading, setCoinDataLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<'all' | 'active' | 'inactive'>('all')
  const [expandedCoins, setExpandedCoins] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [coinData, setCoinData] = useState<Record<string, any>>({})
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const ITEMS_PER_PAGE = 20

  // Load basic data first (fast)
  useEffect(() => {
    loadBasicData()
  }, [user.id])

  // Load coin data separately (slower, background)
  useEffect(() => {
    if (alerts.length > 0 || notifications.length > 0) {
      loadCoinDataInBackground()
    }
  }, [alerts, notifications])

  const loadBasicData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load notification history and alerts in parallel - this is fast
      const [historyRes, alertsRes] = await Promise.all([
        fetch(`/api/notifications/pending?user_id=${user.id}&include_delivered=true`),
        fetch('/api/user-alerts-summary', {
          headers: { 'Authorization': `Bearer ${user.id}` }
        })
      ])

      const historyData = await historyRes.json()
      const alertsData = await alertsRes.json()

      // Set basic data immediately - UI can render now
      const notifications = Array.isArray(historyData) ? historyData : []
      const alerts = Array.isArray(alertsData) ? alertsData : []

      setNotifications(notifications)
      setAlerts(alerts)
      setLoading(false) // UI can show now

    } catch (err: any) {
      setError(err.message || 'Failed to load notification data')
      setLoading(false)
    }
  }

  const loadCoinDataInBackground = useCallback(async () => {
    try {
      setCoinDataLoading(true)

      // Get unique coin IDs
      const uniqueCoinIds = [...new Set([
        ...alerts.map((a: UserAlert) => a.coin_id),
        ...notifications.map((n: NotificationLog) => n.coin_id)
      ])]

      if (uniqueCoinIds.length === 0) {
        setCoinDataLoading(false)
        return
      }

      // Load coin data in background - this is slow but UI is already showing
      const coinsData = await getCoinsByIdsFromBunny(uniqueCoinIds)
      
      const coinDataMap: Record<string, any> = {}
      
      // Map coin IDs to actual coin data
      for (const coinId of uniqueCoinIds) {
        const coinData = coinsData.find(coin => 
          coin.coingecko_id === coinId || 
          coin.symbol.toLowerCase() === coinId.toLowerCase() ||
          coin.name.toLowerCase() === coinId.toLowerCase()
        )
        
        if (coinData) {
          coinDataMap[coinId] = {
            name: coinData.name,
            symbol: coinData.symbol,
            logo_url: coinData.logo_url,
            price: coinData.price,
            price_change_24h: coinData.price_change_24h,
            rank: coinData.rank
          }
        } else {
          // Fallback for coins not found
          coinDataMap[coinId] = {
            name: coinId.charAt(0).toUpperCase() + coinId.slice(1),
            symbol: coinId.toUpperCase(),
            logo_url: null,
            price: null,
            price_change_24h: null,
            rank: null
          }
        }
      }
      
      setCoinData(coinDataMap)
    } catch (err) {
      console.error('Failed to load coin data:', err)
      // Set fallback data so UI doesn't break
      const uniqueCoinIds = [...new Set([
        ...alerts.map((a: UserAlert) => a.coin_id),
        ...notifications.map((n: NotificationLog) => n.coin_id)
      ])]
      
      const fallbackData: Record<string, any> = {}
      for (const coinId of uniqueCoinIds) {
        fallbackData[coinId] = {
          name: coinId.charAt(0).toUpperCase() + coinId.slice(1),
          symbol: coinId.toUpperCase(),
          logo_url: null,
          price: null,
          price_change_24h: null,
          rank: null
        }
      }
      setCoinData(fallbackData)
    } finally {
      setCoinDataLoading(false)
    }
  }, [alerts, notifications])

  // Group alerts by coin
  const groupedAlerts = useMemo(() => {
    const groups: Record<string, CoinAlertGroup> = {}

    alerts.forEach(alert => {
      if (!groups[alert.coin_id]) {
        const coin = coinData[alert.coin_id] || {
          name: alert.coin_id.charAt(0).toUpperCase() + alert.coin_id.slice(1),
          symbol: alert.coin_id.toUpperCase(),
          logo_url: null
        }

        groups[alert.coin_id] = {
          coin_id: alert.coin_id,
          coin_name: coin.name,
          coin_symbol: coin.symbol,
          coin_logo: coin.logo_url,
          alerts: [],
          recent_notifications: notifications.filter(n => n.coin_id === alert.coin_id),
          active_count: 0,
          total_count: 0,
          last_triggered: null
        }
      }

      groups[alert.coin_id].alerts.push(alert)
      groups[alert.coin_id].total_count++
      if (alert.is_active) {
        groups[alert.coin_id].active_count++
      }
    })

    // Add last triggered timestamp
    Object.values(groups).forEach(group => {
      const recentNotification = group.recent_notifications
        .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0]
      group.last_triggered = recentNotification?.sent_at || null
    })

    return Object.values(groups)
  }, [alerts, notifications, coinData])

  // Filter and search
  const filteredGroups = useMemo(() => {
    let filtered = groupedAlerts

    // Search filter
    if (debouncedSearchTerm.trim()) {
      const searchLower = debouncedSearchTerm.toLowerCase()
      filtered = filtered.filter(group => 
        group.coin_name.toLowerCase().includes(searchLower) ||
        group.coin_symbol.toLowerCase().includes(searchLower)
      )
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(group => {
        if (filterType === 'active') return group.active_count > 0
        if (filterType === 'inactive') return group.active_count === 0
        return true
      })
    }

    return filtered.sort((a, b) => {
      // Sort by: active alerts first, then by last triggered, then alphabetically
      if (a.active_count !== b.active_count) {
        return b.active_count - a.active_count
      }
      if (a.last_triggered && b.last_triggered) {
        return new Date(b.last_triggered).getTime() - new Date(a.last_triggered).getTime()
      }
      return a.coin_name.localeCompare(b.coin_name)
    })
  }, [groupedAlerts, debouncedSearchTerm, filterType])

  // Pagination
  const totalPages = Math.ceil(filteredGroups.length / ITEMS_PER_PAGE)
  const paginatedGroups = filteredGroups.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const toggleAlert = async (alertId: string, isActive: boolean) => {
    try {
      const res = await fetch('/api/user-alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify({
          id: alertId,
          is_active: isActive
        })
      })

      if (res.ok) {
        setAlerts(alerts.map(alert => 
          alert.id === alertId ? { ...alert, is_active: isActive } : alert
        ))
      }
    } catch (err) {
      console.error('Failed to toggle alert:', err)
    }
  }

  const deleteAlert = async (alertId: string, coinId: string, alertType: string) => {
    try {
      console.log(`🗑️ Deleting alert: ${alertId} for coin: ${coinId}, type: ${alertType}`)
      
      const res = await fetch(`/api/user-alerts?coin_id=${coinId}&alert_type=${alertType}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.id}` }
      })

      if (res.ok) {
        console.log(`✅ Alert deleted successfully`)
        setAlerts(alerts.filter(alert => alert.id !== alertId))
        
        // Notify parent component
        if (onNotificationDeleted) {
          console.log(`📢 Calling onNotificationDeleted callback for coin: ${coinId}`)
          onNotificationDeleted(coinId)
        }
        
        // Dispatch custom event for cross-page communication
        console.log(`📡 Dispatching notificationDeleted event for coin: ${coinId}`)
        const event = new CustomEvent('notificationDeleted', {
          detail: { coinId, userId: user.id }
        })
        window.dispatchEvent(event)
        
        // Also dispatch a storage event for other tabs/windows
        const storageData = {
          coinId,
          userId: user.id,
          timestamp: Date.now()
        }
        console.log(`💾 Setting localStorage notificationDeleted:`, storageData)
        localStorage.setItem('notificationDeleted', JSON.stringify(storageData))
      } else {
        console.error(`❌ Failed to delete alert: ${res.status} ${res.statusText}`)
      }
    } catch (err) {
      console.error('Failed to delete alert:', err)
    }
  }

  const deleteCoinNotifications = async (coinId: string, coinName: string) => {
    try {
      console.log(`🗑️ Deleting all notifications for coin: ${coinId} (${coinName})`)
      
      // Delete all alerts for this coin
      const coinAlerts = alerts.filter(alert => alert.coin_id === coinId)
      console.log(`📋 Found ${coinAlerts.length} alerts to delete for ${coinId}`)
      
      for (const alert of coinAlerts) {
        await fetch(`/api/user-alerts?coin_id=${coinId}&alert_type=${alert.alert_type}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${user.id}` }
        })
      }

      // Delete all notifications for this coin
      await fetch('/api/notifications/pending', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}` 
        },
        body: JSON.stringify({
          userId: user.id,
          coinId: coinId
        })
      })

      // Update local state
      setAlerts(alerts.filter(alert => alert.coin_id !== coinId))
      setNotifications(notifications.filter(notification => notification.coin_id !== coinId))
      
      console.log(`✅ All notifications deleted for ${coinName}`)
      
      // Notify parent component
      if (onNotificationDeleted) {
        console.log(`📢 Calling onNotificationDeleted callback for coin: ${coinId}`)
        onNotificationDeleted(coinId)
      }
      
      // Dispatch custom event for cross-page communication
      console.log(`📡 Dispatching notificationDeleted event for coin: ${coinId}`)
      const event = new CustomEvent('notificationDeleted', {
        detail: { coinId, userId: user.id }
      })
      window.dispatchEvent(event)
      
      // Also dispatch a storage event for other tabs/windows
      const storageData = {
        coinId,
        userId: user.id,
        timestamp: Date.now()
      }
      console.log(`💾 Setting localStorage notificationDeleted:`, storageData)
      localStorage.setItem('notificationDeleted', JSON.stringify(storageData))
      
      console.log(`✅ Deleted all notifications for ${coinName}`)
    } catch (err) {
      console.error('Failed to delete coin notifications:', err)
    }
  }

  const toggleCoinExpansion = (coinId: string) => {
    const newExpanded = new Set(expandedCoins)
    if (newExpanded.has(coinId)) {
      newExpanded.delete(coinId)
    } else {
      newExpanded.add(coinId)
    }
    setExpandedCoins(newExpanded)
  }

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'health_score': return <Activity className="w-4 h-4 text-red-500" />
      case 'consistency_score': return <Shield className="w-4 h-4 text-blue-500" />
      case 'price_drop': return <TrendingDown className="w-4 h-4 text-orange-500" />
      case 'migration': 
      case 'delisting': return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      default: return <Bell className="w-4 h-4 text-gray-500" />
    }
  }

  const getAlertTypeLabel = (alertType: string) => {
    switch (alertType) {
      case 'health_score': return 'Health Score'
      case 'consistency_score': return 'Consistency'
      case 'price_drop': return 'Price Drop'
      case 'migration': return 'Migration'
      case 'delisting': return 'Delisting'
      default: return alertType
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const activeAlertsCount = alerts.filter(alert => alert.is_active).length
  const recentNotificationsCount = notifications.filter(n => 
    new Date().getTime() - new Date(n.sent_at).getTime() < 24 * 60 * 60 * 1000
  ).length

  if (loading) {
    return (
      <div className={`rounded-2xl shadow-2xl backdrop-blur-md border-0 max-w-7xl mx-auto ${
        isDarkMode ? "bg-slate-800/50" : "bg-white/80"
      }`}>
        <div className="p-6 border-b border-opacity-20">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Bell className={`w-6 h-6 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
              <h2 className={`text-xl font-bold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                Notification Center
              </h2>
            </div>
            {onClose && (
              <Button onClick={onClose} variant="outline" className="rounded-xl">
                Close
              </Button>
            )}
          </div>
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                Loading your alerts and notifications...
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl shadow-2xl backdrop-blur-md border-0 max-w-7xl mx-auto ${
      isDarkMode ? "bg-slate-800/50" : "bg-white/80"
    }`}>
      {/* Header */}
      <div className="p-6 border-b border-opacity-20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className={`w-6 h-6 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
            <h2 className={`text-xl font-bold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
              Notification Center
            </h2>
            {coinDataLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-500"></div>
                <span>Loading coin data...</span>
              </div>
            )}
          </div>
          {onClose && (
            <Button onClick={onClose} variant="outline" className="rounded-xl">
              Close
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className={`p-4 rounded-xl ${isDarkMode ? "bg-slate-700/50" : "bg-blue-50/80"}`}>
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-blue-500" />
              <div>
                <div className={`text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  Active Alerts
                </div>
                <div className={`text-xl font-bold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                  {activeAlertsCount}
                </div>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-xl ${isDarkMode ? "bg-slate-700/50" : "bg-green-50/80"}`}>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-green-500" />
              <div>
                <div className={`text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  Last 24h
                </div>
                <div className={`text-xl font-bold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                  {recentNotificationsCount}
                </div>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-xl ${isDarkMode ? "bg-slate-700/50" : "bg-purple-50/80"}`}>
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-purple-500" />
              <div>
                <div className={`text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  Total Coins
                </div>
                <div className={`text-xl font-bold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                  {groupedAlerts.length}
                </div>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-xl ${isDarkMode ? "bg-slate-700/50" : "bg-orange-50/80"}`}>
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <div>
                <div className={`text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  Total Alerts
                </div>
                <div className={`text-xl font-bold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                  {alerts.length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            onClick={() => setActiveTab('coins')}
            variant={activeTab === 'coins' ? 'default' : 'outline'}
            className="rounded-xl"
          >
            <Bell className="w-4 h-4 mr-2" />
            My Alerts
          </Button>
          <Button
            onClick={() => setActiveTab('history')}
            variant={activeTab === 'history' ? 'default' : 'outline'}
            className="rounded-xl"
          >
            <Clock className="w-4 h-4 mr-2" />
            History
          </Button>
          <Button
            onClick={() => setActiveTab('preferences')}
            variant={activeTab === 'preferences' ? 'default' : 'outline'}
            className="rounded-xl"
          >
            <Settings className="w-4 h-4 mr-2" />
            Preferences
          </Button>
        </div>

        {/* Search and Filters - Only show for alerts tab */}
        {activeTab === 'coins' && (
          <>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                  isDarkMode ? "text-slate-400" : "text-slate-500"
                }`} />
                <Input
                  placeholder="Search coins..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-10 rounded-xl border-0 ${
                    isDarkMode 
                      ? "bg-slate-700/50 text-slate-100 placeholder-slate-400" 
                      : "bg-slate-50/80 text-slate-900 placeholder-slate-500"
                  }`}
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => setFilterType('all')}
                  variant={filterType === 'all' ? 'default' : 'outline'}
                  className="rounded-xl"
                  size="sm"
                >
                  All
                </Button>
                <Button
                  onClick={() => setFilterType('active')}
                  variant={filterType === 'active' ? 'default' : 'outline'}
                  className="rounded-xl"
                  size="sm"
                >
                  Active
                </Button>
                <Button
                  onClick={() => setFilterType('inactive')}
                  variant={filterType === 'inactive' ? 'default' : 'outline'}
                  className="rounded-xl"
                  size="sm"
                >
                  Inactive
                </Button>
              </div>
            </div>

            {/* Results count */}
            <div className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              Showing {paginatedGroups.length} of {filteredGroups.length} coins
              {debouncedSearchTerm && ` for "${debouncedSearchTerm}"`}
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className={`p-4 rounded-xl mb-4 ${
            isDarkMode ? "bg-red-900/20 border-red-700 text-red-300" : "bg-red-50 border-red-200 text-red-700"
          }`}>
            {error}
          </div>
        )}

        {/* My Alerts Tab */}
        {activeTab === 'coins' && (
          <>
            {filteredGroups.length === 0 ? (
              <div className={`text-center py-12 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                <Bell className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No alerts found</h3>
                <p className="text-sm">
                  {searchTerm ? 'Try adjusting your search terms' : 'Set up alerts by clicking the bell icon next to any coin'}
                </p>
              </div>
            ) : (
              <>
                {/* Coin Alert Rows */}
                <div className="space-y-2">
                  {paginatedGroups.map((group) => (
                    <div
                      key={group.coin_id}
                      className={`rounded-xl border transition-all duration-200 ${
                        isDarkMode 
                          ? "bg-slate-700/30 border-slate-600/50 hover:bg-slate-700/50" 
                          : "bg-white/60 border-slate-200/50 hover:bg-white/80"
                      }`}
                    >
                      {/* Main Row */}
                      <div 
                        className="p-4 cursor-pointer"
                        onClick={() => toggleCoinExpansion(group.coin_id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            {/* Coin Info */}
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                {group.coin_logo ? (
                                  <img
                                    src={group.coin_logo}
                                    alt={`${group.coin_name} logo`}
                                    className="w-10 h-10 rounded-xl shadow-sm"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none"
                                      const next = e.currentTarget.nextElementSibling
                                      if (next instanceof HTMLElement) next.style.display = "flex"
                                    }}
                                  />
                                ) : null}
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br from-blue-500 to-purple-500 shadow-sm ${group.coin_logo ? 'hidden' : ''}`}>
                                  {group.coin_symbol.slice(0, 2)}
                                </div>
                              </div>
                              <div>
                                <div className={`font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                                  {group.coin_name}
                                </div>
                                <div className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                                  {group.coin_symbol}
                                </div>
                              </div>
                            </div>

                            {/* Price Info (if available) */}
                            {coinData[group.coin_id]?.price && (
                              <div className="text-center">
                                <div className={`text-sm font-bold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                                  ${coinData[group.coin_id].price.toFixed(coinData[group.coin_id].price < 1 ? 6 : 2)}
                                </div>
                                {coinData[group.coin_id].price_change_24h !== null && (
                                  <div className={`text-xs font-semibold ${
                                    coinData[group.coin_id].price_change_24h >= 0
                                      ? 'text-green-500'
                                      : 'text-red-500'
                                  }`}>
                                    {coinData[group.coin_id].price_change_24h >= 0 ? '+' : ''}
                                    {coinData[group.coin_id].price_change_24h.toFixed(2)}%
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Alert Stats */}
                            <div className="flex items-center gap-4 flex-1">
                              <div className="text-center">
                                <div className={`text-lg font-bold ${group.active_count > 0 ? 'text-green-500' : isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                  {group.active_count}
                                </div>
                                <div className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                                  Active
                                </div>
                              </div>
                              <div className="text-center">
                                <div className={`text-lg font-bold ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                                  {group.total_count}
                                </div>
                                <div className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                                  Total
                                </div>
                              </div>
                              <div className="text-center flex-1">
                                <div className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                                  {group.last_triggered ? formatTimeAgo(group.last_triggered) : 'Never'}
                                </div>
                                <div className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                                  Last Alert
                                </div>
                              </div>
                            </div>

                            {/* Alert Type Badges */}
                            <div className="flex gap-1 flex-wrap">
                              {[...new Set(group.alerts.map(a => a.alert_type))].map(type => (
                                <Badge key={type} variant="outline" className="text-xs">
                                  {getAlertTypeLabel(type)}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* Delete All Notifications Button */}
                          <div className="ml-4">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteCoinNotifications(group.coin_id, group.coin_name)
                              }}
                              variant="outline"
                              size="sm"
                              className={`rounded-lg p-2 transition-colors ${
                                isDarkMode 
                                  ? "hover:bg-red-900/20 hover:border-red-600/50 hover:text-red-400" 
                                  : "hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                              }`}
                              title={`Delete all alerts and notifications for ${group.coin_name}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Expand/Collapse */}
                          <div className="ml-2">
                            {expandedCoins.has(group.coin_id) ? (
                              <ChevronUp className={`w-5 h-5 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`} />
                            ) : (
                              <ChevronDown className={`w-5 h-5 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`} />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {expandedCoins.has(group.coin_id) && (
                        <div className={`border-t px-4 pb-4 ${isDarkMode ? "border-slate-600/50" : "border-slate-200/50"}`}>
                          <div className="mt-4 space-y-3">
                            {group.alerts.map((alert) => (
                              <div
                                key={alert.id}
                                className={`p-3 rounded-lg border ${
                                  isDarkMode 
                                    ? "bg-slate-800/50 border-slate-600/30" 
                                    : "bg-slate-50/50 border-slate-200/30"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    {getAlertIcon(alert.alert_type)}
                                    <div>
                                      <div className={`font-medium ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                                        {getAlertTypeLabel(alert.alert_type)}
                                      </div>
                                      <div className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                                        {alert.threshold_value ? `Threshold: ${alert.threshold_value}` : 'Event-based alert'}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={alert.is_active}
                                      onCheckedChange={(checked) => toggleAlert(alert.id, checked)}
                                    />
                                    <Button
                                      onClick={() => deleteAlert(alert.id, alert.coin_id, alert.alert_type)}
                                      variant="outline"
                                      size="sm"
                                      className="rounded-lg p-2"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-6">
                    <Button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      variant="outline"
                      className="rounded-xl"
                    >
                      Previous
                    </Button>
                    <span className={`px-4 py-2 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      variant="outline"
                      className="rounded-xl"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <h3 className={`text-lg font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
              Notification History
            </h3>
            {notifications.length === 0 ? (
              <div className={`text-center py-12 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No notifications yet</h3>
                <p className="text-sm">
                  You'll see your notification history here once alerts start triggering
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => {
                                      const isRead = notification.acknowledged_at !== null || notification.delivery_status === 'read'
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-xl border transition-all duration-200 hover:scale-[1.01] ${
                        isRead
                          ? isDarkMode 
                            ? "bg-slate-700/20 border-slate-600/30 opacity-75" 
                            : "bg-slate-50/60 border-slate-200/30 opacity-75"
                          : isDarkMode 
                            ? "bg-slate-700/40 border-slate-600/50 hover:bg-slate-700/60" 
                            : "bg-white/80 border-slate-200/50 hover:bg-white/90"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {getAlertIcon(notification.alert_type)}
                          <div className="flex-1">
                            <p className={`font-medium ${
                              isRead 
                                ? isDarkMode ? "text-slate-300" : "text-slate-600"
                                : isDarkMode ? "text-slate-100" : "text-slate-900"
                            }`}>
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {getAlertTypeLabel(notification.alert_type)}
                              </Badge>
                              <span className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                                {formatTimeAgo(notification.sent_at)}
                              </span>
                              {isRead && (
                                <Badge variant="secondary" className="text-xs">
                                  Read
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={
                              isRead ? 'secondary' : 
                              notification.delivery_status === 'delivered' ? 'default' : 'outline'
                            }
                            className="text-xs"
                          >
                            {isRead ? 'Read' : notification.delivery_status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <NotificationPreferences 
            user={user} 
            isDarkMode={isDarkMode}
          />
        )}
      </div>
    </div>
  )
} 