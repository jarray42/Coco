import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../utils/supabase'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Fetch all user data in parallel for maximum efficiency
    const [portfolioResult, alertsResult, stakedResult, verifiedAlertsResult] = await Promise.all([
      // Portfolio items
      supabase
        .from('user_portfolios')
        .select('coingecko_id')
        .eq('user_id', userId),
      
      // User alerts
      supabase
        .from('user_alerts')
        .select('coin_id, alert_type, is_active')
        .eq('user_id', userId)
        .eq('is_active', true),
      
      // Coin alerts (staking) - only pending and verified, exclude paid
      supabase
        .from('coin_alerts')
        .select('coin_id, alert_type, user_id, status')
        .eq('user_id', userId)
        .in('status', ['pending', 'verified'])
        .eq('archived', false),
      
      // Verified alerts (for all coins) - including both user-submitted and admin-created
      supabase
        .from('coin_alerts')
        .select('coin_id, alert_type')
        .eq('status', 'verified')
        .eq('archived', false)
        .in('alert_type', ['migration', 'delisting', 'rebrand'])
    ])

    // Handle errors
    if (portfolioResult.error) {
      console.error('Error fetching portfolio:', portfolioResult.error)
      return NextResponse.json({ error: 'Failed to fetch portfolio data' }, { status: 500 })
    }

    if (alertsResult.error) {
      console.error('Error fetching alerts:', alertsResult.error)
      return NextResponse.json({ error: 'Failed to fetch alert data' }, { status: 500 })
    }

    if (stakedResult.error) {
      console.error('Error fetching staked alerts:', stakedResult.error)
      return NextResponse.json({ error: 'Failed to fetch staking data' }, { status: 500 })
    }

    if (verifiedAlertsResult.error) {
      console.error('Error fetching verified alerts:', verifiedAlertsResult.error)
      return NextResponse.json({ error: 'Failed to fetch verified alerts data' }, { status: 500 })
    }

    // Create maps for each data type
    const portfolioMap: Record<string, boolean> = {}
    portfolioResult.data?.forEach((item: { coingecko_id: string }) => {
      portfolioMap[item.coingecko_id] = true
    })

    const alertsMap: Record<string, boolean> = {}
    alertsResult.data?.forEach((alert: { coin_id: string; alert_type: string; is_active: boolean }) => {
      if (alert.is_active) {
        alertsMap[alert.coin_id] = true
      }
    })

    const stakedMap: Record<string, boolean> = {}
    stakedResult.data?.forEach((alert: { coin_id: string; alert_type: string; user_id: string }) => {
      stakedMap[alert.coin_id] = true
    })

    const verifiedAlertsMap: Record<string, string[]> = {}
    verifiedAlertsResult.data?.forEach((alert: { coin_id: string; alert_type: string }) => {
      if (!verifiedAlertsMap[alert.coin_id]) {
        verifiedAlertsMap[alert.coin_id] = []
      }
      verifiedAlertsMap[alert.coin_id].push(alert.alert_type)
    })

    return NextResponse.json({
      portfolio: {
        map: portfolioMap,
        count: portfolioResult.data?.length || 0
      },
      alerts: {
        map: alertsMap,
        count: alertsResult.data?.length || 0
      },
      staked: {
        map: stakedMap,
        count: stakedResult.data?.length || 0
      },
      verifiedAlerts: {
        map: verifiedAlertsMap,
        count: Object.keys(verifiedAlertsMap).length
      }
    })

  } catch (error) {
    console.error('Error in user data batch API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 