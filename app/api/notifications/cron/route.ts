import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/utils/supabase'
import { getHealthScore } from '@/utils/beat-calculator'
import { getCoinByIdFromBunny } from '@/actions/fetch-coins-from-bunny'

// Force dynamic rendering - prevent static analysis during build
export const dynamic = 'force-dynamic'

// Import email service dynamically when needed
async function getEmailService() {
  try {
    const emailModule = await import('@/utils/email-service')
    return emailModule.sendNotificationEmail
  } catch (error) {
    console.log('Email service not available:', error)
    return null
  }
}

// Anti-spam configuration - these are base minimums, user preferences can extend them
const NOTIFICATION_COOLDOWNS = {
  health_score: 1 * 60 * 60 * 1000,       // 1 hour minimum - user snooze can extend
  consistency_score: 1 * 60 * 60 * 1000,  // 1 hour minimum - user snooze can extend  
  price_drop: 2 * 60 * 60 * 1000,         // 2 hours
  migration: 48 * 60 * 60 * 1000,         // 48 hours
  delisting: 48 * 60 * 60 * 1000          // 48 hours
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

// Manual trigger endpoint for testing
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Manual notification monitoring triggered')

    const result = await runNotificationMonitoring()

    console.log('✅ Manual monitoring completed:', result)
    return NextResponse.json({
      success: true,
      message: 'Manual notification monitoring completed',
      timestamp: new Date().toISOString(),
      result
    })

  } catch (error) {
    console.error('❌ Error in manual monitoring:', error)
    return NextResponse.json({
      success: false,
      message: 'Manual monitoring failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Vercel Cron endpoint - runs automatically every 30 minutes
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Automated notification monitoring triggered by Vercel cron')
    
    // Vercel cron calls don't need external authentication
    // The platform handles this internally
    
    console.log('⏰ Automated notification monitoring started via cron')

    const result = await runNotificationMonitoring()

    console.log('✅ Automated monitoring completed:', result)
    return NextResponse.json({
      success: true,
      message: 'Automated notification monitoring completed',
      timestamp: new Date().toISOString(),
      result
    })

  } catch (error) {
    console.error('❌ Error in automated monitoring:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({
      success: false,
      message: 'Automated monitoring failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
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

        console.log(`📊 Processing ${coinData.symbol}: Health=${coinData.current_health_score}, Consistency=${coinData.current_consistency_score}, Price=${coinData.price}, Change24h=${coinData.price_change_24h}%`)

        const coinAlerts = alertsByCoin[coinId]
        console.log(`🔍 Found ${coinAlerts.length} alerts for ${coinData.symbol}:`, coinAlerts.map((alert: any) => `${alert.alert_type}(${alert.threshold_value})`).join(', '))

        for (const alert of coinAlerts) {
          console.log(`⚡ Checking alert: ${coinData.symbol} ${alert.alert_type} with threshold ${alert.threshold_value}`)
          const notification = await checkAlert(alert, coinData)
          if (notification) {
            console.log(`🚨 Alert triggered: ${notification.message}`)
            notifications.push(notification)
          } else {
            console.log(`✅ Alert not triggered for ${coinData.symbol} ${alert.alert_type}`)
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

  // Detect market-wide events for enhanced protection
  const isMarketWideEvent = await detectMarketWideEvent(notifications)
  if (isMarketWideEvent) {
    console.log(`🚨 Market-wide event detected with ${notifications.length} alerts - applying enhanced filtering`)
  }

  // Send notifications
  const sentNotifications = await sendNotifications(notifications, isMarketWideEvent)

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
    // Get user's notification preferences for snooze settings
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('snooze_enabled, snooze_duration')
      .eq('user_id', alert.user_id)
      .single()

    const userPrefs = preferences || { snooze_enabled: true, snooze_duration: 16 }

    // Calculate cooldown period based on user preferences
    let cooldownPeriod = NOTIFICATION_COOLDOWNS[alert.alert_type as keyof typeof NOTIFICATION_COOLDOWNS] || 60 * 60 * 1000
    
    // For health and consistency alerts, use user's snooze settings if enabled
    if (userPrefs.snooze_enabled && ['health_score', 'consistency_score'].includes(alert.alert_type)) {
      const userCooldown = userPrefs.snooze_duration * 60 * 60 * 1000 // convert hours to milliseconds
      cooldownPeriod = userCooldown // Use user preference directly, not max!
    }

    // Debug: Log user preferences and cooldown
    console.log(`[DEBUG] User ${alert.user_id} alert ${alert.alert_type} for coin ${alert.coin_id}`)
    console.log(`[DEBUG] User prefs:`, userPrefs)
    console.log(`[DEBUG] Cooldown period (ms):`, cooldownPeriod)

    // Check if we've sent a notification for this alert recently
    try {
      const cooldownStartTime = new Date(Date.now() - cooldownPeriod)
      const { data: recentNotifications } = await supabase
        .from('notification_log')
        .select('sent_at')
        .eq('user_id', alert.user_id)
        .eq('coin_id', alert.coin_id)
        .eq('alert_type', alert.alert_type)
        .gte('sent_at', cooldownStartTime.toISOString())
        .order('sent_at', { ascending: false })
        .limit(1)

      if (recentNotifications && recentNotifications.length > 0) {
        const lastNotificationTime = new Date(recentNotifications[0].sent_at)
        const timeSinceLastNotification = Date.now() - lastNotificationTime.getTime()
        console.log(`[DEBUG] Last notification sent at:`, lastNotificationTime)
        console.log(`[DEBUG] Time since last notification (ms):`, timeSinceLastNotification)
        console.log(`🚫 Skipping notification for ${alert.coin_id} ${alert.alert_type} - last sent ${Math.round(timeSinceLastNotification / (60 * 60 * 1000))}h ago (snooze: ${cooldownPeriod / (60 * 60 * 1000)}h)`)
        return null
      } else {
        console.log(`[DEBUG] No recent notifications found for ${alert.coin_id} ${alert.alert_type} - can send notification`)
      }
    } catch (error) {
      // If notification_log table doesn't exist, continue without cooldown check
      console.log(`[DEBUG] Could not check notification history for ${alert.coin_id} ${alert.alert_type}:`, error)
    }

    let currentValue: number = 0
    let shouldNotify = false
    let message = ''

    switch (alert.alert_type) {
      case 'health_score':
        currentValue = coinData.current_health_score
        shouldNotify = currentValue < alert.threshold_value
        message = `${coinData.symbol} health score dropped to ${currentValue} (below ${alert.threshold_value})`
        console.log(`[DEBUG] Health check: ${coinData.symbol} = ${currentValue} vs threshold ${alert.threshold_value} → ${shouldNotify ? 'TRIGGER' : 'OK'}`)
        break

      case 'consistency_score':
        currentValue = coinData.current_consistency_score
        shouldNotify = currentValue < alert.threshold_value
        message = `${coinData.symbol} consistency score dropped to ${currentValue} (below ${alert.threshold_value})`
        console.log(`[DEBUG] Consistency check: ${coinData.symbol} = ${currentValue} vs threshold ${alert.threshold_value} → ${shouldNotify ? 'TRIGGER' : 'OK'}`)
        break

      case 'price_drop':
        const priceChange = coinData.price_change_24h || 0
        currentValue = Math.abs(priceChange)
        shouldNotify = priceChange < 0 && currentValue > alert.threshold_value
        message = `${coinData.symbol} price dropped ${currentValue.toFixed(2)}% (alert set for >${alert.threshold_value}%)`
        console.log(`[DEBUG] Price drop check: ${coinData.symbol} = ${priceChange}% vs threshold ${alert.threshold_value}% → ${shouldNotify ? 'TRIGGER' : 'OK'}`)
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
          console.log(`[DEBUG] Migration/Delisting check: ${coinData.symbol} verified alert found → TRIGGER`)
        }
        break
    }

    if (shouldNotify) {
      console.log(`[DEBUG] Notification will be sent for user ${alert.user_id}, coin ${alert.coin_id}, type ${alert.alert_type}`)
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

    console.log(`[DEBUG] No notification needed for user ${alert.user_id}, coin ${alert.coin_id}, type ${alert.alert_type}`)
    return null
  } catch (error) {
    console.error('[DEBUG] Error checking alert:', error)
    return null
  }
}

async function sendNotifications(notifications: NotificationPayload[], isMarketWideEvent: boolean = false): Promise<NotificationPayload[]> {
  const sentNotifications: NotificationPayload[] = []

  // Group notifications by user for rate limiting and batching
  const notificationsByUser = notifications.reduce((acc, notification) => {
    if (!acc[notification.userId]) {
      acc[notification.userId] = []
    }
    acc[notification.userId].push(notification)
    return acc
  }, {} as Record<string, NotificationPayload[]>)

  // Process each user's notifications
  for (const [userId, userNotifications] of Object.entries(notificationsByUser)) {
    try {
      console.log(`📢 Processing ${userNotifications.length} notifications for user ${userId}`)

      // Get user's notification preferences
      const { data: preferences } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      const userPrefs = preferences || {
        browser_push: true,
        email_alerts: false,
        snooze_enabled: true,
        snooze_duration: 16,
        important_and_critical: true,
        all_notifications: false,
        batch_portfolio_alerts: true,
        max_notifications_per_hour: 10 // Increased from 3
      }

      // During market-wide events, apply extra strict filtering
      if (isMarketWideEvent) {
        // Only send critical alerts during market-wide events
        const criticalNotifications = userNotifications.filter(n => 
          ['migration', 'delisting'].includes(n.alertType)
        )
        
        if (criticalNotifications.length === 0) {
          // Create a single market summary notification instead
          const marketSummary = createMarketEventSummary(userId, userNotifications)
          if (marketSummary) {
            userNotifications.splice(0, userNotifications.length, marketSummary)
            console.log(`🌍 Created market summary for user ${userId} covering ${userNotifications.length} alerts`)
          } else {
            console.log(`🚫 Skipping ${userNotifications.length} notifications for user ${userId} - market event protection`)
            continue
          }
        } else {
          // Update to only critical notifications
          userNotifications.splice(0, userNotifications.length, ...criticalNotifications)
          console.log(`🚨 Market event: sending only ${criticalNotifications.length} critical alerts for user ${userId}`)
        }
      }

      // Filter notifications based on user preferences
      const filteredNotifications = userNotifications.filter(notification =>
        shouldSendNotification(notification, userPrefs)
      )

      if (filteredNotifications.length === 0) {
        console.log(`🚫 All notifications blocked by user preferences for user ${userId}`)
        continue
      }

      // Check current hour's notification count for rate limiting
      const hourlyLimit = userPrefs.max_notifications_per_hour || 3
      const currentHourNotifications = await getCurrentHourNotificationCount(userId)
      
      if (currentHourNotifications >= hourlyLimit) {
        console.log(`🛑 Rate limit exceeded for user ${userId}: ${currentHourNotifications}/${hourlyLimit}`)
        
        // Only send highest priority notifications when at limit
        const priorityNotifications = prioritizeNotifications(filteredNotifications, hourlyLimit - currentHourNotifications)
        
        if (priorityNotifications.length === 0) {
          console.log(`📵 No priority notifications to send for user ${userId}`)
          continue
        }
        
        filteredNotifications.splice(0, filteredNotifications.length, ...priorityNotifications)
      }

      // Smart batching for users with many alerts
      let notificationsToSend: NotificationPayload[] = []
      
      if (filteredNotifications.length >= 5 && userPrefs.batch_portfolio_alerts) {
        // Create a portfolio summary notification instead of individual ones
        const batchedNotification = createPortfolioBatchNotification(userId, filteredNotifications)
        notificationsToSend = [batchedNotification]
        console.log(`📦 Batched ${filteredNotifications.length} notifications into portfolio summary for user ${userId}`)
      } else if (filteredNotifications.length > hourlyLimit) {
        // Prioritize and limit individual notifications
        notificationsToSend = prioritizeNotifications(filteredNotifications, hourlyLimit - currentHourNotifications)
        console.log(`🎯 Prioritized ${notificationsToSend.length} of ${filteredNotifications.length} notifications for user ${userId}`)
      } else {
        notificationsToSend = filteredNotifications
      }

      // Send the processed notifications
      for (const notification of notificationsToSend) {
        try {
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
              const sendEmailFn = await getEmailService()
              if (sendEmailFn) {
                const emailSent = await sendEmailFn({
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
                console.log(`⚠️ Email service not available`)
              }
            } else {
              console.log(`⚠️ No email found for user ${notification.userId}`)
            }
          }

          console.log(`✅ Notification queued for browser delivery: ${notification.coinSymbol}`)
          sentNotifications.push(notification)
        } catch (error) {
          console.error('Error sending individual notification:', error)
        }
      }

    } catch (error) {
      console.error(`Error processing notifications for user ${userId}:`, error)
    }
  }

  return sentNotifications
}

// Detect if this is a market-wide event requiring special handling
async function detectMarketWideEvent(notifications: NotificationPayload[]): Promise<boolean> {
  const uniqueCoins = new Set(notifications.map(n => n.coinId)).size
  const priceDropCount = notifications.filter(n => n.alertType === 'price_drop').length
  
  // Market-wide event if:
  // 1. 50+ notifications total, OR
  // 2. 20+ unique coins with price drops, OR  
  // 3. 30+ notifications within 15 minutes
  if (notifications.length >= 50) {
    console.log(`🚨 Market event detected: ${notifications.length} total notifications`)
    return true
  }
  
  if (uniqueCoins >= 20 && priceDropCount >= 20) {
    console.log(`🚨 Market event detected: ${uniqueCoins} coins with ${priceDropCount} price drops`)
    return true
  }
  
  // Check notification velocity (30+ notifications in last 15 minutes)
  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
    const { data: recentNotifications } = await supabase
      .from('notification_log')
      .select('id')
      .gte('sent_at', fifteenMinutesAgo.toISOString())
    
    if ((recentNotifications?.length || 0) >= 30) {
      console.log(`🚨 Market event detected: ${recentNotifications?.length} notifications in last 15 minutes`)
      return true
    }
  } catch (error) {
    console.log('Could not check notification velocity:', error)
  }
  
  return false
}

// Create a market-wide event summary notification
function createMarketEventSummary(userId: string, notifications: NotificationPayload[]): NotificationPayload | null {
  if (notifications.length === 0) return null
  
  const coinCount = new Set(notifications.map(n => n.coinId)).size
  const priceDropCount = notifications.filter(n => n.alertType === 'price_drop').length
  const healthIssueCount = notifications.filter(n => ['health_score', 'consistency_score'].includes(n.alertType)).length
  
  let message = `Market Event: ${coinCount} of your coins affected`
  const details: string[] = []
  
  if (priceDropCount > 0) {
    details.push(`${priceDropCount} price drops`)
  }
  if (healthIssueCount > 0) {
    details.push(`${healthIssueCount} health issues`)
  }
  
  if (details.length > 0) {
    message += ` (${details.join(', ')}). Check your portfolio for details.`
  } else {
    message += `. Check your portfolio for details.`
  }

  return {
    userId,
    coinId: 'market_event',
    coinName: 'Market Summary',
    coinSymbol: 'MARKET',
    alertType: 'market_event',
    currentValue: coinCount,
    thresholdValue: 1,
    message
  }
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

// Get notification count for current hour
async function getCurrentHourNotificationCount(userId: string): Promise<number> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    const { data, error } = await supabase
      .from('notification_log')
      .select('id')
      .eq('user_id', userId)
      .gte('sent_at', oneHourAgo.toISOString())

    if (error) {
      console.error('Error getting notification count:', error)
      return 0
    }

    return data?.length || 0
  } catch (error) {
    console.error('Error in getCurrentHourNotificationCount:', error)
    return 0
  }
}

// Prioritize notifications by importance
function prioritizeNotifications(notifications: NotificationPayload[], maxCount: number): NotificationPayload[] {
  if (notifications.length <= maxCount) {
    return notifications
  }

  // Priority order: delisting > migration > health_score > price_drop > consistency_score
  const priorityOrder = {
    delisting: 1,
    migration: 2,
    health_score: 3,
    price_drop: 4,
    consistency_score: 5
  }

  const sorted = notifications.sort((a, b) => {
    const aPriority = priorityOrder[a.alertType as keyof typeof priorityOrder] || 999
    const bPriority = priorityOrder[b.alertType as keyof typeof priorityOrder] || 999
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority
    }
    
    // If same priority, prioritize by severity (lower threshold = more severe for drops)
    return Math.abs(a.currentValue - a.thresholdValue) - Math.abs(b.currentValue - b.thresholdValue)
  })

  return sorted.slice(0, maxCount)
}

// Create a portfolio-level batch notification
function createPortfolioBatchNotification(userId: string, notifications: NotificationPayload[]): NotificationPayload {
  const coinCount = new Set(notifications.map(n => n.coinId)).size
  const criticalCount = notifications.filter(n => ['migration', 'delisting'].includes(n.alertType)).length
  const priceDropCount = notifications.filter(n => n.alertType === 'price_drop').length
  const healthIssueCount = notifications.filter(n => ['health_score', 'consistency_score'].includes(n.alertType)).length

  let message = `Portfolio Alert: ${coinCount} coins triggered alerts`
  const details: string[] = []
  
  if (criticalCount > 0) {
    details.push(`${criticalCount} critical events`)
  }
  if (priceDropCount > 0) {
    details.push(`${priceDropCount} price drops`)
  }
  if (healthIssueCount > 0) {
    details.push(`${healthIssueCount} health/consistency issues`)
  }
  
  if (details.length > 0) {
    message += ` (${details.join(', ')})`
  }

  // Use the most severe notification as the base
  const mostSevere = prioritizeNotifications(notifications, 1)[0] || notifications[0]

  return {
    userId,
    coinId: 'portfolio',
    coinName: 'Portfolio Summary',
    coinSymbol: 'PORTFOLIO',
    alertType: 'portfolio_batch',
    currentValue: coinCount,
    thresholdValue: 1,
    message
  }
} 