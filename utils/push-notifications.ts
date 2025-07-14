"use client"

interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  image?: string
  data?: any
  actions?: NotificationAction[]
  tag?: string
  requireInteraction?: boolean
}

interface NotificationAction {
  action: string
  title: string
  icon?: string
}

export class PushNotificationService {
  private static instance: PushNotificationService
  private registration: ServiceWorkerRegistration | null = null
  private permission: NotificationPermission = 'default'

  private constructor() {
    if (typeof window !== 'undefined') {
      this.permission = Notification.permission
    }
  }

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService()
    }
    return PushNotificationService.instance
  }

  /**
   * Initialize the push notification service
   */
  async initialize(): Promise<boolean> {
    try {
      if (!this.isSupported()) {
        console.warn('Push notifications are not supported in this browser')
        return false
      }

      // Register service worker
      await this.registerServiceWorker()
      
      return true
    } catch (error) {
      console.error('Failed to initialize push notifications:', error)
      return false
    }
  }

  /**
   * Check if push notifications are supported
   */
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window
    )
  }

  /**
   * Get current permission status
   */
  getPermission(): NotificationPermission {
    return this.permission
  }

  /**
   * Request notification permission with elegant UX
   */
  async requestPermission(): Promise<NotificationPermission> {
    try {
      if (!this.isSupported()) {
        return 'denied'
      }

      if (this.permission === 'granted') {
        return 'granted'
      }

      // Show a friendly pre-permission dialog
      const shouldRequest = await this.showPrePermissionDialog()
      if (!shouldRequest) {
        return 'denied'
      }

      // Request actual permission
      this.permission = await Notification.requestPermission()
      
      if (this.permission === 'granted') {
        // Show a welcome notification
        await this.showWelcomeNotification()
      }

      return this.permission
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return 'denied'
    }
  }

  /**
   * Send a local notification
   */
  async sendNotification(payload: NotificationPayload): Promise<boolean> {
    try {
      if (this.permission !== 'granted') {
        console.warn('Notification permission not granted')
        return false
      }

      // Check if user is in quiet hours
      if (await this.isInQuietHours()) {
        console.log('Notification blocked: quiet hours active')
        return false
      }

      // Check rate limiting
      if (await this.isRateLimited()) {
        console.log('Notification blocked: rate limit exceeded')
        return false
      }

      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/ailogo.png',
        badge: payload.badge || '/ailogo.png',
        image: payload.image,
        data: payload.data,
        tag: payload.tag,
        requireInteraction: payload.requireInteraction || false,
        actions: payload.actions || [],
        silent: false,
        vibrate: [200, 100, 200], // Subtle vibration pattern
        timestamp: Date.now()
      })

      // Handle notification events
      notification.onclick = (event) => {
        event.preventDefault()
        window.focus()
        
        // Handle action based on notification data
        if (payload.data?.url) {
          window.open(payload.data.url, '_blank')
        }
        
        notification.close()
      }

      notification.onerror = (error) => {
        console.error('Notification error:', error)
      }

      // Track notification for rate limiting
      await this.trackNotification()

      return true
    } catch (error) {
      console.error('Error sending notification:', error)
      return false
    }
  }

  /**
   * Send notification for crypto alerts
   */
  async sendCryptoAlert(alert: {
    coinSymbol: string
    coinName: string
    alertType: string
    message: string
    currentValue: number
    thresholdValue: number
    coinId: string
  }): Promise<boolean> {
    const alertTypeEmojis = {
      health_score: '❤️',
      consistency_score: '🛡️',
      price_drop: '📉',
      migration: '🔄',
      delisting: '⚠️'
    }

    const emoji = alertTypeEmojis[alert.alertType as keyof typeof alertTypeEmojis] || '🔔'
    
    return await this.sendNotification({
      title: `${emoji} ${alert.coinSymbol} Alert`,
      body: alert.message,
      icon: '/ailogo.png',
      data: {
        alertType: alert.alertType,
        coinId: alert.coinId,
        url: `/coin/${alert.coinId}`
      },
      actions: [
        {
          action: 'view',
          title: 'View Details'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ],
      tag: `crypto-alert-${alert.coinId}-${alert.alertType}`,
      requireInteraction: alert.alertType === 'migration' || alert.alertType === 'delisting'
    })
  }

  /**
   * Send batch notification for multiple alerts
   */
  async sendBatchAlert(alerts: any[]): Promise<boolean> {
    if (alerts.length === 0) return false

    const coinCount = new Set(alerts.map(a => a.coinSymbol)).size
    const title = `📊 Portfolio Alert`
    const body = coinCount === 1 
      ? `${alerts[0].coinSymbol} has ${alerts.length} active alert${alerts.length > 1 ? 's' : ''}`
      : `${coinCount} coins have active alerts`

    return await this.sendNotification({
      title,
      body,
      icon: '/ailogo.png',
      data: {
        type: 'batch',
        alertCount: alerts.length,
        coinCount,
        url: '/notifications'
      },
      actions: [
        {
          action: 'view-dashboard',
          title: 'View Dashboard'
        }
      ],
      tag: 'batch-portfolio-alert'
    })
  }

  /**
   * Register service worker for advanced notification features
   */
  private async registerServiceWorker(): Promise<void> {
    try {
      if ('serviceWorker' in navigator) {
        this.registration = await navigator.serviceWorker.register('/sw.js')
        console.log('Service worker registered successfully')
      }
    } catch (error) {
      console.error('Service worker registration failed:', error)
    }
  }

  /**
   * Show friendly pre-permission dialog
   */
  private async showPrePermissionDialog(): Promise<boolean> {
    return new Promise((resolve) => {
      // Create a custom modal instead of browser's ugly permission dialog
      const modal = document.createElement('div')
      modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50'
      modal.innerHTML = `
        <div class="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-2xl">
          <div class="text-center">
            <div class="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 3h11v14H4z"></path>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Stay Informed</h3>
            <p class="text-gray-600 mb-6 text-sm">Get notified about important changes to your crypto portfolio. You can customize your preferences anytime.</p>
            <div class="flex gap-3">
              <button id="deny-notifications" class="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                Not Now
              </button>
              <button id="allow-notifications" class="flex-1 px-4 py-2 text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors">
                Enable Alerts
              </button>
            </div>
          </div>
        </div>
      `

      document.body.appendChild(modal)

      // Handle button clicks
      modal.querySelector('#allow-notifications')?.addEventListener('click', () => {
        document.body.removeChild(modal)
        resolve(true)
      })

      modal.querySelector('#deny-notifications')?.addEventListener('click', () => {
        document.body.removeChild(modal)
        resolve(false)
      })

      // Handle backdrop click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal)
          resolve(false)
        }
      })
    })
  }

  /**
   * Show welcome notification after permission granted
   */
  private async showWelcomeNotification(): Promise<void> {
    setTimeout(() => {
      new Notification('🎉 Notifications Enabled!', {
        body: 'You\'ll now receive alerts about your crypto portfolio. Manage preferences in your dashboard.',
        icon: '/ailogo.png',
        tag: 'welcome-notification'
      })
    }, 1000) // Delay to avoid overwhelming user
  }

  /**
   * Check if user is in quiet hours
   */
  private async isInQuietHours(): Promise<boolean> {
    try {
      // This would typically fetch from your preferences API
      // For now, implementing basic logic
      const currentHour = new Date().getHours()
      const quietStart = 22 // 10 PM
      const quietEnd = 8    // 8 AM
      
      if (quietStart > quietEnd) {
        // Overnight quiet hours (e.g., 10 PM to 8 AM)
        return currentHour >= quietStart || currentHour < quietEnd
      } else {
        // Same day quiet hours (e.g., 1 PM to 3 PM)
        return currentHour >= quietStart && currentHour < quietEnd
      }
    } catch {
      return false
    }
  }

  /**
   * Check if rate limit is exceeded
   */
  private async isRateLimited(): Promise<boolean> {
    try {
      const key = 'notification_count'
      const now = Date.now()
      const oneHour = 60 * 60 * 1000
      
      // Get stored notification timestamps
      const stored = localStorage.getItem(key)
      let timestamps: number[] = stored ? JSON.parse(stored) : []
      
      // Remove timestamps older than 1 hour
      timestamps = timestamps.filter(ts => now - ts < oneHour)
      
      // Check if we've exceeded the limit (default: 3 per hour)
      const maxPerHour = 3
      return timestamps.length >= maxPerHour
    } catch {
      return false
    }
  }

  /**
   * Track notification for rate limiting
   */
  private async trackNotification(): Promise<void> {
    try {
      const key = 'notification_count'
      const now = Date.now()
      
      const stored = localStorage.getItem(key)
      let timestamps: number[] = stored ? JSON.parse(stored) : []
      
      timestamps.push(now)
      localStorage.setItem(key, JSON.stringify(timestamps))
    } catch (error) {
      console.error('Error tracking notification:', error)
    }
  }
}

// Export singleton instance
export const pushNotifications = PushNotificationService.getInstance() 