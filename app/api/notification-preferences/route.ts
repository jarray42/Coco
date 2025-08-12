import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/utils/supabase'

// Force dynamic rendering - prevent static analysis during build
export const dynamic = 'force-dynamic'


interface NotificationPreferences {
  browser_push: boolean
  email_alerts: boolean
  in_app_only: boolean
  notification_style: 'minimal' | 'detailed' | 'custom'
  snooze_enabled: boolean
  snooze_duration: number // in hours (1-48)
  critical_only: boolean
  important_and_critical: boolean
  all_notifications: boolean
  batch_portfolio_alerts: boolean
  max_notifications_per_hour: number
  sound_enabled: boolean
  vibration_enabled: boolean
}

// GET - Fetch user's notification preferences
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching notification preferences:', error)
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
    }

    // Return defaults if no preferences found
    const defaultPreferences: NotificationPreferences = {
      browser_push: true,
      email_alerts: false,
      in_app_only: false,
      notification_style: 'detailed',
      snooze_enabled: true,
      snooze_duration: 16,
      critical_only: false,
      important_and_critical: true,
      all_notifications: false,
      batch_portfolio_alerts: true,
      max_notifications_per_hour: 10, // Updated from 3 to 10
      sound_enabled: true,
      vibration_enabled: true
    }

    return NextResponse.json(preferences || defaultPreferences)
  } catch (error) {
    console.error('Error in notification preferences GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Update user's notification preferences
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const preferences: NotificationPreferences = await request.json()

    // Validate the preferences object
    if (!isValidPreferences(preferences)) {
      return NextResponse.json({ error: 'Invalid preferences data' }, { status: 400 })
    }

    // Ensure urgency level constraint is satisfied (exactly one must be true)
    const urgencyCount = [preferences.critical_only, preferences.important_and_critical, preferences.all_notifications].filter(Boolean).length
    if (urgencyCount !== 1) {
      // Default to important_and_critical if constraint is violated
      preferences.critical_only = false
      preferences.important_and_critical = true
      preferences.all_notifications = false
    }

    console.log('💾 Saving notification preferences for user:', userId, preferences)

    // Upsert preferences (insert or update)
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating notification preferences:', error)
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json({ 
        error: 'Failed to update preferences', 
        details: error.message 
      }, { status: 500 })
    }

    console.log('✅ Preferences saved successfully:', data)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in notification preferences POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function isValidPreferences(preferences: any): preferences is NotificationPreferences {
  return (
    typeof preferences === 'object' &&
    typeof preferences.browser_push === 'boolean' &&
    typeof preferences.email_alerts === 'boolean' &&
    typeof preferences.snooze_enabled === 'boolean' &&
    typeof preferences.snooze_duration === 'number' &&
    preferences.snooze_duration >= 1 && preferences.snooze_duration <= 48 &&
    typeof preferences.max_notifications_per_hour === 'number' &&
    preferences.max_notifications_per_hour >= 1 && preferences.max_notifications_per_hour <= 10 &&
    ['minimal', 'detailed', 'custom'].includes(preferences.notification_style)
  )
} 