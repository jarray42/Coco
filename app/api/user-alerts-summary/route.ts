import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/utils/supabase'

interface UserAlert {
  id: string
  coin_id: string
  alert_type: string
  threshold_value: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// GET - Fetch user's alert summary
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Fetch all user alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('user_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (alertsError) {
      console.error('Error fetching user alerts:', alertsError)
      return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
    }

    return NextResponse.json(alerts || [])
  } catch (error) {
    console.error('Error in user alerts summary GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new alert
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    const { coin_id, alert_type, threshold_value, is_active = true } = await request.json()

    // Validate required fields
    if (!coin_id || !alert_type) {
      return NextResponse.json({ 
        error: 'Missing required fields: coin_id and alert_type are required' 
      }, { status: 400 })
    }

    // Validate alert type
    const validAlertTypes = ['health_score', 'consistency_score', 'price_drop', 'migration', 'delisting']
    if (!validAlertTypes.includes(alert_type)) {
      return NextResponse.json({ 
        error: `Invalid alert_type. Must be one of: ${validAlertTypes.join(', ')}` 
      }, { status: 400 })
    }

    // Check if alert already exists for this user/coin/type combination
    const { data: existingAlert } = await supabase
      .from('user_alerts')
      .select('id')
      .eq('user_id', userId)
      .eq('coin_id', coin_id)
      .eq('alert_type', alert_type)
      .single()

    if (existingAlert) {
      return NextResponse.json({ 
        error: 'Alert already exists for this coin and alert type' 
      }, { status: 409 })
    }

    // Create new alert
    const { data: newAlert, error: insertError } = await supabase
      .from('user_alerts')
      .insert({
        user_id: userId,
        coin_id,
        alert_type,
        threshold_value: threshold_value || null,
        is_active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating alert:', insertError)
      return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 })
    }

    return NextResponse.json(newAlert, { status: 201 })
  } catch (error) {
    console.error('Error in user alerts summary POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { coin_ids, data_type } = await request.json()
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userId = authHeader.replace('Bearer ', '')
    
    if (!coin_ids || !Array.isArray(coin_ids) || coin_ids.length === 0) {
      return NextResponse.json({ error: 'Invalid coin_ids' }, { status: 400 })
    }

    if (data_type === 'all') {
      // Get both portfolio and alerts data in parallel for better performance
      const [portfolioResult, alertsResult] = await Promise.all([
        // Get portfolio status
        supabase
          .from('user_portfolios')
          .select('coingecko_id')
          .eq('user_id', userId)
          .in('coingecko_id', coin_ids),
        
        // Get alert status
        supabase
          .from('user_alerts')
          .select('coin_id, is_active')
          .eq('user_id', userId)
          .in('coin_id', coin_ids)
          .eq('is_active', true)
      ])

      if (portfolioResult.error) {
        console.error('Portfolio query error:', portfolioResult.error)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      if (alertsResult.error) {
        console.error('Alerts query error:', alertsResult.error)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      const portfolioCoins = new Set(portfolioResult.data?.map(item => item.coingecko_id) || [])
      const alertCoins = new Set(alertsResult.data?.map(item => item.coin_id) || [])

      return NextResponse.json({
        portfolio: coin_ids.map(coinId => ({
          coin_id: coinId,
          in_portfolio: portfolioCoins.has(coinId)
        })),
        alerts: coin_ids.map(coinId => ({
          coin_id: coinId,
          has_alerts: alertCoins.has(coinId)
        }))
      })
    }
    
    if (data_type === 'portfolio') {
      // Batch check portfolio status
      const { data: portfolioItems, error: portfolioError } = await supabase
        .from('user_portfolios')
        .select('coingecko_id')
        .eq('user_id', userId)
        .in('coingecko_id', coin_ids)

      if (portfolioError) {
        console.error('Portfolio query error:', portfolioError)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      const portfolioCoins = new Set(portfolioItems?.map(item => item.coingecko_id) || [])
      const result = coin_ids.map(coinId => ({
        coin_id: coinId,
        in_portfolio: portfolioCoins.has(coinId)
      }))

      return NextResponse.json(result)
    }
    
    if (data_type === 'alerts') {
      // Batch check alert status
      const { data: alerts, error: alertsError } = await supabase
        .from('user_alerts')
        .select('coin_id, is_active')
        .eq('user_id', userId)
        .in('coin_id', coin_ids)
        .eq('is_active', true)

      if (alertsError) {
        console.error('Alerts query error:', alertsError)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      const alertCoins = new Set(alerts?.map(item => item.coin_id) || [])
      const result = coin_ids.map(coinId => ({
        coin_id: coinId,
        has_alerts: alertCoins.has(coinId)
      }))

      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Invalid data_type' }, { status: 400 })
  } catch (error) {
    console.error('User alerts summary error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update an existing alert
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id, coin_id, alert_type, threshold_value, is_active } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Alert ID is required for updates' }, { status: 400 })
    }

    // Update alert
    const { data: updatedAlert, error: updateError } = await supabase
      .from('user_alerts')
      .update({
        coin_id,
        alert_type,
        threshold_value,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId) // Ensure user can only update their own alerts
      .select()
      .single()

    if (updateError) {
      console.error('Error updating alert:', updateError)
      return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 })
    }

    if (!updatedAlert) {
      return NextResponse.json({ error: 'Alert not found or permission denied' }, { status: 404 })
    }

    return NextResponse.json(updatedAlert)
  } catch (error) {
    console.error('Error in user alerts summary PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove an alert
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const url = new URL(request.url)
    const alertId = url.searchParams.get('id')
    const coinId = url.searchParams.get('coin_id')
    const alertType = url.searchParams.get('alert_type')

    if (!alertId && (!coinId || !alertType)) {
      return NextResponse.json({ 
        error: 'Either alert ID or combination of coin_id and alert_type is required' 
      }, { status: 400 })
    }

    let deleteQuery = supabase
      .from('user_alerts')
      .delete()
      .eq('user_id', userId)

    if (alertId) {
      deleteQuery = deleteQuery.eq('id', alertId)
    } else {
      deleteQuery = deleteQuery.eq('coin_id', coinId!).eq('alert_type', alertType!)
    }

    const { error: deleteError } = await deleteQuery

    if (deleteError) {
      console.error('Error deleting alert:', deleteError)
      return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Alert deleted successfully' })
  } catch (error) {
    console.error('Error in user alerts summary DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 