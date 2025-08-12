import { NextRequest, NextResponse } from 'next/server'
import { getCoinHistory } from '../../../actions/fetch-coin-history'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const coinId = searchParams.get('coinId')
    const days = parseInt(searchParams.get('days') || '7')

    if (!coinId) {
      return NextResponse.json({ error: 'Coin ID is required' }, { status: 400 })
    }

    if (![7, 30].includes(days)) {
      return NextResponse.json({ error: 'Days must be 7 or 30' }, { status: 400 })
    }

    console.log(`Fetching ${days} days of history for ${coinId} from Bunny CDN`)

    // Fetch history data from Bunny CDN
    const history = await getCoinHistory(coinId, days)

    return NextResponse.json({ 
      success: true, 
      history,
      period: days
    })

  } catch (error) {
    console.error('Error fetching coin history:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch coin history',
      history: []
    }, { status: 500 })
  }
} 