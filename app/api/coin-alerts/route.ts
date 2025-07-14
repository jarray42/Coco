import { NextRequest } from "next/server"
import { supabase } from "@/utils/supabase"
import { getUserQuota } from "@/utils/quota-manager"

export const runtime = "edge"

// POST: Submit or update an alert
export async function POST(req: NextRequest) {
  try {
    const { user_id, coin_id, alert_type, proof_link } = await req.json()
    if (!user_id || !coin_id || !alert_type) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 })
    }
    // Check if user already submitted this alert (only non-archived)
    const { data: existing, error: fetchError } = await supabase
      .from("coin_alerts")
      .select("id, eggs_staked, archived")
      .eq("user_id", user_id)
      .eq("coin_id", coin_id)
      .eq("alert_type", alert_type)
      .eq("archived", false)
      .maybeSingle()
    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 })
    }
    // Check user quota (eggs)
    const quota = await getUserQuota({ id: user_id, email: "dummy@user.com" })
    if (!quota || quota.eggs < 2) {
      return new Response(JSON.stringify({ error: "Not enough eggs" }), { status: 403 })
    }
    let result
    if (existing) {
      // Already exists: update proof_link if changed
      const { error: updateError } = await supabase
        .from("coin_alerts")
        .update({ proof_link })
        .eq("id", existing.id)
      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), { status: 500 })
      }
      result = { updated: true }
    } else {
      // New alert: insert and deduct eggs
      const { error: insertError } = await supabase
        .from("coin_alerts")
        .insert({
          user_id,
          coin_id,
          alert_type,
          proof_link,
          eggs_staked: 2,
        })
      if (insertError) {
        return new Response(JSON.stringify({ error: insertError.message }), { status: 500 })
      }
      // Deduct eggs directly in user_ai_usage
      await supabase
        .from("user_ai_usage")
        .update({ eggs: quota.eggs - 2 })
        .eq("user_id", user_id)
      result = { created: true }
    }
    return new Response(JSON.stringify(result), { status: 200 })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}

// GET: Get all alerts for a coin and alert_type, or all verified alerts for a coin
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const coin_id = searchParams.get("coin_id")
    const alert_type = searchParams.get("alert_type")
    const status = searchParams.get("status")

    if (!coin_id) {
      return new Response(JSON.stringify({ error: "Missing coin_id" }), { status: 400 })
    }

    let query = supabase
      .from("coin_alerts")
      .select("id, user_id, proof_link, eggs_staked, created_at, status, alert_type, archived, verified_at")
      .eq("coin_id", coin_id)
      .eq("archived", false)

    if (alert_type) query = query.eq("alert_type", alert_type)
    if (status) {
      query = query.eq("status", status)
      if (status === "verified") {
        // Only show alerts verified in the last 30 days and not archived
        const now = new Date()
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        query = query.gte("verified_at", thirtyDaysAgo.toISOString()).eq("archived", false)
      }
    }

    const { data, error } = await query

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    // If alert_type is provided, return pool info as before
    if (alert_type) {
      // Only count alerts that are pending (archived already filtered above)
      const pendingAlerts = (data || []).filter((a: any) => a.status === 'pending')
      const totalEggs = pendingAlerts.reduce((sum: number, a: { eggs_staked?: number }) => sum + (a.eggs_staked || 0), 0)
      const poolFilled = totalEggs >= 20 // or your POOL_SIZE
      return new Response(JSON.stringify({ alerts: pendingAlerts, totalEggs, poolFilled }), { status: 200 })
    }

    // Otherwise, just return the alerts (for status=verified)
    return new Response(JSON.stringify({ alerts: data }), { status: 200 })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}

// POST /api/coin-alerts/verify: Verify and reward a filled pool
export async function PUT(req: NextRequest) {
  try {
    const { coin_id, alert_type } = await req.json()
    if (!coin_id || !alert_type) {
      return new Response(JSON.stringify({ error: "Missing coin_id or alert_type" }), { status: 400 })
    }
    // Pool size (should match frontend)
    const POOL_SIZE = 6
    // Get all alerts for this group
    const { data: alerts, error } = await supabase
      .from("coin_alerts")
      .select("id, user_id, eggs_staked, status")
      .eq("coin_id", coin_id)
      .eq("alert_type", alert_type)
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
    if (!alerts || alerts.length === 0) {
      return new Response(JSON.stringify({ error: "No alerts found for this group" }), { status: 404 })
    }
    const totalEggs = alerts.reduce((sum, a) => sum + (a.eggs_staked || 0), 0)
    if (totalEggs < POOL_SIZE) {
      return new Response(JSON.stringify({ error: "Pool not filled yet" }), { status: 400 })
    }
    // Only reward if not already verified
    if (alerts.some(a => a.status === "verified")) {
      return new Response(JSON.stringify({ error: "Already verified" }), { status: 400 })
    }
    // Double eggs for all stakers
    let rewards = []
    for (const alert of alerts) {
      // Update user_ai_usage: add eggs_staked*2 to current eggs
      const { data: quota, error: quotaErr } = await supabase
        .from("user_ai_usage")
        .select("eggs")
        .eq("user_id", alert.user_id)
        .single()
      if (quotaErr || !quota) continue
      const newEggs = quota.eggs + alert.eggs_staked * 2
      await supabase
        .from("user_ai_usage")
        .update({ eggs: newEggs })
        .eq("user_id", alert.user_id)
      // Mark alert as verified (do NOT archive here)
      await supabase
        .from("coin_alerts")
        .update({ status: "verified", verified_at: new Date().toISOString() })
        .eq("id", alert.id)
      // Insert notification
      await supabase
        .from("user_notifications")
        .insert({
          user_id: alert.user_id,
          type: "alert_verified",
          message: `Your alert for coin ${coin_id} (${alert_type}) was verified! You received double eggs as a reward.`,
          created_at: new Date().toISOString(),
          read: false,
        })
      rewards.push({ user_id: alert.user_id, eggs_awarded: alert.eggs_staked * 2 })
    }
    // Do NOT archive here. Only archive via DELETE or scheduled job.
    return new Response(JSON.stringify({ ok: true, rewards }), { status: 200 })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}

// PATCH /api/coin-alerts: Reject a filled pool
export async function PATCH(req: NextRequest) {
  try {
    const { coin_id, alert_type } = await req.json()
    if (!coin_id || !alert_type) {
      return new Response(JSON.stringify({ error: "Missing coin_id or alert_type" }), { status: 400 })
    }
    // Get all alerts for this group
    const { data: alerts, error } = await supabase
      .from("coin_alerts")
      .select("id, user_id, eggs_staked, status")
      .eq("coin_id", coin_id)
      .eq("alert_type", alert_type)
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
    if (!alerts || alerts.length === 0) {
      return new Response(JSON.stringify({ error: "No alerts found for this group" }), { status: 404 })
    }
    // Only reject if not already verified or rejected
    if (alerts.some(a => a.status === "verified" || a.status === "rejected")) {
      return new Response(JSON.stringify({ error: "Already verified or rejected" }), { status: 400 })
    }
    // Mark all as rejected, archived, and notify users
    let notifications = []
    for (const alert of alerts) {
      await supabase
        .from("coin_alerts")
        .update({ status: "rejected", archived: true })
        .eq("id", alert.id)
      // Insert notification (no refund)
      await supabase
        .from("user_notifications")
        .insert({
          user_id: alert.user_id,
          type: "alert_rejected",
          message: `Your alert for coin ${coin_id} (${alert_type}) was rejected. Eggs staked are not refunded.`,
          created_at: new Date().toISOString(),
          read: false,
        })
      notifications.push(alert.user_id)
    }
    return new Response(JSON.stringify({ ok: true, notifications }), { status: 200 })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}

// Add DELETE handler for admin to delete all alerts for a coin/alert_type
export async function DELETE(req: NextRequest) {
  try {
    const { coin_id, alert_type } = await req.json()
    if (!coin_id || !alert_type) {
      return new Response(JSON.stringify({ error: "Missing coin_id or alert_type" }), { status: 400 })
    }
    const { error } = await supabase
      .from("coin_alerts")
      .delete()
      .eq("coin_id", coin_id)
      .eq("alert_type", alert_type)
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
} 