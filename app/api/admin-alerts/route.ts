import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/utils/supabase"

// Admin emails that can create admin alerts
const ADMIN_EMAILS = ["jarray42@gmail.com", "jarray.ahmed42@gmail.com"]

// Helper function to check if a user is an admin
function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email)
}

// POST: Admin creates a verified alert for a coin
export async function POST(req: NextRequest) {
  try {
    const { coin_id, alert_type, proof_link, admin_user_id } = await req.json()
    
    // Validate admin user ID
    if (!admin_user_id) {
      return NextResponse.json({ error: "Admin user ID is required" }, { status: 400 })
    }
    
    if (!coin_id || !alert_type || !proof_link) {
      return NextResponse.json({ error: "Missing required fields: coin_id, alert_type, proof_link" }, { status: 400 })
    }

    // Validate alert_type
    const validTypes = ['migration', 'delisting', 'rebrand']
    if (!validTypes.includes(alert_type)) {
      return NextResponse.json({ error: "Invalid alert_type. Must be one of: migration, delisting, rebrand" }, { status: 400 })
    }

    // Check if this admin alert already exists (verified or pending)
    const { data: existing, error: checkError } = await supabase
      .from("coin_alerts")
      .select("id, status")
      .eq("coin_id", coin_id)
      .eq("alert_type", alert_type)
      .eq("user_id", admin_user_id) // Admin-created alerts
      .eq("archived", false)
      .maybeSingle()

    if (checkError) {
      console.error("Check error:", checkError)
      return NextResponse.json({ error: checkError.message }, { status: 500 })
    }

    if (existing) {
      return NextResponse.json({ error: `Alert for ${coin_id} (${alert_type}) already exists with status: ${existing.status}` }, { status: 409 })
    }

    // Also check if there are any user-created alerts for this coin/type to avoid conflicts
    const { data: userAlerts, error: userCheckError } = await supabase
      .from("coin_alerts")
      .select("id, status")
      .eq("coin_id", coin_id)
      .eq("alert_type", alert_type)
      .not("user_id", "is", null) // User-created alerts
      .eq("archived", false)

    if (userCheckError) {
      console.error("User check error:", userCheckError)
      return NextResponse.json({ error: userCheckError.message }, { status: 500 })
    }

    console.log("Found user alerts for this coin/type:", userAlerts)

    // Create the verified alert (admin-created with admin user_id)
    console.log("Attempting to insert admin alert:", { coin_id, alert_type, proof_link, admin_user_id })
    
    const { data: insertData, error: insertError } = await supabase
      .from("coin_alerts")
      .insert({
        user_id: admin_user_id, // Use the actual admin user ID
        coin_id,
        alert_type,
        proof_link,
        status: "verified",
        verified_at: new Date().toISOString(),
        eggs_staked: 0, // Admin alerts don't stake eggs
        archived: false
      })
      .select()

    if (insertError) {
      console.error("Insert error:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    console.log("Successfully inserted admin alert:", insertData)

    return NextResponse.json({ 
      success: true, 
      message: `Verified alert created for ${coin_id} (${alert_type})` 
    }, { status: 201 })

  } catch (err: any) {
    console.error("Error creating admin alert:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET: Get all admin-created verified alerts
export async function GET(req: NextRequest) {
  try {
    // For now, we'll get all verified alerts and filter them on the frontend
    // The admin page will filter to show only admin-created alerts
    const { data, error } = await supabase
      .from("coin_alerts")
      .select("id, coin_id, alert_type, proof_link, created_at, verified_at, user_id")
      .eq("status", "verified")
      .eq("archived", false)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Filter to only include admin-created alerts (those with admin user IDs)
    // We'll need to check this on the frontend since we can't query auth.users here
    return NextResponse.json({ alerts: data || [] })

  } catch (err: any) {
    console.error("Error fetching admin alerts:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE: Admin deletes a verified alert
export async function DELETE(req: NextRequest) {
  try {
    const { coin_id, alert_type, admin_user_id } = await req.json()
    
    if (!coin_id || !alert_type || !admin_user_id) {
      return NextResponse.json({ error: "Missing required fields: coin_id, alert_type, admin_user_id" }, { status: 400 })
    }

    // Check what other alerts exist for this coin before deleting
    const { data: otherAlerts, error: checkError } = await supabase
      .from("coin_alerts")
      .select("id, user_id, status, alert_type")
      .eq("coin_id", coin_id)
      .eq("alert_type", alert_type)
      .eq("status", "verified")
      .eq("archived", false)

    if (checkError) {
      console.error("Error checking other alerts:", checkError)
    } else {
      console.log(`Found ${otherAlerts?.length || 0} verified alerts for ${coin_id} (${alert_type}):`, otherAlerts)
    }

    // Delete the admin-created alert
    const { error } = await supabase
      .from("coin_alerts")
      .delete()
      .eq("coin_id", coin_id)
      .eq("alert_type", alert_type)
      .eq("user_id", admin_user_id) // Only delete admin-created alerts

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Check what alerts remain after deletion
    const { data: remainingAlerts, error: remainingError } = await supabase
      .from("coin_alerts")
      .select("id, user_id, status, alert_type")
      .eq("coin_id", coin_id)
      .eq("alert_type", alert_type)
      .eq("status", "verified")
      .eq("archived", false)

    if (remainingError) {
      console.error("Error checking remaining alerts:", remainingError)
    } else {
      console.log(`Remaining verified alerts for ${coin_id} (${alert_type}):`, remainingAlerts)
    }

    return NextResponse.json({ 
      success: true, 
      message: `Alert deleted for ${coin_id} (${alert_type})` 
    })

  } catch (err: any) {
    console.error("Error deleting admin alert:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
} 