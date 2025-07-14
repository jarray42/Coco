"use client"

import { useState, useEffect } from "react"
import { Bell, Clock, Volume2, VolumeX, Smartphone, Mail, Globe, Shield, Zap, Moon, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { AuthUser } from "../utils/supabase-auth"

interface NotificationPreferences {
  // Delivery Methods
  browser_push: boolean
  email_alerts: boolean
  in_app_only: boolean
  
  // Smart Controls
  notification_style: 'minimal' | 'detailed' | 'custom'
  snooze_enabled: boolean
  snooze_duration: number // in hours (1-48)
  
  // Urgency Levels
  critical_only: boolean // Only migration/delisting
  important_and_critical: boolean // + health/price drops
  all_notifications: boolean // + consistency updates
  
  // Batching Preferences
  batch_portfolio_alerts: boolean
  max_notifications_per_hour: number
  
  // Sound & Visual
  sound_enabled: boolean
  vibration_enabled: boolean
}

interface NotificationPreferencesProps {
  user: AuthUser
  isDarkMode: boolean
  onClose?: () => void
}

export function NotificationPreferences({ user, isDarkMode, onClose }: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    browser_push: true,
    email_alerts: false,
    in_app_only: false,
    notification_style: 'detailed',
    snooze_enabled: true,
    snooze_duration: 16,
    critical_only: false,
    important_and_critical: true,
    all_notifications: false,
    batch_portfolio_alerts: true,
    max_notifications_per_hour: 10, // Increased from 3 to 10
    sound_enabled: true,
    vibration_enabled: true
  })
  
  const [loading, setLoading] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  useEffect(() => {
    loadPreferences()
    checkNotificationPermission()
  }, [user.id])

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/notification-preferences', {
        headers: { 'Authorization': `Bearer ${user.id}` }
      })
      if (response.ok) {
        const data = await response.json()
        // Only update with server data, don't merge with local defaults
        setPreferences(prevPrefs => ({ ...prevPrefs, ...data }))
        console.log('✅ Loaded preferences from server:', data)
      } else {
        console.error('Failed to load preferences:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Failed to load preferences:', error)
    }
  }

  const checkNotificationPermission = async () => {
    if ('Notification' in window) {
      setHasPermission(Notification.permission === 'granted')
    }
  }

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      setHasPermission(permission === 'granted')
    }
  }

  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    setLoading(true)
    try {
      const newPreferences = { ...preferences, ...updates }
      setPreferences(newPreferences)
      
      console.log('💾 Saving preferences:', newPreferences)
      
      const response = await fetch('/api/notification-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify(newPreferences)
      })
      
      if (!response.ok) {
        throw new Error(`Failed to save preferences: ${response.status} ${response.statusText}`)
      }
      
      const savedData = await response.json()
      console.log('✅ Preferences saved successfully:', savedData)
      setSaveMessage('Preferences saved successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000)
      
    } catch (error) {
      console.error('❌ Failed to update preferences:', error)
      // Revert the optimistic update on error
      setPreferences(preferences)
      setSaveMessage('Failed to save preferences.')
      
      // Clear error message after 5 seconds
      setTimeout(() => setSaveMessage(null), 5000)
    } finally {
      setLoading(false)
    }
  }

  const getNotificationStyleDescription = (style: string) => {
    switch (style) {
      case 'minimal':
        return 'Simple alerts with coin name and key info only'
      case 'detailed':
        return 'Rich notifications with charts, context, and recommendations'
      case 'custom':
        return 'Customize each alert type individually'
      default:
        return ''
    }
  }

  return (
    <div className={`rounded-2xl shadow-2xl backdrop-blur-md border-0 max-w-2xl mx-auto ${
      isDarkMode ? "bg-slate-800/50" : "bg-white/80"
    }`}>
      {/* Header */}
      <div className="p-6 border-b border-opacity-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className={`w-6 h-6 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
            <div>
              <h2 className={`text-xl font-bold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                Notification Preferences
              </h2>
              <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                Stay informed without the noise
              </p>
            </div>
          </div>
          {onClose && (
            <Button onClick={onClose} variant="outline" className="rounded-xl">
              Done
            </Button>
          )}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Saving...</span>
            </div>
          )}
          {saveMessage && (
            <div className={`flex items-center gap-2 text-sm font-medium px-3 py-1 rounded-lg ${
              saveMessage.includes('successfully') 
                ? 'bg-green-100 text-green-700 border border-green-200' 
                : 'bg-red-100 text-red-700 border border-red-200'
            }`}>
              {saveMessage.includes('successfully') ? '✅' : '❌'}
              <span>{saveMessage}</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Delivery Methods */}
        <div className="space-y-4">
          <h3 className={`text-lg font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
            How You'll Be Notified
          </h3>
          
          <div className="grid gap-4">
            {/* Browser Push */}
            <Card className={`border ${isDarkMode ? "bg-slate-700/30 border-slate-600/50" : "bg-slate-50/50 border-slate-200/50"}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Smartphone className={`w-5 h-5 ${hasPermission ? 'text-green-500' : 'text-orange-500'}`} />
                    <div>
                      <div className={`font-medium ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                        Browser Notifications
                      </div>
                      <div className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                        Real-time alerts when browsing
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!hasPermission && (
                      <Button
                        onClick={requestNotificationPermission}
                        size="sm"
                        variant="outline"
                        className="text-xs"
                      >
                        Enable
                      </Button>
                    )}
                    <Switch
                      checked={preferences.browser_push && hasPermission === true}
                      onCheckedChange={(checked) => updatePreferences({ browser_push: checked })}
                      disabled={!hasPermission}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Email */}
            <Card className={`border ${isDarkMode ? "bg-slate-700/30 border-slate-600/50" : "bg-slate-50/50 border-slate-200/50"}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-blue-500" />
                    <div>
                      <div className={`font-medium ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                        Email Alerts
                      </div>
                      <div className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                        Critical alerts via email
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.email_alerts}
                    onCheckedChange={(checked) => updatePreferences({ email_alerts: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator className="opacity-30" />

        {/* Notification Level */}
        <div className="space-y-4">
          <h3 className={`text-lg font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
            What You'll Hear About
          </h3>
          
          <div className="space-y-3">
            {/* Critical Only */}
            <Card 
              className={`border cursor-pointer transition-all ${
                preferences.critical_only 
                  ? isDarkMode ? "bg-red-900/20 border-red-600/50" : "bg-red-50/80 border-red-200"
                  : isDarkMode ? "bg-slate-700/30 border-slate-600/50" : "bg-slate-50/50 border-slate-200/50"
              }`}
              onClick={() => updatePreferences({ 
                critical_only: true, 
                important_and_critical: false, 
                all_notifications: false 
              })}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-red-500" />
                    <div>
                      <div className={`font-medium ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                        Critical Only
                        <Badge variant="secondary" className="ml-2 text-xs">Minimal</Badge>
                      </div>
                      <div className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                        Only migrations & delistings
                      </div>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    preferences.critical_only 
                      ? 'bg-red-500 border-red-500' 
                      : isDarkMode ? 'border-slate-500' : 'border-slate-300'
                  }`}>
                    {preferences.critical_only && (
                      <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Important + Critical */}
            <Card 
              className={`border cursor-pointer transition-all ${
                preferences.important_and_critical 
                  ? isDarkMode ? "bg-blue-900/20 border-blue-600/50" : "bg-blue-50/80 border-blue-200"
                  : isDarkMode ? "bg-slate-700/30 border-slate-600/50" : "bg-slate-50/50 border-slate-200/50"
              }`}
              onClick={() => updatePreferences({ 
                critical_only: false, 
                important_and_critical: true, 
                all_notifications: false 
              })}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-blue-500" />
                    <div>
                      <div className={`font-medium ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                        Smart Alerts
                        <Badge variant="secondary" className="ml-2 text-xs">Recommended</Badge>
                      </div>
                      <div className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                        Critical events + significant price/health changes
                      </div>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    preferences.important_and_critical 
                      ? 'bg-blue-500 border-blue-500' 
                      : isDarkMode ? 'border-slate-500' : 'border-slate-300'
                  }`}>
                    {preferences.important_and_critical && (
                      <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* All Notifications */}
            <Card 
              className={`border cursor-pointer transition-all ${
                preferences.all_notifications 
                  ? isDarkMode ? "bg-green-900/20 border-green-600/50" : "bg-green-50/80 border-green-200"
                  : isDarkMode ? "bg-slate-700/30 border-slate-600/50" : "bg-slate-50/50 border-slate-200/50"
              }`}
              onClick={() => updatePreferences({ 
                critical_only: false, 
                important_and_critical: false, 
                all_notifications: true 
              })}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-green-500" />
                    <div>
                      <div className={`font-medium ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                        Everything
                        <Badge variant="secondary" className="ml-2 text-xs">Detailed</Badge>
                      </div>
                      <div className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                        All alerts including consistency updates
                      </div>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    preferences.all_notifications 
                      ? 'bg-green-500 border-green-500' 
                      : isDarkMode ? 'border-slate-500' : 'border-slate-300'
                  }`}>
                    {preferences.all_notifications && (
                      <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator className="opacity-30" />

        {/* Smart Features */}
        <div className="space-y-4">
          <h3 className={`text-lg font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
            Smart Features
          </h3>
          
          <div className="space-y-4">
            {/* Snooze Duration */}
            <Card className={`border ${isDarkMode ? "bg-slate-700/30 border-slate-600/50" : "bg-slate-50/50 border-slate-200/50"}`}>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Moon className="w-5 h-5 text-purple-500" />
                    <div>
                      <div className={`font-medium ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                        Smart Snoozing
                      </div>
                      <div className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                        Control how often notifications repeat for the same alert
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.snooze_enabled}
                    onCheckedChange={(checked) => updatePreferences({ snooze_enabled: checked })}
                  />
                </div>
                
                {preferences.snooze_enabled && (
                  <div className="pt-2 space-y-3">
                    <div>
                      <label className={`text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                        Repeat Interval
                      </label>
                      <div className="mt-1">
                        <Slider
                          value={[preferences.snooze_duration]}
                          onValueChange={([value]) => updatePreferences({ snooze_duration: value })}
                          max={48}
                          min={1}
                          step={1}
                          className="w-full"
                        />
                        <div className={`text-xs mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                          {preferences.snooze_duration} hours between repeat notifications
                        </div>
                      </div>
                    </div>
                    <div className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-400"} pl-0`}>
                      💤 When an alert condition persists, you'll receive repeat notifications every {preferences.snooze_duration} hours until the issue is resolved.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Batch Portfolio Alerts */}
            <Card className={`border ${isDarkMode ? "bg-slate-700/30 border-slate-600/50" : "bg-slate-50/50 border-slate-200/50"}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-orange-500" />
                    <div>
                      <div className={`font-medium ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                        Smart Batching
                      </div>
                      <div className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                        Group portfolio alerts to reduce noise
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.batch_portfolio_alerts}
                    onCheckedChange={(checked) => updatePreferences({ batch_portfolio_alerts: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Rate Limiting */}
            <Card className={`border ${isDarkMode ? "bg-slate-700/30 border-slate-600/50" : "bg-slate-50/50 border-slate-200/50"}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-cyan-500" />
                  <div>
                    <div className={`font-medium ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                      Notification Limit
                    </div>
                    <div className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                      Maximum alerts per hour
                    </div>
                  </div>
                </div>
                <div>
                  <Slider
                    value={[preferences.max_notifications_per_hour]}
                    onValueChange={([value]) => updatePreferences({ max_notifications_per_hour: value })}
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className={`text-xs mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                    {preferences.max_notifications_per_hour} notifications/hour
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Portfolio Size Auto-Detection */}
            <Card className={`border ${isDarkMode ? "bg-slate-700/30 border-slate-600/50" : "bg-slate-50/50 border-slate-200/50"}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-emerald-500" />
                  <div>
                    <div className={`font-medium ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                      Large Portfolio Protection
                      <Badge variant="secondary" className="ml-2 text-xs">Auto</Badge>
                    </div>
                    <div className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                      Automatically batch alerts for 20+ coins
                    </div>
                  </div>
                </div>
                <div className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-400"} pl-8`}>
                  🔮 When you have many alerts, we'll intelligently group them into portfolio summaries like "Portfolio Alert: 15 coins triggered (3 critical events, 8 price drops, 4 health issues)" instead of sending 15 individual notifications.
                </div>
              </CardContent>
            </Card>

            {/* Emergency Mode */}
            <Card className={`border ${isDarkMode ? "bg-slate-700/30 border-slate-600/50" : "bg-slate-50/50 border-slate-200/50"}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <div>
                    <div className={`font-medium ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                      Market Crash Protection
                      <Badge variant="secondary" className="ml-2 text-xs">Smart</Badge>
                    </div>
                    <div className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                      Enhanced filtering during market-wide events
                    </div>
                  </div>
                </div>
                <div className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-400"} pl-8`}>
                  📉 During major market events (50+ coins triggering alerts), only critical migration/delisting alerts are sent immediately. Other alerts are batched into a single market summary.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 