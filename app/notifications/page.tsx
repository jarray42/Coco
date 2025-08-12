"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ModernDeFiBackground } from "../../components/modern-defi-background"
import { NotificationDashboard } from "../../components/notification-dashboard"
import { SiteHeader } from "../../components/site-header"
import { UserMenu } from "../../components/user-menu"
import { NotificationBell } from "../../components/notification-bell"
import { Button } from "../../components/ui/button"
import { Sun, Moon, ArrowLeft } from "lucide-react"
import { getCurrentUser, onAuthStateChange, type AuthUser } from "../../utils/supabase-auth"

export default function NotificationsPage() {
  const router = useRouter()
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check initial auth state
    checkAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = onAuthStateChange((user) => {
      setUser(user)
      if (!user) {
        router.push('/') // Redirect to home if not authenticated
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const checkAuth = async () => {
    try {
      const { user } = await getCurrentUser()
      setUser(user as AuthUser | null)
      if (!user) {
        router.push('/') // Redirect to home if not authenticated
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = () => {
    setUser(null)
    router.push('/')
  }

  const handleBack = () => {
    router.push("/")
  }

  const handleNotificationDeleted = (coinId: string) => {
    // This will be called when notifications are deleted
    // The main dashboard will also receive the event and invalidate its cache
    console.log(`Notification deleted for coin ${coinId} in notifications page`)
  }

  if (loading) {
    return (
      <div className={`min-h-screen transition-all duration-1000 ${isDarkMode ? "dark" : ""}`}>
        <ModernDeFiBackground isDarkMode={isDarkMode} />
        <div className="relative z-10 max-w-6xl mx-auto p-3 sm:p-4 lg:p-6">
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect in useEffect
  }

  return (
    <div className={`min-h-screen transition-all duration-1000 ${isDarkMode ? "dark" : ""}`}>
      <ModernDeFiBackground isDarkMode={isDarkMode} />

      <div className="relative z-10 max-w-7xl mx-auto p-3 sm:p-4 lg:p-6">
        {/* Top Header with Navigation and Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              onClick={handleBack}
              variant="outline"
              className={`rounded-xl transition-all duration-300 backdrop-blur-md shadow-lg border-0 ${
                isDarkMode
                  ? "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70 hover:text-slate-100 hover:scale-105"
                  : "bg-white/80 text-slate-700 hover:bg-white/90 hover:text-slate-900 hover:scale-105"
              }`}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            
            <SiteHeader isMainPage={false} isDarkMode={isDarkMode} />
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsDarkMode(!isDarkMode)}
              variant="outline"
              className={`h-10 px-4 rounded-xl transition-all duration-300 backdrop-blur-md shadow-lg border-0 ${
                isDarkMode
                  ? "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70 hover:text-slate-100 hover:scale-105"
                  : "bg-white/80 text-slate-700 hover:bg-white/90 hover:text-slate-900 hover:scale-105"
              }`}
            >
              {isDarkMode ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
              {isDarkMode ? "Light" : "Dark"}
            </Button>

            <div className="flex items-center gap-3">
              <NotificationBell user={user} isDarkMode={isDarkMode} />
              <UserMenu user={user} isDarkMode={isDarkMode} onSignOut={handleSignOut} />
            </div>
          </div>
        </div>

        {/* Main Notification Dashboard */}
        <NotificationDashboard 
          user={user} 
          isDarkMode={isDarkMode}
          onNotificationDeleted={handleNotificationDeleted}
        />
      </div>
    </div>
  )
} 