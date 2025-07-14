"use client"

import { useState, useEffect } from "react"
import { Bell, AlertCircle, CheckCircle, XCircle, Loader2, Play, Database, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useUser } from "@/hooks/use-user"

interface DebugData {
  user_id: string
  alerts: {
    count: number
    data: any[]
    error?: string
  }
  notifications: {
    count: number
    recent: any[]
    error?: string
  }
  preferences: {
    data: any
    error?: string
  }
  coin_checks: any[]
  debug_info: {
    timestamp: string
    tables_accessible: {
      user_alerts: boolean
      notification_log: boolean
      notification_preferences: boolean
    }
  }
}

export default function DebugNotificationsPage() {
  const { user, loading: userLoading } = useUser()
  const [debugData, setDebugData] = useState<DebugData | null>(null)
  const [loading, setLoading] = useState(false)
  const [testResults, setTestResults] = useState<any[]>([])

  const loadDebugData = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      const response = await fetch(`/api/notifications/debug?user_id=${user.id}`)
      const data = await response.json()
      
      if (response.ok) {
        setDebugData(data)
      } else {
        console.error('Debug data failed:', data)
      }
    } catch (error) {
      console.error('Error loading debug data:', error)
    } finally {
      setLoading(false)
    }
  }

  const runTest = async (testType: string, testName: string) => {
    if (!user?.id) return

    const newResult = {
      id: Date.now(),
      test: testName,
      status: 'running',
      timestamp: new Date().toISOString(),
      result: null
    }
    setTestResults(prev => [newResult, ...prev])

    try {
      let response
      
      switch (testType) {
        case 'test_notification':
          response = await fetch('/api/notifications/debug', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'create_test_notification',
              user_id: user.id
            })
          })
          break

        case 'trigger_monitoring':
          response = await fetch('/api/notifications/debug', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'trigger_monitoring',
              user_id: user.id
            })
          })
          break

        case 'test_trigger_direct':
          response = await fetch('/api/notifications/test-trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              force_test_notification: true,
              user_id: user.id
            })
          })
          break

        default:
          throw new Error(`Unknown test type: ${testType}`)
      }

      const result = await response.json()
      
      setTestResults(prev => prev.map(r => 
        r.id === newResult.id ? {
          ...r,
          status: response.ok ? 'success' : 'error',
          result
        } : r
      ))

      // Reload debug data after test
      await loadDebugData()

    } catch (error) {
      setTestResults(prev => prev.map(r => 
        r.id === newResult.id ? {
          ...r,
          status: 'error',
          result: { error: error instanceof Error ? error.message : 'Unknown error' }
        } : r
      ))
    }
  }

  useEffect(() => {
    if (user?.id && !loading) {
      loadDebugData()
    }
  }, [user?.id])

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold text-white mb-2">Authentication Required</h2>
            <p className="text-slate-300">Please sign in to access the notification debug page.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white">
              <Bell className="w-6 h-6" />
              Notification System Debug Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button 
                onClick={loadDebugData} 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Database className="w-4 h-4 mr-2" />}
                Refresh Debug Data
              </Button>
              
              <Button 
                onClick={() => runTest('test_notification', 'Create Test Notification')}
                className="bg-green-600 hover:bg-green-700"
              >
                <Zap className="w-4 h-4 mr-2" />
                Test Notification
              </Button>

              <Button 
                onClick={() => runTest('trigger_monitoring', 'Trigger Monitoring')}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Play className="w-4 h-4 mr-2" />
                Trigger Monitoring
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Debug Data */}
        {debugData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Database Status */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Database Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(debugData.debug_info.tables_accessible).map(([table, accessible]) => (
                    <div key={table} className="flex items-center justify-between">
                      <span className="text-slate-300">{table}</span>
                      <Badge variant={accessible ? "default" : "destructive"}>
                        {accessible ? (
                          <><CheckCircle className="w-3 h-3 mr-1" /> Accessible</>
                        ) : (
                          <><XCircle className="w-3 h-3 mr-1" /> Error</>
                        )}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Alerts Summary */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Active Alerts ({debugData.alerts.count})</CardTitle>
              </CardHeader>
              <CardContent>
                {debugData.alerts.error ? (
                  <div className="text-red-400">{debugData.alerts.error}</div>
                ) : (
                  <div className="space-y-2">
                    {debugData.alerts.data.map((alert, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                        <div>
                          <div className="text-sm font-medium text-white">{alert.coin_id}</div>
                          <div className="text-xs text-slate-400">{alert.alert_type}</div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {alert.threshold_value ? `< ${alert.threshold_value}` : 'Event'}
                        </Badge>
                      </div>
                    ))}
                    {debugData.alerts.count === 0 && (
                      <div className="text-slate-400 text-center py-4">No active alerts</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Notifications */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Recent Notifications ({debugData.notifications.count})</CardTitle>
              </CardHeader>
              <CardContent>
                {debugData.notifications.error ? (
                  <div className="text-red-400">{debugData.notifications.error}</div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {debugData.notifications.recent.map((notification, index) => (
                      <div key={index} className="p-2 bg-slate-700/50 rounded">
                        <div className="text-sm font-medium text-white">{notification.coin_id}</div>
                        <div className="text-xs text-slate-400">{notification.message}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {new Date(notification.sent_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                    {debugData.notifications.count === 0 && (
                      <div className="text-slate-400 text-center py-4">No recent notifications</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Alert Checks */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Alert Status Checks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {debugData.coin_checks.map((check, index) => (
                    <div key={index} className={`p-2 rounded border ${
                      check.would_trigger 
                        ? 'bg-red-900/20 border-red-500/50' 
                        : 'bg-green-900/20 border-green-500/50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-white">
                            {check.coin_data.symbol} - {check.alert_type}
                          </div>
                          <div className="text-xs text-slate-400">
                            Current: {check.coin_data[`current_${check.alert_type}`] || 'N/A'} | 
                            Threshold: {check.threshold}
                          </div>
                        </div>
                        <Badge variant={check.would_trigger ? "destructive" : "default"}>
                          {check.would_trigger ? 'WOULD TRIGGER' : 'OK'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {debugData.coin_checks.length === 0 && (
                    <div className="text-slate-400 text-center py-4">No alerts to check</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Test Results */}
        {testResults.length > 0 && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {testResults.map((result) => (
                  <div key={result.id} className="p-3 bg-slate-700/50 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-white">{result.test}</div>
                      <div className="flex items-center gap-2">
                        {result.status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
                        {result.status === 'success' && <CheckCircle className="w-4 h-4 text-green-400" />}
                        {result.status === 'error' && <XCircle className="w-4 h-4 text-red-400" />}
                        <span className="text-xs text-slate-400">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    {result.result && (
                      <pre className="text-xs text-slate-300 bg-slate-900/50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(result.result, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Debug Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-300">
            <div className="space-y-2 text-sm">
              <p><strong>1. Create Test Notification:</strong> Creates a test notification directly in the database</p>
              <p><strong>2. Trigger Monitoring:</strong> Manually runs the notification monitoring system</p>
              <p><strong>3. Check Browser Console:</strong> Look for notification logs and errors</p>
              <p><strong>4. Alert Status:</strong> Red alerts would trigger, green alerts are OK</p>
              <p><strong>5. Database Status:</strong> All tables should be accessible</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 