import { supabase } from "./supabase"
import type { AuthUser } from "./supabase-auth"

export interface PortfolioItem {
  id: string
  user_id: string
  coingecko_id: string
  coin_name: string
  coin_symbol: string
  amount: number
  added_at: string
  updated_at: string
}

export async function addToPortfolio(
  user: AuthUser,
  coingeckoId: string,
  coinName: string,
  coinSymbol: string,
  amount = 1,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("user_portfolios")
      .insert({
        user_id: user.id,
        coingecko_id: coingeckoId,
        coin_name: coinName,
        coin_symbol: coinSymbol,
        amount,
      })
      .select()

    if (error) {
      console.error("Error adding to portfolio:", error, JSON.stringify(error))
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error adding to portfolio (exception):", error, JSON.stringify(error))
    return { success: false, error: "Failed to add to portfolio" }
  }
}

export async function removeFromPortfolio(
  user: AuthUser,
  coingeckoId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("user_portfolios").delete().eq("user_id", user.id).eq("coingecko_id", coingeckoId)

    if (error) {
      console.error("Error removing from portfolio:", error, JSON.stringify(error))
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error removing from portfolio (exception):", error, JSON.stringify(error))
    return { success: false, error: "Failed to remove from portfolio" }
  }
}

export async function getUserPortfolio(user: AuthUser): Promise<PortfolioItem[]> {
  try {
    const { data, error } = await supabase
      .from("user_portfolios")
      .select("*")
      .eq("user_id", user.id)
      .order("added_at", { ascending: false })

    if (error) {
      console.error("Error fetching portfolio:", error, JSON.stringify(error))
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error fetching portfolio (exception):", error, JSON.stringify(error))
    return []
  }
}

export async function isInPortfolio(user: AuthUser, coingeckoId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("user_portfolios")
      .select("id")
      .eq("user_id", user.id)
      .eq("coingecko_id", coingeckoId)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("Error checking portfolio:", error, JSON.stringify(error))
      return false
    }

    return !!data
  } catch (error) {
    console.error("Error checking portfolio (exception):", error, JSON.stringify(error))
    return false
  }
}

export async function updatePortfolioItem(
  user: AuthUser,
  coingeckoId: string,
  amount: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("user_portfolios")
      .update({
        amount,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("coingecko_id", coingeckoId)

    if (error) {
      console.error("Error updating portfolio item:", error, JSON.stringify(error))
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error updating portfolio item (exception):", error, JSON.stringify(error))
    return { success: false, error: "Failed to update portfolio item" }
  }
}
