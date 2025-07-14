import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/utils/supabase'

// Test endpoint to verify bell notification functionality
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    
    if (!userId) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 })
    }

    console.log(`🔔 Testing bell functionality for user: ${userId}`)

    // Step 1: Check current notification count
    const { count: beforeCount, error: countError } = await supabase
      .from('notification_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('delivery_status', 'sent')
      .is('acknowledged_at', null)
      .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    if (countError) {
      console.error('Error getting count:', countError)
      return NextResponse.json({ error: 'Failed to get count' }, { status: 500 })
    }

    console.log(`📊 Current unread count: ${beforeCount}`)

    // Step 2: Create a test notification
    const { data: testNotification, error: insertError } = await supabase
      .from('notification_log')
      .insert({
        user_id: userId,
        coin_id: 'test-coin',
        alert_type: 'test',
        message: 'Test notification for bell functionality',
        delivery_status: 'sent',
        sent_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating test notification:', insertError)
      return NextResponse.json({ error: 'Failed to create test notification' }, { status: 500 })
    }

    console.log(`✅ Created test notification: ${testNotification.id}`)

    // Step 3: Check count after creation
    const { count: afterCreateCount } = await supabase
      .from('notification_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('delivery_status', 'sent')
      .is('acknowledged_at', null)
      .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    console.log(`📊 Count after creating test notification: ${afterCreateCount}`)

    // Step 4: Mark all notifications as read (simulate bell click)
    const { error: markReadError } = await supabase
      .from('notification_log')
      .update({ 
        delivery_status: 'read',
        acknowledged_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('delivery_status', 'sent')
      .is('acknowledged_at', null)

    if (markReadError) {
      console.error('Error marking notifications as read:', markReadError)
      return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 })
    }

    console.log(`✅ Marked all notifications as read for user ${userId}`)

    // Step 5: Check count after marking as read
    const { count: afterReadCount } = await supabase
      .from('notification_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('delivery_status', 'sent')
      .is('acknowledged_at', null)
      .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    console.log(`📊 Count after marking as read: ${afterReadCount}`)

    // Step 6: Clean up test notification
    await supabase
      .from('notification_log')
      .delete()
      .eq('id', testNotification.id)

    console.log(`🧹 Cleaned up test notification`)

    return NextResponse.json({
      success: true,
      test_results: {
        initial_count: beforeCount,
        after_create_count: afterCreateCount,
        after_read_count: afterReadCount,
        expected_final_count: beforeCount, // Should return to original count after cleanup
        bell_click_worked: afterReadCount === 0,
        test_notification_id: testNotification.id
      },
      message: `Bell test completed. Count went from ${beforeCount} → ${afterCreateCount} → ${afterReadCount} (expected: 0)`
    })

  } catch (error) {
    console.error('Error in bell test:', error)
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
} 