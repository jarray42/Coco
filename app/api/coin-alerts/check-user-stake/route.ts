import { NextRequest } from "next/server"
import { supabase } from "@/utils/supabase"

// Force dynamic rendering - prevent static analysis during build
export const dynamic = 'force-dynamic'


export const runtime = "edge"

// GET: Check if user has staked on a specific coin
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const coin_id = searchParams.get("coin_id")
    const user_id = searchParams.get("user_id")

    if (!coin_id || !user_id) {
      return new Response(JSON.stringify({ error: "Missing coin_id or user_id" }), { status: 400 })
    }

    // Check if user has any pending alerts for this coin
    const { data, error } = await supabase
      .from("coin_alerts")
      .select("id, alert_type, status, created_at")
      .eq("user_id", user_id)
      .eq("coin_id", coin_id)
      .eq("archived", false)
      .eq("status", "pending")

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    const hasStaked = data && data.length > 0

    return new Response(JSON.stringify({ 
      hasStaked,
      alerts: data || []
    }), { status: 200 })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
} 