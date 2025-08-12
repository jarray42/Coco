import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/utils/supabase'

// Force dynamic rendering - prevent static analysis during build
export const dynamic = 'force-dynamic'


// API endpoint to fetch pending browser notifications for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const includeDelivered = searchParams.get('include_delivered') === 'true'
    const countOnly = searchParams.get('count_only') === 'true'
    const recent = searchParams.get('recent') === 'true'
    const limit = parseInt(searchParams.get('limit') || '100')
    
    if (!userId) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 })
    }

    // Handle count only request for notification bell badge
    if (countOnly) {
      // Try the new query with acknowledged_at column first
      let { count, error } = await supabase
        .from('notification_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('delivery_status', ['sent', 'delivered']) // <-- count both sent and delivered
        .is('acknowledged_at', null) // Only count unacknowledged notifications
        .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours

      // If that fails (column doesn't exist), fall back to old query
      if (error && error.message?.includes('acknowledged_at')) {
        console.log('acknowledged_at column not found, using fallback query')
        const fallbackResult = await supabase
          .from('notification_log')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .neq('delivery_status', 'read') // Only count non-read notifications
          .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours

        count = fallbackResult.count
        error = fallbackResult.error
      }

      if (error) {
        console.error('Error fetching notification count:', error)
        return NextResponse.json({ count: 0 }, { status: 200 })
      }

      console.log(`📊 Notification count for user ${userId}: ${count || 0}`)
      return NextResponse.json({ count: count || 0 })
    }

    // Handle recent notifications request for animated list
    if (recent) {
      const { data: notifications, error } = await supabase
        .from('notification_log')
        .select('*')
        .eq('user_id', userId)
        .gte('sent_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Last 10 minutes
        .order('sent_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching recent notifications:', error)
        return NextResponse.json([], { status: 200 })
      }

      return NextResponse.json(notifications || [])
    }

    if (includeDelivered) {
      // Fetch notification history from notification_log table
      const { data: notifications, error } = await supabase
        .from('notification_log')
        .select('*')
        .eq('user_id', userId)
        .order('sent_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching notification history:', error)
        return NextResponse.json([], { status: 200 }) // Return empty array on error
      }

      return NextResponse.json(notifications || [])
    }

    // Fetch undelivered notifications from notification_log table
    const { data: notifications, error } = await supabase
      .from('notification_log')
      .select('*')
      .eq('user_id', userId)
      .eq('delivery_status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching pending notifications:', error)
      return NextResponse.json([], { status: 200 }) // Return empty array on error
    }

    // Mark notifications as delivered
    if (notifications && notifications.length > 0) {
      const notificationIds = notifications.map(n => n.id)
      
      const { error: updateError } = await supabase
        .from('notification_log')
        .update({ delivery_status: 'delivered' })
        .in('id', notificationIds)

      if (updateError) {
        console.error('Error updating notification status:', updateError)
      } else {
        console.log(`📱 Delivered ${notifications.length} pending notifications to user ${userId}`)
      }
    }

    return NextResponse.json(notifications || [])
  } catch (error) {
    console.error('Error in pending notifications endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// API endpoint to mark notification(s) as read/acknowledged
export async function POST(request: NextRequest) {
  try {
    const { notificationId, userId, markAllAsRead } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // ONLY allow markAllAsRead requests - block individual notification acknowledgment
    if (!markAllAsRead) {
      return NextResponse.json({ 
        error: 'Individual notification acknowledgment not allowed. Use markAllAsRead instead.',
        success: false 
      }, { status: 400 })
    }

    // If markAllAsRead is true, acknowledge all unread notifications for the user
    if (markAllAsRead) {
      // Try the new approach with acknowledged_at column first
      let { error } = await supabase
        .from('notification_log')
        .update({ 
          delivery_status: 'read',
          acknowledged_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .in('delivery_status', ['sent', 'delivered']) // <-- fix: mark both sent and delivered
        .is('acknowledged_at', null)

      // If that fails (column doesn't exist), fall back to old approach
      if (error && error.message?.includes('acknowledged_at')) {
        console.log('acknowledged_at column not found, using fallback approach')
        const fallbackResult = await supabase
          .from('notification_log')
          .update({ delivery_status: 'read' })
          .eq('user_id', userId)
          .in('delivery_status', ['sent', 'delivered']) // <-- fix fallback too

        error = fallbackResult.error
      }

      if (error) {
        console.error('Error acknowledging all notifications:', error)
        return NextResponse.json({ error: 'Failed to acknowledge notifications' }, { status: 500 })
      }

      console.log(`✅ Marked all notifications as read for user ${userId}`)
      return NextResponse.json({ success: true, message: 'All notifications marked as read' })
    }

    // Otherwise, acknowledge a specific notification
    if (!notificationId) {
      return NextResponse.json({ error: 'notificationId required for single notification' }, { status: 400 })
    }

    // Try the new approach with acknowledged_at column first
    let { error } = await supabase
      .from('notification_log')
      .update({ 
        delivery_status: 'read',
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .eq('user_id', userId)

    // If that fails (column doesn't exist), fall back to old approach
    if (error && error.message?.includes('acknowledged_at')) {
      console.log('acknowledged_at column not found, using fallback approach for single notification')
      const fallbackResult = await supabase
        .from('notification_log')
        .update({ delivery_status: 'read' })
        .eq('id', notificationId)
        .eq('user_id', userId)

      error = fallbackResult.error
    }

    if (error) {
      console.error('Error acknowledging notification:', error)
      return NextResponse.json({ error: 'Failed to acknowledge notification' }, { status: 500 })
    }

    console.log(`✅ Marked notification ${notificationId} as read`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in acknowledge notification endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// API endpoint to delete notifications for a specific coin
export async function DELETE(request: NextRequest) {
  try {
    const { userId, coinId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    if (!coinId) {
      return NextResponse.json({ error: 'coinId required' }, { status: 400 })
    }

    // Delete all notifications for this user and coin
    const { error } = await supabase
      .from('notification_log')
      .delete()
      .eq('user_id', userId)
      .eq('coin_id', coinId)

    if (error) {
      console.error('Error deleting coin notifications:', error)
      return NextResponse.json({ error: 'Failed to delete notifications' }, { status: 500 })
    }

    console.log(`✅ Deleted all notifications for user ${userId} and coin ${coinId}`)
    return NextResponse.json({ success: true, message: 'All coin notifications deleted' })
  } catch (error) {
    console.error('Error in delete coin notifications endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 