import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/utils/supabase'
import { getHealthScore } from '@/utils/beat-calculator'
import { getCoinByIdFromBunny } from '@/actions/fetch-coins-from-bunny'
import { sendNotificationEmail } from '@/utils/email-service'

// Force dynamic rendering - prevent static analysis during build
export const dynamic = 'force-dynamic'


// Anti-spam configuration
const NOTIFICATION_COOLDOWNS = {
  health_score: 4 * 60 * 60 * 1000,     // 4 hours
  consistency_score: 4 * 60 * 60 * 1000, // 4 hours  
  price_drop: 30 * 60 * 1000,            // 30 minutes
  migration: 24 * 60 * 60 * 1000,        // 24 hours
  delisting: 24 * 60 * 60 * 1000         // 24 hours
}

interface NotificationPayload {
  userId: string
  coinId: string
  coinName: string
  coinSymbol: string
  alertType: string
  currentValue: number
  thresholdValue: number
  message: string
}

// Test endpoint to manually trigger notification monitoring
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    
    // Check if this is a force test notification request
    if (body.force_test_notification && body.user_id) {
      console.log('🧪 Force test notification triggered for user:', body.user_id)
      
      const testResult = await createTestNotification(body.user_id)
      
      console.log('✅ Test notification created:', testResult)
      return NextResponse.json({
        success: true,
        message: 'Test notification created successfully',
        result: testResult
      })
    }

    console.log('🧪 Manual notification monitoring triggered')

    // Run the monitoring logic directly
    const result = await runNotificationMonitoring()

    console.log('✅ Test monitoring completed:', result)
    return NextResponse.json({
      success: true,
      message: 'Notification monitoring triggered successfully',
      result
    })

  } catch (error) {
    console.error('❌ Error in test trigger:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to trigger notification monitoring',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function createTestNotification(userId: string) {
  try {
    console.log('🧪 Creating test notification for user:', userId)
    
    // Insert a test notification directly into the database
    const { data, error } = await supabase
      .from('notification_log')
      .insert({
        user_id: userId,
        coin_id: 'bitcoin',
        alert_type: 'health_score',
        message: '🧪 TEST: Bitcoin health score test notification',
        delivery_status: 'sent',
        sent_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating test notification:', error)
      throw new Error(`Failed to create test notification: ${error.message}`)
    }

    console.log('✅ Test notification created successfully:', data)
    return {
      message: 'Test notification created',
      notification: data,
      instructions: 'Check the /notifications page or browser console for the notification'
    }
    
  } catch (error) {
    console.error('Error in createTestNotification:', error)
    throw error
  }
}

async function runNotificationMonitoring() {
  console.log('🔔 Starting notification monitoring cycle...')

  // Get all active alerts
  const { data: alerts, error: alertsError } = await supabase
    .from('user_alerts')
    .select('*')
    .eq('is_active', true)

  if (alertsError) {
    console.error('Error fetching alerts:', alertsError)
    throw new Error(`Failed to fetch alerts: ${alertsError.message}`)
  }

  if (!alerts?.length) {
    console.log('📭 No active alerts found')
    return { message: 'No active alerts to process', alertsProcessed: 0, notificationsTriggered: 0, notificationsSent: 0 }
  }

  console.log(`📊 Processing ${alerts.length} active alerts...`)

  // Group alerts by coin to minimize API calls
  const alertsByCoin = alerts.reduce((acc, alert) => {
    if (!acc[alert.coin_id]) {
      acc[alert.coin_id] = []
    }
    acc[alert.coin_id].push(alert)
    return acc
  }, {} as Record<string, any[]>)

  const notifications: NotificationPayload[] = []
  const coinIds = Object.keys(alertsByCoin)

  // Process coins in batches
  const BATCH_SIZE = 20
  for (let i = 0; i < coinIds.length; i += BATCH_SIZE) {
    const batch = coinIds.slice(i, i + BATCH_SIZE)
    
    console.log(`🔍 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(coinIds.length/BATCH_SIZE)}`)

    for (const coinId of batch) {
      try {
        // Fetch current coin data
        const coinData = await fetchCoinData(coinId)
        if (!coinData) {
          console.log(`⚠️ No coin data found for ${coinId}`)
          continue
        }

        console.log(`📊 Processing ${coinData.symbol}: Health=${coinData.current_health_score}, Consistency=${coinData.current_consistency_score}`)

        const coinAlerts = alertsByCoin[coinId]

        for (const alert of coinAlerts) {
          const notification = await checkAlert(alert, coinData)
          if (notification) {
            console.log(`🚨 Alert triggered: ${notification.message}`)
            notifications.push(notification)
          }
        }
      } catch (error) {
        console.error(`Error processing coin ${coinId}:`, error)
      }
    }

    // Small delay between batches
    if (i + BATCH_SIZE < coinIds.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  console.log(`📨 Found ${notifications.length} notifications to send`)

  // Send notifications
  const sentNotifications = await sendNotifications(notifications)

  console.log(`✅ Successfully sent ${sentNotifications.length} notifications`)

  return {
    message: 'Notification monitoring completed',
    alertsProcessed: alerts.length,
    notificationsTriggered: notifications.length,
    notificationsSent: sentNotifications.length,
    details: notifications.map(n => ({ coin: n.coinSymbol, type: n.alertType, message: n.message }))
  }
}

async function fetchCoinData(coinId: string) {
  try {
    // Fetch from Bunny CDN with pre-calculated scores
    const coinData = await getCoinByIdFromBunny(coinId)

    if (!coinData) {
      console.log(`⚠️ Coin data not found for ${coinId} in Bunny CDN`)
      return null
    }

    // Use pre-calculated scores from Bunny CDN
    const healthScore = getHealthScore(coinData)
    const consistencyScore = coinData.consistency_score || 50

    return {
      ...coinData,
      current_health_score: healthScore,
      current_consistency_score: consistencyScore
    }
  } catch (error) {
    console.error(`Error fetching coin data for ${coinId}:`, error)
    return null
  }
}

async function checkAlert(alert: any, coinData: any): Promise<NotificationPayload | null> {
  try {
    // Check if notification was sent recently (anti-spam)
    const cooldownPeriod = NOTIFICATION_COOLDOWNS[alert.alert_type as keyof typeof NOTIFICATION_COOLDOWNS] || 60 * 60 * 1000
    
         // Try to check notification log, but don't fail if table doesn't exist
     try {
       const { data: recentNotifications } = await supabase
         .from('notification_log')
         .select('sent_at')
         .eq('user_id', alert.user_id)
         .eq('coin_id', alert.coin_id)
         .eq('alert_type', alert.alert_type)
         .gte('sent_at', new Date(Date.now() - cooldownPeriod).toISOString())

       if (recentNotifications && recentNotifications.length > 0) {
         console.log(`🚫 Skipping notification for ${alert.coin_id} - cooldown active`)
         return null
       }
     } catch (error) {
       // If notification_log table doesn't exist, continue without cooldown check
       console.log(`📝 Notification log not available, skipping cooldown check`)
     }

    let currentValue: number = 0
    let shouldNotify = false
    let message = ''

    switch (alert.alert_type) {
      case 'health_score':
        currentValue = coinData.current_health_score
        shouldNotify = currentValue < alert.threshold_value
        message = `${coinData.symbol} health score dropped to ${currentValue} (below ${alert.threshold_value})`
        console.log(`🔍 Health check: ${coinData.symbol} = ${currentValue} vs threshold ${alert.threshold_value} → ${shouldNotify ? 'TRIGGER' : 'OK'}`)
        break

      case 'consistency_score':
        currentValue = coinData.current_consistency_score
        shouldNotify = currentValue < alert.threshold_value
        message = `${coinData.symbol} consistency score dropped to ${currentValue} (below ${alert.threshold_value})`
        console.log(`🔍 Consistency check: ${coinData.symbol} = ${currentValue} vs threshold ${alert.threshold_value} → ${shouldNotify ? 'TRIGGER' : 'OK'}`)
        break

      case 'price_drop':
        const priceChange = coinData.price_change_24h || 0
        currentValue = Math.abs(priceChange)
        shouldNotify = priceChange < 0 && currentValue > alert.threshold_value
        message = `${coinData.symbol} price dropped ${currentValue.toFixed(2)}% (alert set for >${alert.threshold_value}%)`
        console.log(`🔍 Price drop check: ${coinData.symbol} = ${priceChange}% vs threshold ${alert.threshold_value}% → ${shouldNotify ? 'TRIGGER' : 'OK'}`)
        break

      case 'migration':
      case 'delisting':
        // These would be triggered by external events, not regular monitoring
        const { data: verifiedAlert } = await supabase
          .from('coin_alerts')
          .select('*')
          .eq('coin_id', alert.coin_id)
          .eq('alert_type', alert.alert_type)
          .eq('status', 'verified')
          .single()

        if (verifiedAlert) {
          currentValue = 1
          shouldNotify = true
          message = `${coinData.symbol} ${alert.alert_type} alert verified by community`
          console.log(`🔍 Migration/Delisting check: ${coinData.symbol} verified alert found → TRIGGER`)
        }
        break
    }

    if (shouldNotify) {
      return {
        userId: alert.user_id,
        coinId: alert.coin_id,
        coinName: coinData.name,
        coinSymbol: coinData.symbol,
        alertType: alert.alert_type,
        currentValue,
        thresholdValue: alert.threshold_value,
        message
      }
    }

    return null
  } catch (error) {
    console.error('Error checking alert:', error)
    return null
  }
}

async function sendNotifications(notifications: NotificationPayload[]): Promise<NotificationPayload[]> {
  const sentNotifications: NotificationPayload[] = []

  for (const notification of notifications) {
    try {
      console.log(`📢 Sending notification: ${notification.message}`)

      // Check user's notification preferences
      const { data: preferences } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', notification.userId)
        .single()

      const userPrefs = preferences || {
        browser_push: true,
        email_alerts: false,
        quiet_hours_enabled: false,
        important_and_critical: true,
        all_notifications: false
      }

      // Check if notification should be sent
      if (!shouldSendNotification(notification, userPrefs)) {
        console.log(`🚫 Notification blocked by user preferences for ${notification.coinSymbol}`)
        continue
      }

                   // Queue notification for browser delivery
      const { error: queueError } = await supabase
        .from('notification_log')
        .insert({
          user_id: notification.userId,
          coin_id: notification.coinId,
          alert_type: notification.alertType,
          message: notification.message,
          delivery_status: 'sent',
          sent_at: new Date().toISOString()
        })

      if (queueError) {
        console.error('Error queuing notification:', queueError)
        continue
      }

      // Send email if user has email notifications enabled
      if (userPrefs.email_alerts) {
        console.log(`📧 Sending email notification for ${notification.coinSymbol}`)
        
        // Get user email from Supabase Auth
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(notification.userId)
        
        if (userData?.user?.email) {
          const emailSent = await sendNotificationEmail({
            userEmail: userData.user.email,
            coinSymbol: notification.coinSymbol,
            coinName: notification.coinName,
            alertType: notification.alertType,
            message: notification.message,
            currentValue: notification.currentValue,
            thresholdValue: notification.thresholdValue
          })
          
          if (emailSent) {
            console.log(`✅ Email sent successfully to ${userData.user.email}`)
          } else {
            console.log(`❌ Failed to send email to ${userData.user.email}`)
          }
        } else {
          console.log(`⚠️ No email found for user ${notification.userId}`)
        }
      }

      console.log(`✅ Notification queued for browser delivery: ${notification.coinSymbol}`)
      sentNotifications.push(notification)
    } catch (error) {
      console.error('Error sending notification:', error)
    }
  }

  return sentNotifications
}

function shouldSendNotification(notification: NotificationPayload, preferences: any): boolean {
  const { alertType } = notification

  if (preferences.critical_only) {
    return ['migration', 'delisting'].includes(alertType)
  }

  if (preferences.important_and_critical) {
    return ['migration', 'delisting', 'health_score', 'price_drop', 'consistency_score'].includes(alertType)
  }

  if (preferences.all_notifications) {
    return true
  }

  // Default to important + critical
  return ['migration', 'delisting', 'health_score', 'price_drop', 'consistency_score'].includes(alertType)
}

// GET endpoint for easy browser testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Use POST to trigger notification monitoring',
    endpoints: {
      trigger: 'POST /api/notifications/test-trigger',
      monitor: 'POST /api/notifications/monitor',
      pending: 'GET /api/notifications/pending?user_id=xxx'
    },
    instructions: [
      '1. POST to this endpoint to trigger monitoring',
      '2. Check console logs for monitoring results',
      '3. Check browser for incoming notifications',
      '4. Use browser console: checkNotifications() or notificationStatus()'
    ]
  })
} 