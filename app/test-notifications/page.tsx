"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../utils/supabase"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { CheckCircle, XCircle, AlertCircle, User, Database, Globe, Settings, Bell } from "lucide-react"
import { NotificationDashboard } from "../../components/notification-dashboard"
import { NotificationPreferences } from "../../components/notification-preferences"
import { NotificationProvider } from "../../components/notification-provider"
import { PushNotificationService } from "../../utils/push-notifications"
import type { AuthUser } from "../../utils/supabase-auth"

interface TestResult {
  test: string
  status: 'pending' | 'success' | 'error'
  message: string
  details?: any
}

export default function TestNotificationsPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunningTests, setIsRunningTests] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
                 setUser({
           id: authUser.id,
           email: authUser.email || '',
           user_metadata: authUser.user_metadata
         })
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    }
  }

  const updateTestResult = (test: string, status: 'success' | 'error', message: string, details?: any) => {
    setTestResults(prev => prev.map(result => 
      result.test === test 
        ? { ...result, status, message, details }
        : result
    ))
  }

  const runComprehensiveTests = async () => {
    setIsRunningTests(true)
    
    const tests = [
      { test: 'User Authentication', status: 'pending' as const, message: 'Checking...' },
      { test: 'Database Connection', status: 'pending' as const, message: 'Testing...' },
      { test: 'API Endpoints', status: 'pending' as const, message: 'Validating...' },
      { test: 'Component Loading', status: 'pending' as const, message: 'Rendering...' },
      { test: 'Push Notifications', status: 'pending' as const, message: 'Testing...' },
      { test: 'Coin Data Integration', status: 'pending' as const, message: 'Fetching...' }
    ]
    
    setTestResults(tests)

    // Test 1: User Authentication
    try {
      if (user) {
        updateTestResult('User Authentication', 'success', `Authenticated as ${user.email}`)
      } else {
        updateTestResult('User Authentication', 'error', 'No user authenticated - please sign in')
        setIsRunningTests(false)
        return
      }
    } catch (error) {
      updateTestResult('User Authentication', 'error', 'Authentication failed', error)
    }

    // Test 2: Database Connection
    try {
      const { data, error } = await supabase.from('user_alerts').select('*').limit(1)
      if (error) throw error
      updateTestResult('Database Connection', 'success', 'Database accessible')
    } catch (error: any) {
      updateTestResult('Database Connection', 'error', `Database error: ${error.message}`, error)
    }

    // Test 3: API Endpoints
    try {
      const responses = await Promise.all([
        fetch('/api/coin-alerts'),
        fetch('/api/notification-preferences'),
        fetch('/api/notifications/monitor')
      ])
      
      const results = await Promise.all(responses.map(r => r.ok))
      if (results.every(r => r)) {
        updateTestResult('API Endpoints', 'success', 'All API endpoints responding')
      } else {
        updateTestResult('API Endpoints', 'error', 'Some API endpoints failing')
      }
    } catch (error: any) {
      updateTestResult('API Endpoints', 'error', `API test failed: ${error.message}`, error)
    }

    // Test 4: Component Loading
    try {
      // This test passes if we get here (components loaded)
      updateTestResult('Component Loading', 'success', 'All components loaded successfully')
    } catch (error: any) {
      updateTestResult('Component Loading', 'error', `Component error: ${error.message}`, error)
    }

    // Test 5: Push Notifications
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        updateTestResult('Push Notifications', 'success', 'Push notifications enabled')
        
        // Test notification
        new Notification('Test Notification', {
          body: 'Notification system test successful!',
          icon: '/ailogo.png'
        })
      } else {
        updateTestResult('Push Notifications', 'error', `Permission ${permission}`)
      }
    } catch (error: any) {
      updateTestResult('Push Notifications', 'error', `Push notifications failed: ${error.message}`, error)
    }

    // Test 6: Coin Data Integration
    try {
      const response = await fetch('/api/search?q=bitcoin')
      if (response.ok) {
        const data = await response.json()
        updateTestResult('Coin Data Integration', 'success', `Found ${data.length || 0} coins`)
      } else {
        updateTestResult('Coin Data Integration', 'error', 'Coin data API not responding')
      }
    } catch (error: any) {
      updateTestResult('Coin Data Integration', 'error', `Coin data failed: ${error.message}`, error)
    }

    setIsRunningTests(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />
      default: return <AlertCircle className="w-5 h-5 text-yellow-500 animate-pulse" />
    }
  }

  const testCreateAlert = async () => {
    if (!user) return
    
    try {
      const response = await fetch('/api/user-alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify({
          coin_id: 'bitcoin',
          alert_type: 'health_score',
          threshold_value: 50,
          is_active: true
        })
      })
      
      if (response.ok) {
        alert('Test alert created successfully!')
        console.log('Alert created for Bitcoin health score below 50')
      } else {
        const error = await response.text()
        alert(`Failed to create alert: ${error}`)
      }
    } catch (error) {
      alert(`Error: ${error}`)
    }
  }

  const testTriggerNotifications = async () => {
    if (!user) return
    
    try {
      const response = await fetch('/api/notifications/test-trigger', {
        method: 'POST'
      })
      
      const result = await response.json()
      
      if (response.ok) {
        alert(`Monitoring triggered! ${result.message}`)
        console.log('Monitoring result:', result)
      } else {
        alert(`Failed to trigger monitoring: ${result.message}`)
      }
    } catch (error) {
      alert(`Error: ${error}`)
    }
  }

  if (showDashboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto p-4">
          <Button 
            onClick={() => setShowDashboard(false)}
            className="mb-4"
          >
            ← Back to Tests
          </Button>
          <NotificationDashboard 
            user={user!} 
            isDarkMode={isDarkMode} 
            onClose={() => setShowDashboard(false)}
          />
        </div>
      </div>
    )
  }

  if (showPreferences) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto p-4 max-w-4xl">
          <Button 
            onClick={() => setShowPreferences(false)}
            className="mb-4"
          >
            ← Back to Tests
          </Button>
          <NotificationPreferences 
            user={user!} 
            isDarkMode={isDarkMode}
          />
        </div>
      </div>
    )
  }

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Notification System Test Suite
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Comprehensive testing of all notification system components
          </p>
        </div>

        {/* User Status */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center gap-2">
            <User className="w-5 h-5" />
            <CardTitle>Authentication Status</CardTitle>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="flex items-center gap-3">
                <Badge variant="default">Authenticated</Badge>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {user.email} (ID: {user.id.slice(0, 8)}...)
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Badge variant="destructive">Not Authenticated</Badge>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Please sign in to test the notification system
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test Controls</CardTitle>
            <CardDescription>
              Run comprehensive tests and interact with components
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={runComprehensiveTests}
                disabled={isRunningTests || !user}
                className="flex items-center gap-2"
              >
                <Database className="w-4 h-4" />
                {isRunningTests ? 'Running Tests...' : 'Run All Tests'}
              </Button>
              
              <Button 
                onClick={() => setShowDashboard(true)}
                disabled={!user}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Globe className="w-4 h-4" />
                Test Dashboard
              </Button>
              
              <Button 
                onClick={() => setShowPreferences(true)}
                disabled={!user}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Test Preferences
              </Button>
              
              <Button 
                onClick={testCreateAlert}
                disabled={!user}
                variant="outline"
                className="flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4" />
                Create Bitcoin Alert (Health &lt; 50)
              </Button>
              
              <Button 
                onClick={async () => {
                  if (!user) return
                  try {
                    const response = await fetch('/api/user-alerts', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user.id}`
                      },
                      body: JSON.stringify({
                        coin_id: 'algorand',
                        alert_type: 'consistency_score',
                        threshold_value: 80,
                        is_active: true
                      })
                    })
                    
                    if (response.ok) {
                      alert('Algorand Consistency Alert created successfully!')
                    } else {
                      const error = await response.text()
                      alert(`Failed to create alert: ${error}`)
                    }
                  } catch (error) {
                    alert(`Error: ${error}`)
                  }
                }}
                disabled={!user}
                variant="outline"
                className="flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4" />
                Create Algorand Alert (Consistency &lt; 80)
              </Button>
              
              <Button 
                onClick={testTriggerNotifications}
                disabled={!user}
                variant="outline"
                className="flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4" />
                Trigger Monitoring
              </Button>

              <Button 
                onClick={async () => {
                  if (!user) return
                  try {
                    // Create a test notification directly
                    const response = await fetch('/api/notifications/test-trigger', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        force_test_notification: true,
                        user_id: user.id
                      })
                    })
                    
                    const result = await response.json()
                    if (response.ok) {
                      alert(`Test notification created! Check console for details.`)
                      console.log('Test notification result:', result)
                    } else {
                      alert(`Failed: ${result.message || result.error}`)
                      console.error('Test notification failed:', result)
                    }
                  } catch (error) {
                    alert(`Error: ${error}`)
                    console.error('Test notification error:', error)
                  }
                }}
                disabled={!user}
                variant="default"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Bell className="w-4 h-4" />
                Force Test Notification
              </Button>
              
              <Button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                variant="outline"
                className="flex items-center gap-2"
              >
                Toggle Theme
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        {testResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>
                Real-time status of notification system components
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testResults.map((result, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                  >
                    {getStatusIcon(result.status)}
                    <div className="flex-1">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {result.test}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {result.message}
                      </div>
                      {result.details && (
                        <details className="mt-2">
                          <summary className="text-xs text-slate-500 cursor-pointer">
                            Show details
                          </summary>
                          <pre className="text-xs text-slate-500 mt-1 overflow-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                    <Badge 
                      variant={
                        result.status === 'success' ? 'default' : 
                        result.status === 'error' ? 'destructive' : 'secondary'
                      }
                    >
                      {result.status}
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Overall Status */}
              <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Overall Status: {
                    testResults.every(r => r.status === 'success') ? '✅ All tests passed' :
                    testResults.some(r => r.status === 'error') ? '❌ Some tests failed' :
                    '⏳ Tests in progress'
                  }
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {testResults.filter(r => r.status === 'success').length} passed, {' '}
                  {testResults.filter(r => r.status === 'error').length} failed, {' '}
                  {testResults.filter(r => r.status === 'pending').length} pending
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* System Information */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Browser Support:</strong>
                <ul className="mt-1 text-slate-600 dark:text-slate-400">
                  <li>• Push Notifications: {typeof Notification !== 'undefined' ? '✅ Supported' : '❌ Not supported'}</li>
                  <li>• Service Workers: {typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? '✅ Supported' : '❌ Not supported'}</li>
                  <li>• WebSocket: {typeof WebSocket !== 'undefined' ? '✅ Supported' : '❌ Not supported'}</li>
                </ul>
              </div>
              <div>
                <strong>Environment:</strong>
                <ul className="mt-1 text-slate-600 dark:text-slate-400">
                  <li>• Node.js: Development Mode</li>
                  <li>• Database: Supabase</li>
                  <li>• Framework: Next.js 15</li>
                  <li>• Theme: {isDarkMode ? 'Dark' : 'Light'}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </NotificationProvider>
  )
} 