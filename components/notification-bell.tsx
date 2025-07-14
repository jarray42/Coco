"use client"

import { useState, useEffect, useCallback } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import type { AuthUser } from "../utils/supabase-auth"

interface NotificationBellProps {
  user: AuthUser
  isDarkMode: boolean
  className?: string
}

export function NotificationBell({ user, isDarkMode, className = "" }: NotificationBellProps) {
  const router = useRouter()
  const [notificationCount, setNotificationCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date())

  const fetchNotificationCount = useCallback(async () => {
    if (!user?.id) {
      return
    }

    try {
      const response = await fetch(`/api/notifications/pending?user_id=${user.id}&count_only=true`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      
      if (!response.ok) {
        return
      }

      const data = await response.json()
      const count = data.count || 0
      
      setNotificationCount(count)
      setLastUpdateTime(new Date())
      
    } catch (error) {
      console.error('Error fetching notification count:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  // Initial load and polling
  useEffect(() => {
    if (!user?.id) {
      return
    }
    
    // Fetch immediately
    fetchNotificationCount()
    
    // Poll every 30 seconds for more responsive updates
    const interval = setInterval(() => {
      fetchNotificationCount()
    }, 30000)

    return () => {
      clearInterval(interval)
    }
  }, [user?.id, fetchNotificationCount])

  const handleClick = async () => {
    // Only try to mark as read if there are notifications
    if (notificationCount > 0) {
      try {
        const response = await fetch('/api/notifications/pending', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          },
          body: JSON.stringify({
            userId: user.id,
            markAllAsRead: true
          })
        })
        
        if (response.ok) {
          // Immediately update the count to 0 for instant feedback
          setNotificationCount(0)
          setLastUpdateTime(new Date())
        }
        
      } catch (error) {
        console.error('Error marking notifications as read:', error)
      }
    }
    
    // Navigate to notifications page
    router.push('/notifications')
  }

  return (
    <div className={`relative ${className}`}>
      <Button
        onClick={handleClick}
        variant="outline"
        className={`h-10 w-10 p-0 rounded-xl transition-all duration-300 backdrop-blur-md shadow-lg border-0 ${
          isDarkMode
            ? "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70 hover:text-slate-100 hover:scale-105"
            : "bg-white/80 text-slate-700 hover:bg-white/90 hover:text-slate-900 hover:scale-105"
        }`}
        disabled={isLoading}
        title={`${notificationCount} unread notifications`}
      >
        <Bell 
          className={`w-5 h-5 transition-all duration-300 ${
            notificationCount > 0 ? 'animate-pulse text-blue-500' : ''
          }`} 
        />
      </Button>
      
      {/* Notification Count Badge */}
      {notificationCount > 0 && (
        <Badge
          variant="destructive"
          className={`absolute -top-2 -right-2 h-5 min-w-5 p-0 flex items-center justify-center text-xs font-bold rounded-full border-2 animate-pulse ${
            isDarkMode ? "border-slate-800" : "border-white"
          }`}
        >
          {notificationCount > 99 ? '99+' : notificationCount}
        </Badge>
      )}

      {/* Loading indicator - only show when actively loading and count is 0 */}
      {isLoading && notificationCount === 0 && (
        <div 
          className={`absolute -top-1 -right-1 w-3 h-3 rounded-full animate-spin border-2 border-transparent ${
            isDarkMode ? "border-t-blue-400" : "border-t-blue-500"
          }`} 
        />
      )}
    </div>
  )
} 