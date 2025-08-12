import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/utils/supabase'
import { getCoinByIdFromBunny } from '@/actions/fetch-coins-from-bunny'
import { getHealthScore } from '@/utils/beat-calculator'

// Force dynamic rendering - prevent static analysis during build
export const dynamic = 'force-dynamic'


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    
    if (!userId) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 })
    }

    // Check user alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('user_alerts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)

    // Check notification_log table
    const { data: notifications, error: notificationsError } = await supabase
      .from('notification_log')
      .select('*')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })
      .limit(10)

    // Check notification preferences
    const { data: preferences, error: preferencesError } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    // For each alert, let's check the current coin data
    const coinChecks = []
    if (alerts) {
      for (const alert of alerts) {
        try {
          // Fetch coin data from Bunny CDN
          const coinData = await getCoinByIdFromBunny(alert.coin_id)

          if (coinData) {
            // Use pre-calculated scores from Bunny CDN
            const healthScore = getHealthScore(coinData)
            const consistencyScore = coinData.consistency_score || 50
            
            coinChecks.push({
              alert_id: alert.id,
              coin_id: alert.coin_id,
              alert_type: alert.alert_type,
              threshold: alert.threshold_value,
              coin_data: {
                symbol: coinData.symbol,
                price: coinData.price,
                price_change_24h: coinData.price_change_24h,
                current_health_score: healthScore,
                current_consistency_score: consistencyScore
              },
              would_trigger: (() => {
                switch (alert.alert_type) {
                  case 'health_score':
                    return healthScore < alert.threshold_value
                  case 'consistency_score':
                    return consistencyScore < alert.threshold_value
                  case 'price_drop':
                    const priceChange = coinData.price_change_24h || 0
                    return priceChange < 0 && Math.abs(priceChange) > alert.threshold_value
                  default:
                    return false
                }
              })()
            })
          }
        } catch (error) {
          console.error(`Error checking coin ${alert.coin_id}:`, error)
        }
      }
    }

    return NextResponse.json({
      user_id: userId,
      alerts: {
        count: alerts?.length || 0,
        data: alerts || [],
        error: alertsError?.message
      },
      notifications: {
        count: notifications?.length || 0,
        recent: notifications || [],
        error: notificationsError?.message
      },
      preferences: {
        data: preferences || null,
        error: preferencesError?.message
      },
      coin_checks: coinChecks,
      debug_info: {
        timestamp: new Date().toISOString(),
        tables_accessible: {
          user_alerts: !alertsError,
          notification_log: !notificationsError,
          notification_preferences: !preferencesError
        }
      }
    })

  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json({
      error: 'Debug endpoint failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, user_id } = await request.json()

    if (!user_id) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 })
    }

    switch (action) {
      case 'create_test_notification':
        // Create a test notification directly
        const { data: testNotification, error: testError } = await supabase
          .from('notification_log')
          .insert({
            user_id,
            coin_id: 'test-coin',
            alert_type: 'health_score',
            message: '🧪 TEST: This is a test notification to verify the system is working',
            delivery_status: 'sent',
            sent_at: new Date().toISOString()
          })
          .select()
          .single()

        if (testError) {
          return NextResponse.json({ error: testError.message }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          message: 'Test notification created',
          notification: testNotification
        })

      case 'trigger_monitoring':
        // Trigger the monitoring system manually
        const monitorResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/notifications/test-trigger`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        })

        const monitorResult = await monitorResponse.json()
        return NextResponse.json({
          success: monitorResponse.ok,
          message: 'Monitoring triggered',
          result: monitorResult
        })

      case 'check_user_status':
        // Check user's notification status, preferences, and recent alerts
        if (!user_id) {
          return NextResponse.json({ error: 'user_id required for status check' }, { status: 400 })
        }

        // Get user's notification preferences
        const { data: userPrefs, error: prefsError } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', user_id)
          .single()

        // Get user's active alerts
        const { data: activeAlerts, error: alertsError } = await supabase
          .from('user_alerts')
          .select('*')
          .eq('user_id', user_id)
          .eq('is_active', true)

        // Get recent notifications (last 24 hours)
        const { data: recentNotifications, error: notifError } = await supabase
          .from('notification_log')
          .select('*')
          .eq('user_id', user_id)
          .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('sent_at', { ascending: false })

        // Get current hour notification count
        const { data: hourlyNotifications, error: hourlyError } = await supabase
          .from('notification_log')
          .select('*')
          .eq('user_id', user_id)
          .gte('sent_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

        return NextResponse.json({
          success: true,
          message: 'User notification status',
          data: {
            user_id,
            preferences: userPrefs || 'No preferences found',
            preferencesError: prefsError?.message,
            activeAlerts: activeAlerts || [],
            alertsCount: activeAlerts?.length || 0,
            alertsError: alertsError?.message,
            recentNotifications: recentNotifications || [],
            recentCount: recentNotifications?.length || 0,
            notificationsError: notifError?.message,
            hourlyNotifications: hourlyNotifications || [],
            hourlyCount: hourlyNotifications?.length || 0,
            hourlyError: hourlyError?.message,
            rateLimit: {
              maxPerHour: userPrefs?.max_notifications_per_hour || 10,
              currentHour: hourlyNotifications?.length || 0,
              remaining: Math.max(0, (userPrefs?.max_notifications_per_hour || 10) - (hourlyNotifications?.length || 0))
            },
            snoozeSettings: {
              enabled: userPrefs?.snooze_enabled || true,
              duration: userPrefs?.snooze_duration || 16,
              durationMs: (userPrefs?.snooze_duration || 16) * 60 * 60 * 1000
            }
          }
        })

      case 'test_preferences':
        // Test saving and loading preferences
        if (!user_id) {
          return NextResponse.json({ error: 'user_id required for preferences test' }, { status: 400 })
        }

        // Load current preferences
        const { data: currentPrefs, error: loadError } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', user_id)
          .single()

        // Test saving new preferences
        const testPrefs = {
          browser_push: true,
          email_alerts: false,
          in_app_only: false,
          notification_style: 'detailed',
          snooze_enabled: true,
          snooze_duration: 1, // Test with 1 hour
          critical_only: false,
          important_and_critical: true,
          all_notifications: false,
          batch_portfolio_alerts: true,
          max_notifications_per_hour: 10,
          sound_enabled: true,
          vibration_enabled: true
        }

        const { data: savedPrefs, error: saveError } = await supabase
          .from('notification_preferences')
          .upsert({
            user_id,
            ...testPrefs,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          })
          .select()
          .single()

        // Verify the save worked
        const { data: verifyPrefs, error: verifyError } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', user_id)
          .single()

        return NextResponse.json({
          success: true,
          message: 'Preferences test completed',
          data: {
            user_id,
            beforeTest: currentPrefs || 'No preferences found',
            loadError: loadError?.message,
            testPreferences: testPrefs,
            saveResult: savedPrefs,
            saveError: saveError?.message,
            afterTest: verifyPrefs,
            verifyError: verifyError?.message,
            snoozeSettingsMatch: verifyPrefs?.snooze_duration === 1,
            rateSettingsMatch: verifyPrefs?.max_notifications_per_hour === 10
          }
        })

      case 'test_save_preferences':
        // Test saving preferences through the API endpoint
        if (!user_id) {
          return NextResponse.json({ error: 'user_id required for save test' }, { status: 400 })
        }

        const testPreferences = {
          browser_push: true,
          email_alerts: false,
          in_app_only: false,
          notification_style: 'detailed',
          snooze_enabled: true,
          snooze_duration: 1, // Test 1 hour snooze
          critical_only: false,
          important_and_critical: true,
          all_notifications: false,
          batch_portfolio_alerts: true,
          max_notifications_per_hour: 10,
          sound_enabled: true,
          vibration_enabled: true
        }

        try {
          // Test saving through the API
          const saveResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/notification-preferences`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${user_id}`
            },
            body: JSON.stringify(testPreferences)
          })

          const saveResult = await saveResponse.json()

          // Test loading through the API
          const loadResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/notification-preferences`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${user_id}`
            }
          })

          const loadResult = await loadResponse.json()

          return NextResponse.json({
            success: true,
            message: 'Preferences save/load test completed',
            data: {
              user_id,
              testPreferences,
              saveResponse: {
                status: saveResponse.status,
                ok: saveResponse.ok,
                result: saveResult
              },
              loadResponse: {
                status: loadResponse.status,
                ok: loadResponse.ok,
                result: loadResult
              },
              verifications: {
                snoozeMatches: loadResult.snooze_duration === 1,
                rateMatches: loadResult.max_notifications_per_hour === 10,
                urgencyMatches: loadResult.important_and_critical === true,
                allFieldsMatch: JSON.stringify(testPreferences) === JSON.stringify({
                  ...loadResult,
                  // Remove database fields for comparison
                  id: undefined,
                  user_id: undefined,
                  created_at: undefined,
                  updated_at: undefined
                }.id || loadResult.id ? Object.fromEntries(Object.entries(loadResult).filter(([k]) => !['id', 'user_id', 'created_at', 'updated_at'].includes(k))) : loadResult)
              }
            }
          })
        } catch (error) {
          return NextResponse.json({
            success: false,
            message: 'Preferences test failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Debug POST error:', error)
    return NextResponse.json({
      error: 'Debug action failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 