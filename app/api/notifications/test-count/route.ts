import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/utils/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    
    if (!userId) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 })
    }

    // Test 1: Check if acknowledged_at column exists
    let columnExists = false
    try {
      const { data: columnCheck } = await supabase
        .from('notification_log')
        .select('acknowledged_at')
        .limit(1)
      columnExists = true
    } catch (error) {
      console.log('acknowledged_at column does not exist:', error)
    }

    // Test 2: Count all notifications for user (last 24h)
    const { count: totalCount, error: totalError } = await supabase
      .from('notification_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    // Test 3: Count sent notifications only
    const { count: sentCount, error: sentError } = await supabase
      .from('notification_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('delivery_status', 'sent')
      .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    // Test 4: Try the new query (only if column exists)
    let unacknowledgedCount = 0
    let unacknowledgedError = null
    if (columnExists) {
      try {
        const { count, error } = await supabase
          .from('notification_log')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('delivery_status', 'sent')
          .is('acknowledged_at', null)
          .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

        unacknowledgedCount = count || 0
        unacknowledgedError = error
      } catch (error) {
        unacknowledgedError = error
      }
    }

    // Test 5: Get some sample notifications to see their structure
    const { data: sampleNotifications } = await supabase
      .from('notification_log')
      .select('*')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })
      .limit(3)

    return NextResponse.json({
      user_id: userId,
      debug_results: {
        column_exists: columnExists,
        total_count_24h: totalCount || 0,
        sent_count_24h: sentCount || 0,
        unacknowledged_count: unacknowledgedCount,
        errors: {
          total_error: totalError?.message,
          sent_error: sentError?.message,
          unacknowledged_error: unacknowledgedError instanceof Error ? unacknowledgedError.message : String(unacknowledgedError)
        }
      },
      sample_notifications: sampleNotifications || [],
      recommendation: !columnExists 
        ? "Run the SQL script: scripts/fix-notification-acknowledgment.sql"
        : unacknowledgedCount === 0 && (sentCount || 0) > 0
        ? "All notifications are acknowledged. Create new ones or check if column has null values."
        : "System should be working. Check browser console for errors."
    })

  } catch (error) {
    console.error('Test count error:', error)
    return NextResponse.json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 