import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../utils/supabase'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }



    // Fetch all portfolio items for the user in a single query
    const { data: portfolioItems, error } = await supabase
      .from('user_portfolios')
      .select('coingecko_id')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching portfolio items:', error)
      return NextResponse.json({ error: 'Failed to fetch portfolio data' }, { status: 500 })
    }

    // Create a map of coin IDs that are in the user's portfolio
    const portfolioMap: Record<string, boolean> = {}
    portfolioItems?.forEach((item: { coingecko_id: string }) => {
      portfolioMap[item.coingecko_id] = true
    })

    return NextResponse.json({
      portfolioMap,
      count: portfolioItems?.length || 0
    })

  } catch (error) {
    console.error('Error in portfolio batch API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 