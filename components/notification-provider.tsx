"use client"

import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'
import { notificationPoller } from '../utils/notification-poller'
import type { AuthUser } from '../utils/supabase-auth'

interface NotificationProviderProps {
  children: React.ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Check initial auth state
    checkUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)
      
      if (session?.user) {
        const authUser: AuthUser = {
          id: session.user.id,
          email: session.user.email || '',
          user_metadata: session.user.user_metadata
        }
        setUser(authUser)
        initializeNotifications(authUser)
      } else {
        setUser(null)
        stopNotifications()
      }
    })

    return () => {
      subscription.unsubscribe()
      stopNotifications()
    }
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const user: AuthUser = {
          id: authUser.id,
          email: authUser.email || '',
          user_metadata: authUser.user_metadata
        }
        setUser(user)
        await initializeNotifications(user)
      }
    } catch (error) {
      console.error('Error checking user:', error)
    }
  }

  const initializeNotifications = async (user: AuthUser) => {
    if (isInitialized) {
      console.log('📡 Notifications already initialized')
      return
    }

    try {
      console.log('🔔 Initializing notification system for:', user.email)
      
      // Initialize the notification poller
      await notificationPoller.initialize(user)
      
      // Start polling every 30 seconds
      notificationPoller.start(30000)
      
      setIsInitialized(true)
      console.log('✅ Notification system initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize notification system:', error)
    }
  }

  const stopNotifications = () => {
    if (isInitialized) {
      console.log('🛑 Stopping notification system')
      notificationPoller.stop()
      setIsInitialized(false)
    }
  }

  // Provide status information for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Add global debug method
      (window as any).notificationStatus = () => {
        const status = notificationPoller.getStatus()
        console.log('🔍 Notification System Status:', {
          ...status,
          currentUser: user?.email,
          isProviderInitialized: isInitialized
        })
        return status
      }

      // Add manual check method for testing
      (window as any).checkNotifications = () => {
        console.log('🔍 Manual notification check triggered')
        notificationPoller.checkNow()
      }
    }
  }, [user, isInitialized])

  return <>{children}</>
}

// For debugging - can be called from browser console
export const getNotificationStatus = () => {
  return notificationPoller.getStatus()
} 