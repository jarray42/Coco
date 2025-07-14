import { supabase } from "./supabase"
import type { AuthUser } from "./supabase-auth"

export interface UserQuota {
  id: string
  user_id: string
  tokens_used: number
  monthly_limit: number
  billing_plan: string
  created_at: string
  updated_at: string
  eggs: number
}

export async function getUserQuota(user: AuthUser): Promise<UserQuota | null> {
  try {
    const { data, error } = await supabase.from("user_ai_usage").select("*").eq("user_id", user.id).single()

    if (error) {
      if (error.code === "PGRST116") {
        // No record found, create one
        return await createUserQuota(user)
      }
      console.error("Error fetching user quota:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error in getUserQuota:", error)
    return null
  }
}

export async function createUserQuota(user: AuthUser): Promise<UserQuota | null> {
  try {
    const { data, error } = await supabase
      .from("user_ai_usage")
      .insert({
        user_id: user.id,
        tokens_used: 0,
        monthly_limit: 20, // Free tier limit
        billing_plan: "free",
        eggs: 10,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating user quota:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error in createUserQuota:", error)
    return null
  }
}

export async function checkQuotaLimit(
  user: AuthUser,
  tokensNeeded: number,
): Promise<{ canProceed: boolean; remainingTokens: number; quota?: UserQuota }> {
  try {
    const quota = await getUserQuota(user)

    if (!quota) {
      return { canProceed: false, remainingTokens: 0 }
    }

    const remainingTokens = quota.monthly_limit - quota.tokens_used
    const canProceed = remainingTokens >= tokensNeeded

    return {
      canProceed,
      remainingTokens,
      quota,
    }
  } catch (error) {
    console.error("Error checking quota limit:", error)
    return { canProceed: false, remainingTokens: 0 }
  }
}

export async function incrementTokenUsage(user: AuthUser, tokensUsed: number): Promise<boolean> {
  try {
    console.log(`Incrementing token usage for user ${user.id} by ${tokensUsed} tokens`)

    const { error } = await supabase.rpc("increment_token_usage", {
      p_user_id: user.id,
      p_tokens_used: tokensUsed,
    })

    if (error) {
      console.error("Error incrementing token usage:", error)
      return false
    }

    console.log("Token usage incremented successfully")
    return true
  } catch (error) {
    console.error("Error in incrementTokenUsage:", error)
    return false
  }
}

export function getTokenEstimate(analysisType: "basic" | "detailed" | "chat"): number {
  switch (analysisType) {
    case "basic":
      return 1
    case "detailed":
      return 2
    case "chat":
      return 1
    default:
      return 1
  }
}
