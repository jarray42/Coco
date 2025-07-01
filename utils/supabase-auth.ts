import { supabase } from "./supabase"

// Use the same supabase client for authentication
export const supabaseAuth = supabase

export type AuthUser = {
  id: string
  email: string
  email_confirmed_at?: string
  user_metadata?: {
    full_name?: string
    avatar_url?: string
  }
}

// Sign up with email and password
export async function signUp(email: string, password: string, fullName?: string) {
  const { data, error } = await supabaseAuth.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })

  return { data, error }
}

// Sign in with email and password
export async function signIn(email: string, password: string) {
  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email,
    password,
  })

  return { data, error }
}

// Sign in with Google OAuth
export async function signInWithGoogle() {
  const { data, error } = await supabaseAuth.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })

  return { data, error }
}

// Sign out
export async function signOut() {
  const { error } = await supabaseAuth.auth.signOut()
  return { error }
}

// Get current user
export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabaseAuth.auth.getUser()
  return { user, error }
}

// Listen to auth state changes
export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  return supabaseAuth.auth.onAuthStateChange((event, session) => {
    console.log("Auth state change:", event, session?.user?.email)
    callback(session?.user as AuthUser | null)
  })
}

// Resend confirmation email
export async function resendConfirmation(email: string) {
  const { data, error } = await supabaseAuth.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })

  return { data, error }
}
