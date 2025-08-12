"use client"

import type React from "react"
import { supabaseAuth } from "../utils/supabase-auth" // Declare the variable here
import dynamic from 'next/dynamic'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, EyeOff, Mail, Lock, User, Loader2, CheckCircle, RefreshCw } from "lucide-react"
import { signIn, signUp, resendConfirmation } from "../utils/supabase-auth"
import Image from "next/image"

// Dynamically import Auth UI to prevent SSR issues
const Auth = dynamic(() => import('@supabase/auth-ui-react').then(mod => mod.Auth), {
  ssr: false,
  loading: () => <div className="p-4 text-center">Loading authentication...</div>
})

interface AuthModalProps {
  isDarkMode: boolean
  onAuthSuccess: () => void
  triggerButton?: React.ReactNode
}

export function AuthModal({ isDarkMode, onAuthSuccess, triggerButton }: AuthModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form states
  const [signInData, setSignInData] = useState({ email: "", password: "" })
  const [signUpData, setSignUpData] = useState({ email: "", password: "", fullName: "", confirmPassword: "" })

  // Handle auth state change from Supabase Auth UI
  const handleAuthStateChange = (event: string, session: any) => {
    if (event === 'SIGNED_IN' && session?.user) {
      setIsOpen(false)
      onAuthSuccess()
      setSuccess("Successfully signed in!")
      
      // Scroll to top after successful login
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" })
      }, 100)
    }
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError(null)

    try {
      // Using Supabase Google OAuth with proper redirect
      const { data, error } = await supabaseAuth.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      })

      if (error) {
        console.error("Google OAuth error:", error)
        setError(error.message)
        setGoogleLoading(false)
      }
      // Note: Don't set loading to false here as redirect will happen
    } catch (err) {
      console.error("Google sign-in error:", err)
      setError("Failed to sign in with Google")
      setGoogleLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { data, error } = await signIn(signInData.email, signInData.password)

      if (error) {
        if (error.message.includes("Email not confirmed")) {
          setError("Please check your email and click the confirmation link before signing in.")
        } else {
          setError(error.message)
        }
      } else if (data.user) {
        setIsOpen(false)
        onAuthSuccess()
        setSignInData({ email: "", password: "" })
        setSuccess("Successfully signed in!")

        // Scroll to top after successful login
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: "smooth" })
        }, 100)
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (signUpData.password !== signUpData.confirmPassword) {
      setError("Passwords don't match")
      setLoading(false)
      return
    }

    if (signUpData.password.length < 6) {
      setError("Password must be at least 6 characters")
      setLoading(false)
      return
    }

    try {
      const { data, error } = await signUp(signUpData.email, signUpData.password, signUpData.fullName)

      if (error) {
        setError(error.message)
      } else if (data.user) {
        setSuccess(
          "Account created! Please check your email and click the confirmation link to complete your registration.",
        )
        setSignUpData({ email: "", password: "", fullName: "", confirmPassword: "" })
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    if (!signUpData.email && !signInData.email) {
      setError("Please enter your email address first")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const email = signUpData.email || signInData.email
      const { error } = await resendConfirmation(email)

      if (error) {
        setError(error.message)
      } else {
        setSuccess("Confirmation email sent! Please check your inbox.")
      }
    } catch (err) {
      setError("Failed to resend confirmation email")
    } finally {
      setLoading(false)
    }
  }

  const modalClass = isDarkMode
    ? "bg-slate-800/95 border-slate-700/50 backdrop-blur-md"
    : "bg-white/95 border-sky-200/50 backdrop-blur-md"

  const inputClass = isDarkMode
    ? "bg-slate-700/50 border-slate-600/50 text-slate-100 placeholder:text-slate-400 focus:border-blue-400"
    : "bg-white/80 border-sky-200/50 text-slate-900 placeholder:text-slate-500 focus:border-sky-400"

  const defaultTrigger = (
    <Button
      variant="outline"
      className={`h-10 px-3 rounded-xl transition-all duration-300 backdrop-blur-md shadow-lg border-0 ${
        isDarkMode
          ? "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70 hover:text-slate-100 hover:scale-105"
          : "bg-white/80 text-slate-700 hover:bg-white/90 hover:text-slate-900 hover:scale-105"
      }`}
    >
      <img src="/no_bg_image.ico" alt="Login" className="w-5 h-5 mr-2" />
      <span className="hidden sm:inline text-sm">Sign In</span>
    </Button>
  )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{triggerButton || defaultTrigger}</DialogTrigger>

      <DialogContent className={`sm:max-w-md max-h-[90vh] overflow-y-auto p-6 rounded-2xl border-0 shadow-2xl ${modalClass} relative overflow-hidden`}>
        <DialogHeader>
          <DialogTitle className="text-center mb-4">
            <div className="flex items-center justify-center gap-4">
              <Image
                src="/welcome-chick.png"
                alt="Welcome chick"
                width={64}
                height={64}
                className="opacity-90 animate-bounce drop-shadow-lg"
                style={{ animationDuration: "3s" }}
              />
              <span className={`text-xl font-bold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>Welcome!</span>
            </div>
          </DialogTitle>
          <p className={`text-center text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Join the Cocoricoin community</p>
        </DialogHeader>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList
              className={`grid w-full grid-cols-3 rounded-xl ${isDarkMode ? "bg-slate-700/50" : "bg-slate-100/80"}`}
            >
              <TabsTrigger value="signin" className="rounded-lg text-sm">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg text-sm">
                Sign Up
              </TabsTrigger>
              <TabsTrigger value="quick" className="rounded-lg text-sm">
                Quick Sign In
              </TabsTrigger>
            </TabsList>

            {error && (
              <div
                className={`p-3 rounded-xl text-sm ${
                  isDarkMode ? "bg-red-900/30 text-red-300" : "bg-red-100 text-red-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{error}</span>
                  {error.includes("Email not confirmed") && (
                    <Button
                      onClick={handleResendConfirmation}
                      disabled={loading}
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1 text-xs underline"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Resend
                    </Button>
                  )}
                </div>
              </div>
            )}

            {success && (
              <div
                className={`p-3 rounded-xl text-sm flex items-center gap-2 ${
                  isDarkMode ? "bg-green-900/30 text-green-300" : "bg-green-100 text-green-700"
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                {success}
              </div>
            )}

            <TabsContent value="signin" className="space-y-3">
              {/* Google Sign In Button */}
              <Button
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className={`w-full h-12 rounded-xl font-semibold transition-all duration-300 border ${
                  isDarkMode
                    ? "bg-white hover:bg-gray-50 text-gray-900 border-gray-300"
                    : "bg-white hover:bg-gray-50 text-gray-900 border-gray-300"
                }`}
              >
                {googleLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in with Google...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div
                    className={`w-full h-px bg-gradient-to-r ${
                      isDarkMode
                        ? "from-transparent via-slate-600/50 to-transparent"
                        : "from-transparent via-gray-300/50 to-transparent"
                    }`}
                  />
                </div>
                <div className="relative flex justify-center">
                  <div
                    className={`px-4 py-1 rounded-full backdrop-blur-sm border ${
                      isDarkMode
                        ? "bg-slate-800/80 border-slate-700/50 text-slate-400"
                        : "bg-white/80 border-gray-200/50 text-gray-500"
                    }`}
                  >
                    <span className="text-xs font-medium tracking-wide">Or continue with email</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSignIn} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className={`${isDarkMode ? "text-slate-300" : "text-slate-700"} text-sm`}>
                    Email
                  </Label>
                  <div className="relative">
                    <Mail
                      className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                    />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="Enter your email"
                      value={signInData.email}
                      onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                      className={`pl-10 h-10 rounded-xl ${inputClass}`}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="signin-password"
                    className={`${isDarkMode ? "text-slate-300" : "text-slate-700"} text-sm`}
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Lock
                      className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                    />
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={signInData.password}
                      onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                      className={`pl-10 pr-10 h-10 rounded-xl ${inputClass}`}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>

                {/* Add extra margin below password field to move the sign-in button up */}
                <div className="mt-4"></div>

                <Button
                  type="submit"
                  disabled={loading || googleLoading}
                  className={`w-full h-10 rounded-xl font-semibold transition-all duration-300 ${
                    isDarkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-sky-600 hover:bg-sky-700 text-white"
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-3">
              {/* Google Sign Up Button */}
              <Button
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className={`w-full h-12 rounded-xl font-semibold transition-all duration-300 border ${
                  isDarkMode
                    ? "bg-white hover:bg-gray-50 text-gray-900 border-gray-300"
                    : "bg-white hover:bg-gray-50 text-gray-900 border-gray-300"
                }`}
              >
                {googleLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing up with Google...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Sign up with Google
                  </>
                )}
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div
                    className={`w-full h-px bg-gradient-to-r ${
                      isDarkMode
                        ? "from-transparent via-slate-600/50 to-transparent"
                        : "from-transparent via-gray-300/50 to-transparent"
                    }`}
                  />
                </div>
                <div className="relative flex justify-center">
                  <div
                    className={`px-4 py-1 rounded-full backdrop-blur-sm border ${
                      isDarkMode
                        ? "bg-slate-800/80 border-slate-700/50 text-slate-400"
                        : "bg-white/80 border-gray-200/50 text-gray-500"
                    }`}
                  >
                    <span className="text-xs font-medium tracking-wide">Or sign up with email</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSignUp} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className={`${isDarkMode ? "text-slate-300" : "text-slate-700"} text-sm`}>
                    Full Name
                  </Label>
                  <div className="relative">
                    <User
                      className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                    />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Enter your full name"
                      value={signUpData.fullName}
                      onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                      className={`pl-10 h-10 rounded-xl ${inputClass}`}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email" className={`${isDarkMode ? "text-slate-300" : "text-slate-700"} text-sm`}>
                    Email
                  </Label>
                  <div className="relative">
                    <Mail
                      className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                    />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                      className={`pl-10 h-10 rounded-xl ${inputClass}`}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="signup-password"
                    className={`${isDarkMode ? "text-slate-300" : "text-slate-700"} text-sm`}
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Lock
                      className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                    />
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={signUpData.password}
                      onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                      className={`pl-10 pr-10 h-10 rounded-xl ${inputClass}`}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="signup-confirm"
                    className={`${isDarkMode ? "text-slate-300" : "text-slate-700"} text-sm`}
                  >
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock
                      className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                    />
                    <Input
                      id="signup-confirm"
                      type="password"
                      placeholder="Confirm your password"
                      value={signUpData.confirmPassword}
                      onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                      className={`pl-10 h-10 rounded-xl ${inputClass}`}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full h-10 rounded-xl font-semibold transition-all duration-300 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="quick" className="space-y-4">
              <div className="text-center">
                <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                  Quick Authentication
                </h3>
                <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  Sign in with your preferred method
                </p>
              </div>
              
              <Auth
                supabaseClient={supabaseAuth}
                providers={['google']}
                redirectTo={`${window.location.origin}/auth/callback`}
                showLinks={false}
                view="sign_in"
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
    </Dialog>
  )
}
