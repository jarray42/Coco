"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Send, CheckCircle, Moon, Sun, User, Mail, MessageSquare } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { SiteHeader } from "../../components/site-header"
import { ModernDeFiBackground } from "../../components/modern-defi-background"
// import { AuthModal } from "../../components/auth-modal"
import { ElegantFooter } from "../../components/elegant-footer"
import { UserMenu } from "../../components/user-menu"
import { supabaseAuth } from "../../utils/supabase-auth"

export default function ContactPage() {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    subject: "",
    message: "",
  })

  // Check authentication status
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabaseAuth.auth.getUser()
      setUser(user)
    }
    checkUser()

    const {
      data: { subscription },
    } = supabaseAuth.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAuthSuccess = () => {
    // Refresh user state after successful auth
    setTimeout(async () => {
      const {
        data: { user },
      } = await supabaseAuth.auth.getUser()
      setUser(user)
    }, 1000)
  }

  const handleSignOut = () => {
    setUser(null)
  }

  if (isSubmitted) {
    return (
      <div className={`min-h-screen transition-all duration-1000 ${isDarkMode ? "dark" : ""}`}>
        <ModernDeFiBackground isDarkMode={isDarkMode} />

        <div className="relative z-10 max-w-[90rem] mx-auto p-3 sm:p-4 lg:p-6">
          {/* Header Layout - Same as Main Page */}
          <div className="flex flex-col lg:flex-row items-center justify-between mb-8 gap-6">
            {/* Left: Back Button + Logo */}
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button
                  variant="outline"
                  className={`h-10 w-10 p-0 rounded-xl transition-all duration-300 backdrop-blur-md shadow-lg border-0 ${
                    isDarkMode
                      ? "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70 hover:text-slate-100 hover:scale-105"
                      : "bg-white/80 text-slate-700 hover:bg-white/90 hover:text-slate-900 hover:scale-105"
                  }`}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <SiteHeader isMainPage={false} isDarkMode={isDarkMode} />
            </div>

            {/* Right: Controls - Same as Main Page */}
            <div className="flex items-center gap-3">
              {/* Dark/Light Mode Toggle */}
              <Button
                onClick={() => setIsDarkMode(!isDarkMode)}
                variant="outline"
                className={`h-10 px-4 rounded-xl transition-all duration-300 backdrop-blur-md shadow-lg border-0 ${
                  isDarkMode
                    ? "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70 hover:text-slate-100 hover:scale-105"
                    : "bg-white/80 text-slate-700 hover:bg-white/90 hover:text-slate-900 hover:scale-105"
                }`}
              >
                {isDarkMode ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                {isDarkMode ? "Light" : "Dark"}
              </Button>

              {/* Authentication */}
              {user ? (
                <UserMenu user={user} isDarkMode={isDarkMode} onSignOut={handleSignOut} />
              ) : (
                // <AuthModal isDarkMode={isDarkMode} onAuthSuccess={handleAuthSuccess} />
                <div className="text-center">
                  <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                    Please sign in to send a message.
                  </p>
                  <Button
                    onClick={() => handleAuthSuccess()} // Simulate auth success for now
                    className="w-full h-10 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-105"
                  >
                    Sign In
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center min-h-[60vh] px-6">
            <Card
              className={`w-full max-w-md ${
                isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-white/80 border-slate-200"
              } backdrop-blur-md shadow-2xl`}
            >
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                  Message Sent Successfully!
                </h2>
                <p className={`mb-6 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  Thank you for contacting us. We'll get back to you within 24 hours.
                </p>
                <Link href="/">
                  <Button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <ElegantFooter isDarkMode={isDarkMode} />
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen transition-all duration-1000 ${isDarkMode ? "dark" : ""}`}>
      <ModernDeFiBackground isDarkMode={isDarkMode} />

      <div className="relative z-10 max-w-[90rem] mx-auto p-3 sm:p-4 lg:p-6">
        {/* Header Layout - Same as Main Page */}
        <div className="flex flex-col lg:flex-row items-center justify-between mb-8 gap-6">
          {/* Left: Back Button + Logo */}
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button
                variant="outline"
                className={`h-10 w-10 p-0 rounded-xl transition-all duration-300 backdrop-blur-md shadow-lg border-0 ${
                  isDarkMode
                    ? "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70 hover:text-slate-100 hover:scale-105"
                    : "bg-white/80 text-slate-700 hover:bg-white/90 hover:text-slate-900 hover:scale-105"
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <SiteHeader isMainPage={false} isDarkMode={isDarkMode} />
          </div>

          {/* Right: Controls - Same as Main Page */}
          <div className="flex items-center gap-3">
            {/* Dark/Light Mode Toggle */}
            <Button
              onClick={() => setIsDarkMode(!isDarkMode)}
              variant="outline"
              className={`h-10 px-4 rounded-xl transition-all duration-300 backdrop-blur-md shadow-lg border-0 ${
                isDarkMode
                  ? "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70 hover:text-slate-100 hover:scale-105"
                  : "bg-white/80 text-slate-700 hover:bg-white/90 hover:text-slate-900 hover:scale-105"
              }`}
            >
              {isDarkMode ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
              {isDarkMode ? "Light" : "Dark"}
            </Button>

            {/* Authentication */}
            {user ? (
              <UserMenu user={user} isDarkMode={isDarkMode} onSignOut={handleSignOut} />
            ) : (
              // <AuthModal isDarkMode={isDarkMode} onAuthSuccess={handleAuthSuccess} />
              <div className="text-center">
                <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  Please sign in to send a message.
                </p>
                <Button
                  onClick={() => handleAuthSuccess()} // Simulate auth success for now
                  className="w-full h-10 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-105"
                >
                  Sign In
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Contact Form - Enhanced Design */}
        <div className="max-w-4xl mx-auto px-6 pb-20">
          <Card
            className={`${
              isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-white/80 border-slate-200"
            } backdrop-blur-md shadow-2xl`}
          >
          <CardHeader className="text-center pb-8">
            <div className="mx-auto mb-6 flex items-center justify-center">
              <Image 
                src="/contact.png"
                alt="Contact Us"
                width={200}
                height={200}
                style={{ width: '200px', height: '200px' }}
              />
            </div>
            <CardTitle className={`text-3xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              Contact Us
            </CardTitle>
            <CardDescription className={`text-lg ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
              We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name */}
              <div className="space-y-2">
                <label
                  htmlFor="fullName"
                  className={`text-sm font-semibold flex items-center gap-2 ${
                    isDarkMode ? "text-slate-200" : "text-slate-700"
                  }`}
                >
                  <User className="w-4 h-4" />
                  Full Name
                </label>
                <Input
                  id="fullName"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange("fullName", e.target.value)}
                  required
                  className={`h-12 rounded-xl transition-all duration-300 backdrop-blur-sm border-0 ${
                    isDarkMode
                      ? "bg-slate-700/50 text-slate-100 placeholder:text-slate-400 focus:bg-slate-700/70 focus:ring-2 focus:ring-amber-400/50"
                      : "bg-slate-50/80 text-slate-900 placeholder:text-slate-500 focus:bg-white/90 focus:ring-2 focus:ring-amber-400/50"
                  }`}
                />
              </div>

              {/* Email Address */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className={`text-sm font-semibold flex items-center gap-2 ${
                    isDarkMode ? "text-slate-200" : "text-slate-700"
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                  className={`h-12 rounded-xl transition-all duration-300 backdrop-blur-sm border-0 ${
                    isDarkMode
                      ? "bg-slate-700/50 text-slate-100 placeholder:text-slate-400 focus:bg-slate-700/70 focus:ring-2 focus:ring-amber-400/50"
                      : "bg-slate-50/80 text-slate-900 placeholder:text-slate-500 focus:bg-white/90 focus:ring-2 focus:ring-amber-400/50"
                  }`}
                />
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <label
                  htmlFor="subject"
                  className={`text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}
                >
                  Subject
                </label>
                <Select value={formData.subject} onValueChange={(value) => handleInputChange("subject", value)}>
                  <SelectTrigger
                    className={`h-12 rounded-xl transition-all duration-300 backdrop-blur-sm border-0 ${
                      isDarkMode
                        ? "bg-slate-700/50 text-slate-100 focus:bg-slate-700/70 focus:ring-2 focus:ring-amber-400/50"
                        : "bg-slate-50/80 text-slate-900 focus:bg-white/90 focus:ring-2 focus:ring-amber-400/50"
                    }`}
                  >
                    <SelectValue placeholder="Select Reason for Contact" />
                  </SelectTrigger>
                  <SelectContent
                    className={`backdrop-blur-md border-0 ${isDarkMode ? "bg-slate-800/90" : "bg-white/90"}`}
                  >
                    <SelectItem value="general">General inquiry</SelectItem>
                    <SelectItem value="advertising">Advertising</SelectItem>
                    <SelectItem value="pricing">Pricing</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                    <SelectItem value="others">Others</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <label
                  htmlFor="message"
                  className={`text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}
                >
                  Message
                </label>
                <Textarea
                  id="message"
                  placeholder="Tell us more about your inquiry..."
                  value={formData.message}
                  onChange={(e) => handleInputChange("message", e.target.value)}
                  required
                  rows={5}
                  className={`rounded-xl transition-all duration-300 backdrop-blur-sm border-0 resize-none ${
                    isDarkMode
                      ? "bg-slate-700/50 text-slate-100 placeholder:text-slate-400 focus:bg-slate-700/70 focus:ring-2 focus:ring-amber-400/50"
                      : "bg-slate-50/80 text-slate-900 placeholder:text-slate-500 focus:bg-white/90 focus:ring-2 focus:ring-amber-400/50"
                  }`}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-105 disabled:hover:scale-100"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending Message...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Contact Info Cards */}
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Mail,
              title: "Email Us",
              content: "cocoricoins@gmail.com",
              color: "from-blue-500 to-cyan-500",
            },
            {
              icon: MessageSquare,
              title: "Response Time",
              content: "Within 24 hours",
              color: "from-green-500 to-emerald-500",
            },
            {
              icon: User,
              title: "Support Team",
              content: "Always here to help",
              color: "from-purple-500 to-pink-500",
            },
          ].map((item, index) => (
            <Card
              key={index}
              className={`text-center backdrop-blur-md shadow-lg border-0 hover:scale-105 transition-all duration-300 ${
                isDarkMode ? "bg-slate-800/40" : "bg-white/60"
              }`}
            >
              <CardContent className="p-6">
                <div
                  className={`w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-r ${item.color} flex items-center justify-center`}
                >
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className={`font-semibold mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>{item.title}</h3>
                <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>{item.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <ElegantFooter isDarkMode={isDarkMode} />
    </div>
    </div>
  )
}
