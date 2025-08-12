"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabaseAuth } from "../../../utils/supabase-auth"
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import { getUserQuota } from '../../../utils/quota-manager'

export default function AuthCallback() {
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const handleAuthCallback = async () => {
      // 1. Check if user is already authenticated (OAuth, Google, etc.)
      const { data: { user } } = await supabaseAuth.auth.getUser()
      if (user) {
        // Map Supabase user to AuthUser type
        const authUser = {
          id: user.id,
          email: user.email || '',
          email_confirmed_at: user.email_confirmed_at,
          user_metadata: user.user_metadata,
        }
        // Ensure user_ai_usage is created for new Google signups
        await getUserQuota(authUser)
        setStatus("success")
        setMessage("Login successful! Redirecting...")
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: "smooth" })
          router.push("/")
        }, 2000)
        return
      }

      // 2. Fallback: handle email confirmation via hash
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get("access_token")
        const refreshToken = hashParams.get("refresh_token")
        const type = hashParams.get("type")

        if (type === "signup" && accessToken && refreshToken) {
          const { data, error } = await supabaseAuth.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (error) {
            setStatus("error")
            setMessage("Failed to confirm email. Please try again.")
          } else if (data.user) {
            setStatus("success")
            setMessage("Email confirmed successfully! Redirecting...")
            setTimeout(() => {
              window.scrollTo({ top: 0, behavior: "smooth" })
              router.push("/")
            }, 2000)
          }
        } else {
          setStatus("error")
          setMessage("Invalid confirmation link or authentication failed.")
        }
      } catch (error) {
        setStatus("error")
        setMessage("An error occurred during confirmation.")
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-8 text-center border border-sky-200/50">
          {status === "loading" && (
            <>
              <Loader2 className="w-12 h-12 mx-auto mb-4 text-sky-600 animate-spin" />
              <h1 className="text-xl font-bold text-slate-900 mb-2">Confirming your email...</h1>
              <p className="text-slate-600">Please wait while we verify your account.</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-emerald-600" />
              <h1 className="text-xl font-bold text-slate-900 mb-2">Email Confirmed!</h1>
              <p className="text-slate-600 mb-4">{message}</p>
              <div className="w-full bg-emerald-200 rounded-full h-2">
                <div className="bg-emerald-600 h-2 rounded-full animate-pulse" style={{ width: "100%" }}></div>
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="w-12 h-12 mx-auto mb-4 text-red-600" />
              <h1 className="text-xl font-bold text-slate-900 mb-2">Confirmation Failed</h1>
              <p className="text-slate-600 mb-6">{message}</p>
              <button
                onClick={() => router.push("/")}
                className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300"
              >
                Return to Dashboard
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
