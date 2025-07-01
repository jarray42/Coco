import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface CoinData {
  id?: number
  rank: number
  name: string
  symbol: string
  coingecko_id?: string
  price: number
  market_cap?: number
  twitter_handle?: string
  twitter_url?: string
  twitter_followers?: number
  twitter_first_tweet_date?: string
  github_url?: string
  github_stars?: number
  github_forks?: number
  github_last_updated?: string
  last_updated?: string
  price_change_24h?: number
  volume_24h?: number
  logo_url?: string
  logo_storage_path?: string
  created_at?: string
}

export async function fetchCoins(): Promise<{ coins: CoinData[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("coins")
      .select("*")
      .order("market_cap", { ascending: false })
      .limit(100)

    if (error) {
      console.error("Error fetching coins:", error)
      return { coins: [], error: error.message }
    }

    return { coins: data || [] }
  } catch (error) {
    console.error("Error in fetchCoins:", error)
    return { coins: [], error: "Failed to fetch coin data" }
  }
}

export async function fetchCoinById(id: string): Promise<{ coin: CoinData | null; error?: string }> {
  try {
    const { data, error } = await supabase.from("coins").select("*").eq("coingecko_id", id).single()

    if (error) {
      console.error("Error fetching coin:", error)
      return { coin: null, error: error.message }
    }

    return { coin: data }
  } catch (error) {
    console.error("Error in fetchCoinById:", error)
    return { coin: null, error: "Failed to fetch coin data" }
  }
}

export async function searchCoins(query: string): Promise<{ coins: CoinData[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("coins")
      .select("*")
      .or(`name.ilike.%${query}%,symbol.ilike.%${query}%`)
      .order("market_cap", { ascending: false })
      .limit(20)

    if (error) {
      console.error("Error searching coins:", error)
      return { coins: [], error: error.message }
    }

    return { coins: data || [] }
  } catch (error) {
    console.error("Error in searchCoins:", error)
    return { coins: [], error: "Failed to search coins" }
  }
}
