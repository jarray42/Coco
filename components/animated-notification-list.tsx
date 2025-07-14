"use client"

import { useState, useEffect, useCallback } from "react"
import { AnimatedList, AnimatedListItem } from "./animated-list"
import { Bell, TrendingDown, Activity, Shield, AlertTriangle } from "lucide-react"
import type { AuthUser } from "../utils/supabase-auth"

interface NotificationItem {
  id: string
  coin_id: string
  alert_type: string
  message: string
  sent_at: string
  coin_symbol?: string
  coin_name?: string
}

interface AnimatedNotificationListProps {
  user: AuthUser
  isDarkMode: boolean
  className?: string
}

export function AnimatedNotificationList({ user, isDarkMode, className = "" }: AnimatedNotificationListProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isVisible, setIsVisible] = useState(false)
  const [lastFetchTime, setLastFetchTime] = useState<Date>(new Date())

  const fetchRecentNotifications = useCallback(async () => {
    try {
      const response = await fetch(`/api/notifications/pending?user_id=${user.id}&limit=5&recent=true`)
      if (response.ok) {
        const data = await response.json()
        const newNotifications = Array.isArray(data) ? data : []
        
        // Only show notifications that are newer than our last fetch
        const recentNotifications = newNotifications.filter((notification: NotificationItem) => 
          new Date(notification.sent_at) > lastFetchTime
        )

        if (recentNotifications.length > 0) {
          setNotifications(recentNotifications)
          setIsVisible(true)
          setLastFetchTime(new Date())
          
          // Auto-hide after showing all notifications (delay * count + 3 seconds)
          const autoHideDelay = (recentNotifications.length * 1500) + 3000
          setTimeout(() => {
            setIsVisible(false)
          }, autoHideDelay)
        }
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }, [user.id, lastFetchTime])

  useEffect(() => {
    if (user?.id) {
      // Initial fetch
      fetchRecentNotifications()
      
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchRecentNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [user?.id, fetchRecentNotifications])

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'health_score':
        return <Activity className="w-4 h-4 text-red-500" />
      case 'consistency_score':
        return <Shield className="w-4 h-4 text-blue-500" />
      case 'price_drop':
        return <TrendingDown className="w-4 h-4 text-orange-500" />
      case 'migration':
      case 'delisting':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'portfolio_batch':
      case 'market_event':
        return <Bell className="w-4 h-4 text-purple-500" />
      default:
        return <Bell className="w-4 h-4 text-gray-500" />
    }
  }

  const getAlertColor = (alertType: string) => {
    switch (alertType) {
      case 'health_score':
        return isDarkMode ? 'border-red-500/30 bg-red-900/20' : 'border-red-200 bg-red-50'
      case 'consistency_score':
        return isDarkMode ? 'border-blue-500/30 bg-blue-900/20' : 'border-blue-200 bg-blue-50'
      case 'price_drop':
        return isDarkMode ? 'border-orange-500/30 bg-orange-900/20' : 'border-orange-200 bg-orange-50'
      case 'migration':
      case 'delisting':
        return isDarkMode ? 'border-yellow-500/30 bg-yellow-900/20' : 'border-yellow-200 bg-yellow-50'
      case 'portfolio_batch':
      case 'market_event':
        return isDarkMode ? 'border-purple-500/30 bg-purple-900/20' : 'border-purple-200 bg-purple-50'
      default:
        return isDarkMode ? 'border-slate-600/30 bg-slate-800/20' : 'border-slate-200 bg-slate-50'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  const truncateMessage = (message: string, maxLength: number = 60) => {
    return message.length > maxLength ? `${message.substring(0, maxLength)}...` : message
  }

  if (!isVisible || notifications.length === 0) {
    return null
  }

  return (
    <div className={`fixed top-20 right-6 z-50 max-w-sm ${className}`}>
      <AnimatedList delay={1500} className="space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-3 rounded-xl border backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer ${
              getAlertColor(notification.alert_type)
            } ${
              isDarkMode 
                ? "bg-slate-800/90 border-slate-600/50" 
                : "bg-white/90 border-slate-200/50"
            }`}
            onClick={() => window.location.href = '/notifications'}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getAlertIcon(notification.alert_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className={`text-sm font-semibold truncate ${
                    isDarkMode ? "text-slate-100" : "text-slate-900"
                  }`}>
                    {notification.coin_symbol || notification.coin_id.toUpperCase()}
                  </div>
                  <div className={`text-xs ${
                    isDarkMode ? "text-slate-400" : "text-slate-600"
                  }`}>
                    {formatTimeAgo(notification.sent_at)}
                  </div>
                </div>
                <p className={`text-xs leading-relaxed ${
                  isDarkMode ? "text-slate-300" : "text-slate-700"
                }`}>
                  {truncateMessage(notification.message)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </AnimatedList>
    </div>
  )
} 