import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../utils/supabase'

// Force dynamic rendering - prevent static analysis during build
export const dynamic = 'force-dynamic'


export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Fetch all coin alerts where the user has staked in a single query
    const { data: stakedAlerts, error } = await supabase
      .from('coin_alerts')
      .select('coin_id, alert_type, user_id')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching staked alerts:', error)
      return NextResponse.json({ error: 'Failed to fetch staking data' }, { status: 500 })
    }

    // Create a map of coin IDs where the user has staked
    const stakedMap: Record<string, boolean> = {}
    stakedAlerts?.forEach((alert: { coin_id: string; alert_type: string; user_id: string }) => {
      stakedMap[alert.coin_id] = true
    })

    return NextResponse.json({
      stakedMap,
      count: stakedAlerts?.length || 0
    })

  } catch (error) {
    console.error('Error in coin alerts batch API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 