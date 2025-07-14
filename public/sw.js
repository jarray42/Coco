// Service Worker for Push Notifications
const CACHE_NAME = 'cocoricoin-notifications-v1'

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...')
  self.skipWaiting()
})

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...')
  event.waitUntil(self.clients.claim())
})

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event)
  
  const notification = event.notification
  const action = event.action
  const data = notification.data || {}

  notification.close()

  // Handle different actions
  if (action === 'view' || action === 'view-dashboard') {
    const url = data.url || '/notifications'
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clientList) => {
        // Check if there's already a window open
        for (let client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus()
            client.navigate(url)
            return
          }
        }
        
        // Open new window if none exists
        if (self.clients.openWindow) {
          return self.clients.openWindow(url)
        }
      })
    )
  } else if (action === 'dismiss') {
    // Just close the notification - already handled above
    console.log('Notification dismissed')
  } else {
    // Default action - open app
    const url = data.url || '/'
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clientList) => {
        for (let client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus()
            return
          }
        }
        
        if (self.clients.openWindow) {
          return self.clients.openWindow(url)
        }
      })
    )
  }
})

// Handle notification close events
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag)
  
  // Track notification dismissal analytics if needed
  const data = event.notification.data || {}
  if (data.trackDismissal) {
    // Send analytics event
    console.log('Tracking notification dismissal for:', data)
  }
})

// Handle push events (for future server-sent push notifications)
self.addEventListener('push', (event) => {
  console.log('Push message received:', event)
  
  if (!event.data) {
    return
  }

  try {
    const payload = event.data.json()
    
    const options = {
      body: payload.body,
      icon: payload.icon || '/ailogo.png',
      badge: '/ailogo.png',
      image: payload.image,
      data: payload.data,
      actions: payload.actions || [
        {
          action: 'view',
          title: 'View'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ],
      tag: payload.tag,
      requireInteraction: payload.requireInteraction || false,
      vibrate: [200, 100, 200],
      timestamp: Date.now()
    }

    event.waitUntil(
      self.registration.showNotification(payload.title, options)
    )
  } catch (error) {
    console.error('Error handling push event:', error)
    
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('CocoriCoin Alert', {
        body: 'You have a new notification',
        icon: '/ailogo.png',
        badge: '/ailogo.png'
      })
    )
  }
})

// Handle background sync (for future offline functionality)
self.addEventListener('sync', (event) => {
  console.log('Background sync:', event.tag)
  
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications())
  }
})

// Sync notifications function
async function syncNotifications() {
  try {
    // Sync any pending notifications when back online
    console.log('Syncing notifications...')
    
    // This would typically:
    // 1. Check for missed notifications while offline
    // 2. Send any queued notifications
    // 3. Update notification status
    
  } catch (error) {
    console.error('Error syncing notifications:', error)
  }
}

// Handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data)
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
}) 