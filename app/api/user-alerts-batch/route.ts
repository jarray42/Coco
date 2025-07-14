import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../utils/supabase'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Fetch all active alerts for the user in a single query
    const { data: alerts, error } = await supabase
      .from('user_alerts')
      .select('coin_id, alert_type, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching user alerts:', error)
      return NextResponse.json({ error: 'Failed to fetch alert data' }, { status: 500 })
    }

    // Create a map of coin IDs that have active alerts
    const alertsMap: Record<string, boolean> = {}
    alerts?.forEach((alert: { coin_id: string; alert_type: string; is_active: boolean }) => {
      if (alert.is_active) {
        alertsMap[alert.coin_id] = true
      }
    })

    return NextResponse.json({
      alertsMap,
      count: alerts?.length || 0
    })

  } catch (error) {
    console.error('Error in alerts batch API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 