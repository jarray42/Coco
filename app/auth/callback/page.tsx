"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabaseAuth } from "../../../utils/supabase-auth"
import { Loader2, CheckCircle, XCircle } from "lucide-react"

export default function AuthCallback() {
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the URL hash parameters
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get("access_token")
        const refreshToken = hashParams.get("refresh_token")
        const type = hashParams.get("type")

        if (type === "signup" && accessToken && refreshToken) {
          // Set the session with the tokens
          const { data, error } = await supabaseAuth.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (error) {
            console.error("Error setting session:", error)
            setStatus("error")
            setMessage("Failed to confirm email. Please try again.")
          } else if (data.user) {
            setStatus("success")
            setMessage("Email confirmed successfully! Redirecting...")
            // Redirect to dashboard after a short delay and scroll to top
            setTimeout(() => {
              window.scrollTo({ top: 0, behavior: "smooth" })
              router.push("/")
            }, 2000)
          }
        } else {
          // Handle other auth flows or errors
          setStatus("error")
          setMessage("Invalid confirmation link.")
        }
      } catch (error) {
        console.error("Auth callback error:", error)
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
