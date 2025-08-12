import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/utils/supabase"

// Force dynamic rendering - prevent static analysis during build
export const dynamic = 'force-dynamic'


export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const coin_id = searchParams.get('coin_id')
    
    if (!coin_id) {
      return NextResponse.json({ error: "coin_id parameter is required" }, { status: 400 })
    }

    // Get all alerts for this coin
    const { data, error } = await supabase
      .from("coin_alerts")
      .select("id, coin_id, alert_type, user_id, status, archived, created_at, verified_at")
      .eq("coin_id", coin_id)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by alert_type
    const alertsByType: Record<string, any[]> = {}
    data?.forEach(alert => {
      if (!alertsByType[alert.alert_type]) {
        alertsByType[alert.alert_type] = []
      }
      alertsByType[alert.alert_type].push(alert)
    })

    return NextResponse.json({
      coin_id,
      total_alerts: data?.length || 0,
      alerts_by_type: alertsByType,
      all_alerts: data || []
    })

  } catch (err: any) {
    console.error("Error in debug coin alerts API:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
} 