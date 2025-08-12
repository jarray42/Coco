import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/utils/supabase'
import { getHealthScore } from '@/utils/beat-calculator'
import { getCoinByIdFromBunny } from '@/actions/fetch-coins-from-bunny'

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

export async function POST(request: NextRequest) {
  try {
    // For development, allow test-key; for production, require proper auth
    const authHeader = request.headers.get('authorization')
    const expectedAuth = process.env.NOTIFICATION_SERVICE_KEY || 'test-key'
    
    if (authHeader !== `Bearer ${expectedAuth}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔔 Starting notification monitoring cycle...')

    // Get all active alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('user_alerts')
      .select('*')
      .eq('is_active', true)

    if (alertsError) {
      console.error('Error fetching alerts:', alertsError)
      return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
    }

    if (!alerts?.length) {
      console.log('📭 No active alerts found')
      return NextResponse.json({ message: 'No active alerts to process' })
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

    // Process coins in batches to avoid overwhelming external APIs
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

      // Small delay between batches to be API-friendly
      if (i + BATCH_SIZE < coinIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    console.log(`📨 Found ${notifications.length} notifications to send`)

    // Send notifications with anti-spam filtering
    const sentNotifications = await sendNotifications(notifications)

    console.log(`✅ Successfully sent ${sentNotifications.length} notifications`)

    return NextResponse.json({
      message: 'Notification monitoring completed',
      alertsProcessed: alerts.length,
      notificationsTriggered: notifications.length,
      notificationsSent: sentNotifications.length,
      details: notifications.map(n => ({ coin: n.coinSymbol, type: n.alertType, message: n.message }))
    })
  } catch (error) {
    console.error('Error in notification monitoring:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
      const { data: recentNotification } = await supabase
        .from('notification_log')
        .select('sent_at')
        .eq('user_id', alert.user_id)
        .eq('coin_id', alert.coin_id)
        .eq('alert_type', alert.alert_type)
        .gte('sent_at', new Date(Date.now() - cooldownPeriod).toISOString())
        .single()

      if (recentNotification) {
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
        // Could check verified alerts from your egg system
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
        quiet_start: 22,
        quiet_end: 8,
        critical_only: false,
        important_and_critical: true,
        all_notifications: false,
        batch_portfolio_alerts: true,
        max_notifications_per_hour: 3
      }

      // Check if notification should be sent based on preferences
      if (!shouldSendNotification(notification, userPrefs)) {
        console.log(`🚫 Notification blocked by user preferences for ${notification.coinSymbol}`)
        continue
      }

      // Check quiet hours
      if (isInQuietHours(userPrefs)) {
        // Only send critical notifications during quiet hours
        if (!['migration', 'delisting'].includes(notification.alertType)) {
          console.log(`🌙 Notification delayed: quiet hours active for ${notification.coinSymbol}`)
          continue
        }
      }

      // Queue notification for browser delivery
      const { error: queueError } = await supabase
        .from('notification_log')
        .insert({
          user_id: notification.userId,
          coin_id: notification.coinId,
          alert_type: notification.alertType,
          message: notification.message,
          delivery_status: 'pending_browser',
          delivery_data: {
            title: `${notification.coinSymbol} Alert`,
            body: notification.message,
            icon: '/ailogo.png',
            data: {
              coinId: notification.coinId,
              alertType: notification.alertType,
              url: `/coin/${notification.coinId}`
            }
          },
          sent_at: new Date().toISOString()
        })

      if (queueError) {
        console.error('Error queuing notification:', queueError)
        continue
      }

      // Try to save to notification log for anti-spam tracking
      try {
        await supabase
          .from('notification_log')
          .insert({
            user_id: notification.userId,
            coin_id: notification.coinId,
            alert_type: notification.alertType,
            message: notification.message,
            sent_at: new Date().toISOString(),
            delivery_status: 'queued'
          })
      } catch (error) {
        // If notification_log table doesn't exist, that's okay
        console.log('📝 Notification log table not available, skipping log entry')
      }

      console.log(`✅ Notification queued for browser delivery: ${notification.coinSymbol}`)
      sentNotifications.push(notification)
    } catch (error) {
      console.error('Error sending notification:', error)
    }
  }

  return sentNotifications
}

// Check if notification should be sent based on user preferences
function shouldSendNotification(notification: NotificationPayload, preferences: any): boolean {
  const { alertType } = notification

  if (preferences.critical_only) {
    return ['migration', 'delisting'].includes(alertType)
  }

  if (preferences.important_and_critical) {
    return ['migration', 'delisting', 'health_score', 'price_drop'].includes(alertType)
  }

  if (preferences.all_notifications) {
    return true
  }

  // Default to important + critical
  return ['migration', 'delisting', 'health_score', 'price_drop', 'consistency_score'].includes(alertType)
}

function isInQuietHours(preferences: any): boolean {
  if (!preferences.quiet_hours_enabled) return false

  const now = new Date()
  const currentHour = now.getHours()
  const { quiet_start, quiet_end } = preferences

  if (quiet_start < quiet_end) {
    return currentHour >= quiet_start && currentHour < quiet_end
  } else {
    return currentHour >= quiet_start || currentHour < quiet_end
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    // Get user's active alerts
    const { data: alerts, error } = await supabase
      .from('user_alerts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'User alert status',
      userId,
      activeAlerts: alerts?.length || 0,
      alerts: alerts || []
    })
  } catch (error) {
    console.error('Error in monitor GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 