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
  const [adminAlerts, setAdminAlerts] = useState<any[]>([])
  const [coins, setCoins] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // New alert form state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedCoin, setSelectedCoin] = useState("")
  const [selectedAlertType, setSelectedAlertType] = useState("")
  const [proofLink, setProofLink] = useState("")
  const [coinSearch, setCoinSearch] = useState("")
  const [filteredCoins, setFilteredCoins] = useState<any[]>([])
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    getCurrentUser().then(({ user }) => {
      setUser(user)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!user || !ADMIN_EMAILS.includes(user.email)) return
    setLoading(true)
    
    // Fetch all data in parallel
    Promise.all([
      // Fetch user-submitted alerts
      supabase
        .from("coin_alerts")
        .select("coin_id, alert_type, status, eggs_staked, user_id, proof_link, archived, verified_at")
        .not("user_id", "is", null), // Only user-submitted alerts
      
      // Fetch admin-created alerts
      fetch("/api/admin-alerts").then(res => res.json()),
      
      // Fetch coins for selection (get more coins for better selection)
      fetch("/api/admin-coins?limit=3000").then(res => res.json())
    ]).then(([userAlertsResult, adminAlertsResult, coinsResult]) => {
      // Handle user alerts
      if (userAlertsResult.error) {
        setError(userAlertsResult.error.message)
      } else {
        const data = userAlertsResult.data
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
      }
      
      // Handle admin alerts - filter to show only alerts created by the current admin user
      if (adminAlertsResult.alerts) {
        const currentUserAlerts = adminAlertsResult.alerts.filter((alert: any) => 
          alert.user_id === user.id
        )
        setAdminAlerts(currentUserAlerts)
      }
      
      // Handle coins
      if (coinsResult.coins) {
        setCoins(coinsResult.coins)
        setFilteredCoins(coinsResult.coins)
      }
      
      setLoading(false)
    }).catch(err => {
      setError(err.message)
      setLoading(false)
    })
  }, [user])

  // Filter coins based on search
  useEffect(() => {
    if (!coinSearch.trim()) {
      setFilteredCoins(coins)
    } else {
      const filtered = coins.filter(coin => 
        coin.name.toLowerCase().includes(coinSearch.toLowerCase()) ||
        coin.symbol.toLowerCase().includes(coinSearch.toLowerCase())
      )
      setFilteredCoins(filtered)
    }
  }, [coinSearch, coins])

  // Create new admin alert
  const handleCreateAlert = async () => {
    if (!selectedCoin || !selectedAlertType || !proofLink) {
      setError("Please fill in all fields")
      return
    }

    setCreating(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch("/api/admin-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coin_id: selectedCoin,
          alert_type: selectedAlertType,
          proof_link: proofLink,
          admin_user_id: user.id
        })
      })

      const result = await res.json()
      
      if (!res.ok) {
        throw new Error(result.error || "Failed to create alert")
      }

      setSuccess(result.message)
      
      // Reset form
      setSelectedCoin("")
      setSelectedAlertType("")
      setProofLink("")
      setShowCreateForm(false)
      
      // Refresh admin alerts
      const refreshRes = await fetch("/api/admin-alerts")
      const refreshResult = await refreshRes.json()
      if (refreshResult.alerts) {
        setAdminAlerts(refreshResult.alerts)
      }
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  // Delete admin alert
  const handleDeleteAdminAlert = async (coin_id: string, alert_type: string) => {
    setVerifying("delete-admin-" + coin_id + "-" + alert_type)
    setSuccess(null)
    setError(null)

    try {
      const res = await fetch("/api/admin-alerts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coin_id, alert_type, admin_user_id: user.id })
      })

      const result = await res.json()
      
      if (!res.ok) {
        throw new Error(result.error || "Failed to delete alert")
      }

      setSuccess(result.message)
      
      // Refresh admin alerts
      const refreshRes = await fetch("/api/admin-alerts")
      const refreshResult = await refreshRes.json()
      if (refreshResult.alerts) {
        setAdminAlerts(refreshResult.alerts)
      }
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setVerifying(null)
    }
  }

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
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin Alert Management</h1>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      {success && <div className="mb-4 text-green-700">{success}</div>}
      
      {/* Create New Alert Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Create Verified Alert</h2>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700"
          >
            {showCreateForm ? "Cancel" : "Create New Alert"}
          </button>
        </div>
        
        {showCreateForm && (
          <div className="border rounded-lg p-6 bg-blue-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Coin Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Select Coin</label>
                <input
                  type="text"
                  placeholder="Search coins..."
                  value={coinSearch}
                  onChange={(e) => setCoinSearch(e.target.value)}
                  className="w-full p-2 border rounded"
                />
                <div className="mt-2 max-h-60 overflow-y-auto border rounded">
                  {filteredCoins.length === 0 ? (
                    <div className="p-2 text-gray-500 text-sm">No coins found</div>
                  ) : (
                    filteredCoins.map((coin) => (
                      <div
                        key={coin.id}
                        onClick={() => setSelectedCoin(coin.id)}
                        className={`p-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0 ${
                          selectedCoin === coin.id ? "bg-blue-100" : ""
                        }`}
                      >
                        <div className="font-medium">{coin.name}</div>
                        <div className="text-sm text-gray-600">{coin.symbol} • ${(coin.market_cap || 0).toLocaleString()}</div>
                      </div>
                    ))
                  )}
                </div>
                {selectedCoin && (
                  <div className="mt-2 text-sm text-green-600">
                    Selected: {coins.find(c => c.id === selectedCoin)?.name}
                  </div>
                )}
              </div>
              
              {/* Alert Type Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Alert Type</label>
                <select
                  value={selectedAlertType}
                  onChange={(e) => setSelectedAlertType(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select alert type...</option>
                  <option value="migration">Migration</option>
                  <option value="delisting">Delisting</option>
                  <option value="rebrand">Rebrand</option>
                </select>
              </div>
            </div>
            
            {/* Proof Link */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Proof Link</label>
              <input
                type="url"
                placeholder="https://..."
                value={proofLink}
                onChange={(e) => setProofLink(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <button
              onClick={handleCreateAlert}
              disabled={creating || !selectedCoin || !selectedAlertType || !proofLink}
              className="px-6 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 disabled:opacity-60"
            >
              {creating ? "Creating..." : "Create Verified Alert"}
            </button>
          </div>
        )}
      </div>

      {/* Admin-Created Alerts Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Admin-Created Alerts</h2>
        {adminAlerts.length === 0 ? (
          <div className="text-gray-600">No admin-created alerts.</div>
        ) : (
          <div className="space-y-4">
            {adminAlerts.map((alert) => (
              <div key={alert.id} className="border rounded-lg p-4 bg-green-50">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-green-900 mb-1">Coin: {alert.coin_id}</div>
                    <div className="text-sm mb-1">Alert type: <b>{alert.alert_type}</b></div>
                    <div className="text-xs mb-2">
                      <a href={alert.proof_link} className="underline text-blue-700" target="_blank" rel="noopener noreferrer">
                        {alert.proof_link}
                      </a>
                    </div>
                    <div className="text-xs text-gray-600">
                      Created: {new Date(alert.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteAdminAlert(alert.coin_id, alert.alert_type)}
                    disabled={verifying === "delete-admin-" + alert.coin_id + "-" + alert.alert_type}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-60"
                  >
                    {verifying === "delete-admin-" + alert.coin_id + "-" + alert.alert_type ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User-Submitted Alerts Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">User-Submitted Alerts</h2>
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
    </div>
  )
} 