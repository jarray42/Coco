import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/utils/supabase'
import { getHealthScore } from '@/utils/beat-calculator'

// Function to immediately check if an alert should trigger
async function checkAlertImmediately(userId: string, coinId: string, alertType: string, thresholdValue: number) {
  try {
    console.log(`🔍 Immediate check for ${coinId} ${alertType} alert`)

    // Fetch current coin data with pre-calculated scores
    const { data: coinData, error: coinError } = await supabase
      .from('coins')
      .select('*, health_score, twitter_subscore, github_subscore, consistency_score, gem_score')
      .eq('coingecko_id', coinId)
      .single()

    if (coinError || !coinData) {
      console.log(`⚠️ No coin data found for immediate check: ${coinId}`)
      return
    }

    // Use pre-calculated scores from database
    const healthScore = getHealthScore(coinData)
    const consistencyScore = coinData.consistency_score || 50

    let shouldTrigger = false
    let currentValue = 0
    let message = ''

    switch (alertType) {
      case 'health_score':
        currentValue = healthScore
        shouldTrigger = currentValue < thresholdValue
        message = `${coinData.symbol} health score is ${currentValue} (below your alert threshold of ${thresholdValue})`
        break

      case 'consistency_score':
        currentValue = consistencyScore
        shouldTrigger = currentValue < thresholdValue
        message = `${coinData.symbol} consistency score is ${currentValue} (below your alert threshold of ${thresholdValue})`
        break

      case 'price_drop':
        const priceChange = coinData.price_change_24h || 0
        currentValue = Math.abs(priceChange)
        shouldTrigger = priceChange < 0 && currentValue > thresholdValue
        message = `${coinData.symbol} price dropped ${currentValue.toFixed(2)}% (above your alert threshold of ${thresholdValue}%)`
        break

      default:
        console.log(`⚠️ Immediate check not supported for alert type: ${alertType}`)
        return
    }

    console.log(`🔍 Immediate check result: ${coinData.symbol} ${alertType} = ${currentValue} vs ${thresholdValue} → ${shouldTrigger ? 'TRIGGER' : 'OK'}`)

    if (shouldTrigger) {
      // Create immediate notification
      const { error: notificationError } = await supabase
        .from('notification_log')
        .insert({
          user_id: userId,
          coin_id: coinId,
          alert_type: alertType,
          message: `🚨 IMMEDIATE ALERT: ${message}`,
          delivery_status: 'sent',
          sent_at: new Date().toISOString()
        })

      if (notificationError) {
        console.error('Error creating immediate notification:', notificationError)
      } else {
        console.log(`🚨 Immediate notification created for ${coinData.symbol}`)
      }
    }

  } catch (error) {
    console.error('Error in immediate alert check:', error)
  }
}



export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const coinId = searchParams.get('coin_id')
    const userId = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (!coinId) {
      return NextResponse.json({ error: 'coin_id is required' }, { status: 400 })
    }

    // Fetch existing alerts for this user and coin
    const { data: alerts, error } = await supabase
      .from('user_alerts')
      .select('*')
      .eq('user_id', userId)
      .eq('coin_id', coinId)

    if (error) {
      console.error('Error fetching user alerts:', error)
      return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
    }

    return NextResponse.json(alerts || [])
  } catch (error) {
    console.error('Error in user alerts GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { id, coin_id, alert_type, threshold_value, is_active } = body

    // If ID is provided, update existing alert
    if (id) {
      const { data, error } = await supabase
        .from('user_alerts')
        .update({
          is_active: is_active ?? true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', userId) // Security: ensure user owns this alert
        .select()

      if (error) {
        console.error('Error updating user alert:', error)
        return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 })
      }

      return NextResponse.json({ success: true, data })
    }

    // Otherwise, create/upsert new alert
    if (!coin_id || !alert_type) {
      return NextResponse.json({ error: 'coin_id and alert_type are required for new alerts' }, { status: 400 })
    }

    // Upsert the alert (insert or update if exists)
    const { data, error } = await supabase
      .from('user_alerts')
      .upsert({
        user_id: userId,
        coin_id,
        alert_type,
        threshold_value,
        is_active: is_active ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,coin_id,alert_type'
      })
      .select()

    if (error) {
      console.error('Error saving user alert:', error)
      return NextResponse.json({ error: 'Failed to save alert' }, { status: 500 })
    }

    // After successfully creating/updating an alert, check immediately if it should trigger
    try {
      await checkAlertImmediately(userId, coin_id, alert_type, threshold_value)
    } catch (immediateCheckError) {
      console.error('Error in immediate alert check:', immediateCheckError)
      // Don't fail the alert creation if immediate check fails
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in user alerts POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const coinId = searchParams.get('coin_id')
    const alertType = searchParams.get('alert_type')

    if (!coinId) {
      return NextResponse.json({ error: 'coin_id is required' }, { status: 400 })
    }

    let query = supabase
      .from('user_alerts')
      .delete()
      .eq('user_id', userId)
      .eq('coin_id', coinId)

    if (alertType) {
      query = query.eq('alert_type', alertType)
    }

    const { error } = await query

    if (error) {
      console.error('Error deleting user alert:', error)
      return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in user alerts DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 