import { NextResponse } from 'next/server';
import { getLatestCryptoJsonFilename } from '../../../utils/bunny-client';

// Force dynamic rendering - prevent static analysis during build
export const dynamic = 'force-dynamic'


export interface SearchIndexItem {
  coingecko_id: string;
  name: string;
  symbol: string;
  rank: number;
}

// Cache for search index with longer duration since it doesn't change often
let searchIndexCache: { data: SearchIndexItem[]; timestamp: number } | null = null;
const SEARCH_INDEX_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export async function GET() {
  try {
    const now = Date.now();
    
    // Check if we have valid cached data
    if (searchIndexCache && now - searchIndexCache.timestamp < SEARCH_INDEX_CACHE_DURATION) {
      console.log('[SEARCH INDEX] Returning cached search index');
      return NextResponse.json({
        searchIndex: searchIndexCache.data,
        cached: true,
        totalCount: searchIndexCache.data.length
      });
    }

    console.log('[SEARCH INDEX] Fetching fresh search index from Bunny CDN');
    
    // Get the latest filename
    const latestFilename = await getLatestCryptoJsonFilename();
    
    // Fetch the full data from Bunny CDN
    const BUNNY_BASE_URL = "https://cocricoin.b-cdn.net";
    const cacheBuster = `?cb=${encodeURIComponent(new Date().toISOString())}&r=${Math.floor(Math.random() * 1000000)}&search=1`;
    const url = `${BUNNY_BASE_URL}/${latestFilename}${cacheBuster}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': `CoinBeat-Search-${Date.now()}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from Bunny CDN: ${response.statusText}`);
    }

    const allCoins = await response.json();
    
    // Create lightweight search index with only essential fields
    const searchIndex: SearchIndexItem[] = allCoins.map((coin: any) => ({
      coingecko_id: coin.coingecko_id,
      name: coin.name,
      symbol: coin.symbol,
      rank: coin.rank
    }));

    // Cache the search index
    searchIndexCache = {
      data: searchIndex,
      timestamp: now
    };

    console.log(`[SEARCH INDEX] Created search index with ${searchIndex.length} coins`);

    return NextResponse.json({
      searchIndex,
      cached: false,
      totalCount: searchIndex.length
    });
    
  } catch (error: any) {
    console.error('[SEARCH INDEX] Error:', error);
    return NextResponse.json({ 
      error: error.message,
      searchIndex: [],
      totalCount: 0
    }, { status: 500 });
  }
} 