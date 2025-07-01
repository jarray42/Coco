"use client"

import { useState, useEffect } from "react"
import { supabase } from "../utils/supabase"
import type { User } from "@supabase/supabase-js"

interface UserProfile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  subscription_tier?: string
  created_at?: string
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()
        if (error) {
          console.error("Error getting session:", error)
          setError(error.message)
        } else {
          setUser(session?.user ?? null)
          if (session?.user) {
            await fetchUserProfile(session.user.id)
          }
        }
      } catch (err) {
        console.error("Error in getInitialSession:", err)
        setError("Failed to get user session")
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.email)
      setUser(session?.user ?? null)

      if (session?.user) {
        await fetchUserProfile(session.user.id)
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", error)
        setError(error.message)
      } else {
        setProfile(data)
      }
    } catch (err) {
      console.error("Error in fetchUserProfile:", err)
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error("Error signing out:", error)
        setError(error.message)
      }
    } catch (err) {
      console.error("Error in signOut:", err)
      setError("Failed to sign out")
    }
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: "No user logged in" }

    try {
      const { data, error } = await supabase.from("profiles").update(updates).eq("id", user.id).select().single()

      if (error) {
        console.error("Error updating profile:", error)
        setError(error.message)
        return { error: error.message }
      }

      setProfile(data)
      return { data }
    } catch (err) {
      console.error("Error in updateProfile:", err)
      const errorMessage = "Failed to update profile"
      setError(errorMessage)
      return { error: errorMessage }
    }
  }

  return {
    user,
    profile,
    loading,
    error,
    signOut,
    updateProfile,
    isAuthenticated: !!user,
  }
}
