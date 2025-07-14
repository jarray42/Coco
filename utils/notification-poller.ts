import { PushNotificationService } from './push-notifications'
import type { AuthUser } from './supabase-auth'

interface PendingNotification {
  id: string
  user_id: string
  coin_id: string
  alert_type: string
  message: string
  sent_at: string
  delivery_data?: {
    title: string
    body: string
    icon: string
    data: {
      coinId: string
      alertType: string
      url: string
    }
  }
}

export class NotificationPoller {
  private static instance: NotificationPoller | null = null
  private intervalId: NodeJS.Timeout | null = null
  private user: AuthUser | null = null
  private pushService: PushNotificationService | null = null
  private isRunning = false

  private constructor() {}

  static getInstance(): NotificationPoller {
    if (!NotificationPoller.instance) {
      NotificationPoller.instance = new NotificationPoller()
    }
    return NotificationPoller.instance
  }

  async initialize(user: AuthUser) {
    this.user = user
    this.pushService = PushNotificationService.getInstance()
    
    // Initialize push notifications if not already done
    await this.pushService.initialize()
    
    console.log('📡 Notification poller initialized for user:', user.email)
  }

  start(intervalMs: number = 30000) { // Default: check every 30 seconds
    if (this.isRunning || !this.user) {
      console.log('⚠️ Notification poller already running or no user set')
      return
    }

    this.isRunning = true
    console.log('🚀 Starting notification poller...')

    // Check immediately
    this.checkPendingNotifications()

    // Set up interval
    this.intervalId = setInterval(() => {
      this.checkPendingNotifications()
    }, intervalMs)

    console.log(`⏰ Notification poller running every ${intervalMs/1000}s`)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
    console.log('⏹️ Notification poller stopped')
  }

  private async checkPendingNotifications() {
    if (!this.user || !this.pushService) {
      return
    }

    try {
      const response = await fetch(`/api/notifications/pending?user_id=${this.user.id}`)
      
      if (!response.ok) {
        console.error('Failed to fetch pending notifications:', response.status)
        return
      }

      const notifications: PendingNotification[] = await response.json()

      if (notifications.length > 0) {
        console.log(`📬 Found ${notifications.length} pending notifications`)
        
        for (const notification of notifications) {
          await this.deliverNotification(notification)
        }
      }
    } catch (error) {
      console.error('Error checking pending notifications:', error)
    }
  }

  private async deliverNotification(notification: PendingNotification) {
    if (!this.pushService) return

    try {
      const notificationData = notification.delivery_data || {
        title: 'Crypto Alert',
        body: notification.message,
        icon: '/ailogo.png',
        data: {
          coinId: notification.coin_id,
          alertType: notification.alert_type,
          url: `/coin/${notification.coin_id}`
        }
      }

      // Show browser notification
      await this.pushService.sendNotification({
        title: notificationData.title,
        body: notificationData.body,
        icon: notificationData.icon,
        badge: '/ailogo.png',
        tag: `${notification.coin_id}-${notification.alert_type}`,
        data: notificationData.data,
        requireInteraction: ['migration', 'delisting'].includes(notification.alert_type),
        actions: [
          {
            action: 'view',
            title: 'View Details',
            icon: '/ailogo.png'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ]
      })

      console.log(`🔔 Delivered notification: ${notificationData.title}`)

      // IMPORTANT: Do NOT acknowledge notifications automatically
      // Only the user clicking the bell should mark notifications as read

    } catch (error) {
      console.error('Error delivering notification:', error)
    }
  }

  // Method to manually trigger a check (useful for immediate testing)
  async checkNow() {
    console.log('🔍 Manual notification check triggered')
    await this.checkPendingNotifications()
  }

  // Get current status
  getStatus() {
    return {
      isRunning: this.isRunning,
      hasUser: !!this.user,
      hasPushService: !!this.pushService,
      userEmail: this.user?.email
    }
  }
}

// Export singleton instance
export const notificationPoller = NotificationPoller.getInstance() 