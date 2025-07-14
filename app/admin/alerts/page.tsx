"use client"
import { getCurrentUser } from "@/utils/supabase-auth"
import { supabase } from "@/utils/supabase"
import { useEffect, useState } from "react"

const ADMIN_EMAILS = ["jarray42@gmail.com", "jarray.ahmed42@gmail.com"]
const POOL_SIZE = 6

export default function AdminAlertsPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    getCurrentUser().then(({ user }) => {
      setUser(user)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!user || !ADMIN_EMAILS.includes(user.email)) return
    setLoading(true)
    // Fetch all alerts (pending and verified, not archived, recent)
    supabase
      .from("coin_alerts")
      .select("coin_id, alert_type, status, eggs_staked, user_id, proof_link, archived, verified_at")
      .then(({ data, error }) => {
        if (error) setError(error.message)
        if (!data) return
        // Group by coin_id + alert_type
        const groupMap: Record<string, any> = {}
        const now = new Date()
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        for (const alert of data) {
          const key = alert.coin_id + "-" + alert.alert_type
          if (!groupMap[key]) groupMap[key] = { coin_id: alert.coin_id, alert_type: alert.alert_type, alerts: [], totalEggs: 0, status: alert.status, archived: alert.archived, verified_at: alert.verified_at }
          groupMap[key].alerts.push(alert)
          groupMap[key].totalEggs += alert.eggs_staked || 0
          // If any alert is verified, set group status to verified
          if (alert.status === "verified") groupMap[key].status = "verified"
          if (alert.archived) groupMap[key].archived = true
          if (alert.verified_at) groupMap[key].verified_at = alert.verified_at
        }
        // Show:
        // 1. Pending groups: pool filled, not verified, not archived
        // 2. Verified groups: status verified, not archived, verified_at within 30 days
        const groups = Object.values(groupMap).filter((g: any) => {
          if (g.archived) return false
          if (g.status === "verified") {
            if (!g.verified_at) return false
            return new Date(g.verified_at) >= thirtyDaysAgo
          }
          // Pending: pool filled, not verified
          return g.totalEggs >= POOL_SIZE && g.status !== "verified"
        })
        setGroups(groups)
        setLoading(false)
      })
  }, [user])

  const handleVerify = async (coin_id: string, alert_type: string) => {
    setVerifying(coin_id + "-" + alert_type)
    setSuccess(null)
    setError(null)
    try {
      const res = await fetch("/api/coin-alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coin_id, alert_type }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Failed to verify")
      setSuccess("Verified and rewards distributed!")
      // Refresh groups
      window.location.reload()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setVerifying(null)
    }
  }

  const handleReject = async (coin_id: string, alert_type: string) => {
    setVerifying("reject-" + coin_id + "-" + alert_type)
    setSuccess(null)
    setError(null)
    try {
      const res = await fetch("/api/coin-alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coin_id, alert_type }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Failed to reject")
      setSuccess("Alert group rejected.")
      window.location.reload()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setVerifying(null)
    }
  }

  const handleDelete = async (coin_id: string, alert_type: string) => {
    setVerifying("delete-" + coin_id + "-" + alert_type)
    setSuccess(null)
    setError(null)
    try {
      const res = await fetch("/api/coin-alerts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coin_id, alert_type }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Failed to delete")
      setSuccess("Alert group deleted.")
      window.location.reload()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setVerifying(null)
    }
  }

  if (loading) return <div className="p-8 text-lg">Loading...</div>
  if (!user || !ADMIN_EMAILS.includes(user.email)) return <div className="p-8 text-lg text-red-600">Access denied</div>

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin Alert Verification</h1>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      {success && <div className="mb-4 text-green-700">{success}</div>}
      {groups.length === 0 ? (
        <div className="text-gray-600">No pending alert groups to verify.</div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.coin_id + group.alert_type} className="border rounded-lg p-4 bg-yellow-50">
              <div className="font-semibold text-yellow-900 mb-1">Coin: {group.coin_id}</div>
              <div className="text-sm mb-1">Alert type: <b>{group.alert_type}</b></div>
              <div className="text-sm mb-1">Stakers: {group.alerts.length} | Total eggs: {group.totalEggs}</div>
              <div className="text-xs mb-2">Proofs:
                <ul className="list-disc ml-6">
                  {group.alerts.map((a: any) => (
                    <li key={a.user_id + a.proof_link}><a href={a.proof_link} className="underline text-blue-700" target="_blank" rel="noopener noreferrer">{a.proof_link}</a></li>
                  ))}
                </ul>
              </div>
              {/* Pending: show Verify/Reject, Verified: show Delete */}
              {group.status !== "verified" ? (
                <>
                  <button
                    className="px-4 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 disabled:opacity-60"
                    onClick={() => handleVerify(group.coin_id, group.alert_type)}
                    disabled={verifying === group.coin_id + "-" + group.alert_type || verifying === "reject-" + group.coin_id + "-" + group.alert_type}
                  >
                    {verifying === group.coin_id + "-" + group.alert_type ? "Verifying..." : "Verify & Distribute Rewards"}
                  </button>
                  <button
                    className="ml-2 px-4 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700 disabled:opacity-60"
                    onClick={() => handleReject(group.coin_id, group.alert_type)}
                    disabled={verifying === group.coin_id + "-" + group.alert_type || verifying === "reject-" + group.coin_id + "-" + group.alert_type}
                  >
                    {verifying === "reject-" + group.coin_id + "-" + group.alert_type ? "Rejecting..." : "Reject"}
                  </button>
                </>
              ) : (
                <button
                  className="px-4 py-2 bg-gray-600 text-white rounded font-bold hover:bg-gray-700 disabled:opacity-60"
                  onClick={() => handleDelete(group.coin_id, group.alert_type)}
                  disabled={verifying === group.coin_id + "-" + group.alert_type || verifying === "delete-" + group.coin_id + "-" + group.alert_type}
                >
                  {verifying === "delete-" + group.coin_id + "-" + group.alert_type ? "Deleting..." : "Delete"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 